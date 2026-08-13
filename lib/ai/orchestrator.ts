// ============ Agentic orchestrator: master/slave lanes, queue+wait, key pool, retries ============
import { GoogleGenAI } from "@google/genai";
import { KeyPool } from "./keypool";
import { getDb } from "../store/db";
import { parseJsonLoose, sleep } from "../utils";
import type { ApiKeyRec } from "../types";

export type Lane = "master" | "slave";

export class NoApiKeyError extends Error {
  constructor(msg = "No Gemini API key configured. Add one in Settings → Models & Keys.") {
    super(msg);
    this.name = "NoApiKeyError";
  }
}

export interface GenOptions {
  lane?: Lane;
  model?: string; // override lane model
  prompt: string;
  schema?: unknown;
  json?: boolean;
  search?: boolean; // enable googleSearch grounding
  temperature?: number | null;
  stream?: boolean;
  onChunk?: (text: string) => void;
  timeoutMs?: number;
  maxOutputTokens?: number;
}

/**
 * Fallback chains per lane. Some model aliases (e.g. gemini-flash-latest on
 * newer accounts) hang or 404; the orchestrator fails over automatically.
 */
export const MASTER_FALLBACKS = ["gemini-3-flash-preview", "gemini-flash-lite-latest", "gemini-3.5-flash"];
export const SLAVE_FALLBACKS = ["gemini-3.1-flash-lite", "gemma-4-31b-it"];

/** Model health: deadUntil (0 = structural failure, else cooldown expiry). */
const deadModels = new Map<string, number>();
const warmModels = new Set<string>();

export function isModelDead(model: string, now = Date.now()): boolean {
  const t = deadModels.get(model);
  return t !== undefined && (t === 0 || t > now);
}
export function markModelDead(model: string, cooldownMs = 0) {
  deadModels.set(model, cooldownMs ? Date.now() + cooldownMs : 0);
}

export interface TaskLogEntry {
  ts: number;
  lane: Lane;
  model: string;
  task: string;
  keyLabel: string;
  ms: number;
  ok: boolean;
  error?: string;
}

/** Serial FIFO queue per lane — the "queue and wait" spine of the system. */
export class LaneQueue {
  private tail: Promise<unknown> = Promise.resolve();
  run<T>(fn: () => Promise<T>): Promise<T> {
    const p = this.tail.then(fn, fn);
    this.tail = p.catch(() => undefined);
    return p;
  }
}

export class Orchestrator {
  private lanes: Record<Lane, LaneQueue> = { master: new LaneQueue(), slave: new LaneQueue() };
  private pool = new KeyPool();
  taskLog: TaskLogEntry[] = [];
  inFlight: Record<Lane, number> = { master: 0, slave: 0 };

  masterModel(): string {
    return getDb().settings?.masterModel || "gemini-flash-latest";
  }
  slaveModel(): string {
    return getDb().settings?.slaveModel || "gemini-flash-lite-latest";
  }

  private syncPool() {
    const db = getDb();
    const keys: ApiKeyRec[] = [...db.keys];
    // env fallback key
    if (process.env.GEMINI_API_KEY && !keys.some((k) => k.key === process.env.GEMINI_API_KEY)) {
      keys.push({
        id: "env",
        label: "ENV key",
        key: process.env.GEMINI_API_KEY,
        masked: "env-key",
        status: "ok",
        addedAt: 0,
      });
    }
    this.pool.setKeys(keys);
    this.pool.rpmOverrides = db.settings?.rateLimits || {};
  }

  hasAnyKey(): boolean {
    this.syncPool();
    return this.pool.usableKeys().length > 0;
  }

  /** Main entry: generate text or JSON through a lane queue with rate-limit-aware key acquisition. */
  async generate(opts: GenOptions): Promise<string> {
    const lane = opts.lane || "slave";
    return this.lanes[lane].run(async () => {
      this.inFlight[lane]++;
      try {
        const model = opts.model || (lane === "master" ? this.masterModel() : this.slaveModel());
        // fast warm-up probe on first use of a model this process (saves a long hang later)
        if (lane === "master" && !warmModels.has(model) && !isModelDead(model)) {
          await this.warmUp(model);
        }
        const fallbacks = (lane === "master" ? MASTER_FALLBACKS : SLAVE_FALLBACKS).filter(
          (m) => m !== model && !isModelDead(m)
        );
        return await this.callWithChain([model, ...fallbacks], opts, 0);
      } finally {
        this.inFlight[lane]--;
      }
    });
  }

  /** 25s max ping to detect hanging/unavailable models before committing a real task. */
  private async warmUp(model: string) {
    this.syncPool(); // ensure keys are loaded before probing
    if (!this.pool.usableKeys().length) return;
    try {
      await this.generateWarmCall(model);
      warmModels.add(model);
    } catch (err) {
      // transient rate/quota errors must NOT blacklist the model — only skip warming
      const msg = String((err as Error)?.message || "");
      if (/429|quota|billing|rate.?limit/i.test(msg)) return;
      markModelDead(model, 0);
    }
  }

  private async generateWarmCall(model: string): Promise<void> {
    this.syncPool();
    const acq = this.pool.acquire(model);
    if (!acq.key) return;
    const ai = new GoogleGenAI({ apiKey: acq.key.key });
    const contents = [{ role: "user", parts: [{ text: "Reply with exactly: ok" }] }] as never;
    await this.withTimeout(ai.models.generateContent({ model, contents }), 25000);
  }

  async generateJson<T = any>(opts: Omit<GenOptions, "json"> & { schema: unknown }): Promise<T> {
    const text = await this.generate({ ...opts, json: true });
    return parseJsonLoose(text) as T;
  }

  /** Try each model in the chain; on timeout/404/5xx move to the next, on 429 back off and retry the same one. */
  private async callWithChain(chain: string[], opts: GenOptions, attempt: number): Promise<string> {
    const model = chain[0];
    if (!model) throw new Error("No usable model available (all configured models are dead or rate-limited).");
    try {
      return await this.callWithRetry(model, opts, attempt);
    } catch (err) {
      const e = err as Error;
      const msg = String(e?.message || "");
      const isTimeout = /timed out/i.test(msg);
      const isUnavailable = /404|no longer available|not found for model|model .* is not (found|available)/i.test(msg);
      const isServer = /500|502|503|internal/i.test(msg);
      const isSchema = /schema|response.?mime/i.test(msg);
      const isQuota = /QUOTA_EXCEEDED|quota|billing/i.test(msg);
      if ((isTimeout || isUnavailable || isServer || isQuota) && !isSchema && chain.length > 1) {
        markModelDead(model, isTimeout ? 0 : 5 * 60000);
        this.log(model, opts.lane || "slave", "fallback", 0, false, `failed over: ${msg.slice(0, 80)}`);
        return this.callWithChain(chain.slice(1), opts, 0);
      }
      throw err;
    }
  }

  private async callWithRetry(model: string, opts: GenOptions, attempt: number): Promise<string> {
    this.syncPool();
    const rotation = getDb().settings?.rotation || "roundrobin";
    const acq = this.pool.acquire(model, rotation);

    if (!acq.key) {
      if (!acq.keyCount) throw new NoApiKeyError();
      // all keys throttled — wait for the soonest token slot, then retry (bounded)
      const wait = Math.min(acq.waitMs || 1000, 15000);
      await sleep(wait);
      if (attempt < 6) return this.callWithRetry(model, opts, attempt + 1);
      throw new NoApiKeyError("All API keys are rate-limited. Try again in a minute.");
    }

    const key = acq.key;
    const ai = new GoogleGenAI({ apiKey: key.key });
    const settings = getDb().settings;
    const thinkingLevel = settings?.thinkingLevel ?? "HIGH";
    // Search grounding is opt-in per task (only live-news tasks need it) —
    // it can hang smaller models when combined with thinking + schema.
    const search = opts.search === true && (settings?.enableSearch ?? true);
    const config: Record<string, unknown> = {
      thinkingConfig: { thinkingLevel },
    };
    if (search) config.tools = [{ googleSearch: {} }];
    if (opts.json && opts.schema) {
      config.responseMimeType = "application/json";
      config.responseSchema = opts.schema;
    }
    const temperature = opts.temperature != null && opts.temperature !== undefined
      ? opts.temperature
      : (settings?.temperature != null && settings?.temperature !== undefined ? settings.temperature : null);
    if (temperature != null && temperature !== undefined) {
      config.temperature = temperature;
    }
    if (opts.maxOutputTokens) config.maxOutputTokens = opts.maxOutputTokens;

    const start = Date.now();
    try {
      const contents = [{ role: "user", parts: [{ text: opts.prompt }] }] as never;
      const text = await this.doCall(ai, model, config as never, contents, opts);
      this.log(model, opts.lane || "slave", key.label, Date.now() - start, true);
      this.pool.markHealthy(key.id);
      return text;
    } catch (err: unknown) {
      const e = err as { status?: number; code?: number; message?: string };
      const msg = String(e?.message || e);
      const status = e?.status ?? e?.code;
      if (status === 429 || /429|quota|rate.?limit/i.test(msg)) {
        if (/quota|billing|exhausted/i.test(msg)) {
          // hard quota for THIS model — cooldown it and let the chain fall over
          markModelDead(model, 10 * 60000);
          this.log(model, opts.lane || "slave", key.label, Date.now() - start, false, "429 quota exceeded — cooling model down");
          throw new Error("QUOTA_EXCEEDED: " + msg.slice(0, 120));
        }
        this.log(model, opts.lane || "slave", key.label, Date.now() - start, false, "429 rate limited (rotating/backing off)");
        const backoff = Math.min(30000, 1500 * Math.pow(2, attempt));
        await sleep(backoff);
        if (attempt < 4) return this.callWithRetry(model, opts, attempt + 1);
      }
      if (status === 401 || status === 403 || /invalid.*(api key|key)|permission denied/i.test(msg)) {
        this.pool.reportFailure(key.id);
        this.log(model, opts.lane || "slave", key.label, Date.now() - start, false, "Key rejected (401/403) — marked error");
        throw new Error(`API key "${key.label}" was rejected by Google (${msg.slice(0, 120)}). Check Settings.`);
      }
      if (/schema|response.?mime|JSON/i.test(msg) && opts.json) {
        // schema rejection: retry once without the schema but still ask for JSON
        if (attempt < 2) {
          this.log(model, opts.lane || "slave", key.label, Date.now() - start, false, "schema rejected — retrying without schema");
          return this.callWithRetry(model, { ...opts, schema: undefined }, attempt + 1);
        }
      }
      this.log(model, opts.lane || "slave", key.label, Date.now() - start, false, msg.slice(0, 160));
      throw err instanceof Error ? err : new Error(msg);
    }
  }

  private async doCall(ai: GoogleGenAI, model: string, config: never, contents: never, opts: GenOptions): Promise<string> {
    const timeoutMs = opts.timeoutMs ?? 90000;
    if (opts.stream && opts.onChunk) {
      const res = await this.withTimeout(ai.models.generateContentStream({ model, config, contents }), timeoutMs);
      let out = "";
      for await (const chunk of res as AsyncIterable<{ text?: string }>) {
        const t = chunk.text || "";
        if (t) {
          out += t;
          opts.onChunk(t);
        }
      }
      return out;
    }
    const res = await this.withTimeout(ai.models.generateContent({ model, config, contents }), timeoutMs);
    return (res as { text?: string }).text || "";
  }

  private withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(`Model call timed out after ${Math.round(ms / 1000)}s`)), ms);
      p.then(
        (v) => {
          clearTimeout(t);
          resolve(v);
        },
        (e) => {
          clearTimeout(t);
          reject(e);
        }
      );
    });
  }

  private log(model: string, lane: Lane, keyLabel: string, ms: number, ok: boolean, error?: string) {
    this.taskLog.push({ ts: Date.now(), lane, model, task: model, keyLabel, ms, ok, error });
    if (this.taskLog.length > 60) this.taskLog = this.taskLog.slice(-60);
  }

  /** Sequential multi-step pipeline — a step may await another lane's result ("queue and wait"). */
  async pipeline<T extends readonly unknown[]>(steps: { [K in keyof T]: (orch: Orchestrator) => Promise<T[K]> }): Promise<T> {
    const out: unknown[] = [];
    for (const step of steps) out.push(await step(this));
    return out as unknown as T;
  }

  status() {
    return {
      inFlight: this.inFlight,
      masterModel: this.masterModel(),
      slaveModel: this.slaveModel(),
      keyHealth: this.pool.status(this.masterModel()),
      recentTasks: this.taskLog.slice(-15),
      hasKeys: this.hasAnyKey(),
    };
  }

  async listModels(): Promise<{ name: string; displayName: string; description: string }[]> {
    this.syncPool();
    const keys = this.pool.usableKeys();
    if (!keys.length) throw new NoApiKeyError();
    let lastErr: unknown = null;
    for (const k of keys) {
      try {
        const ai = new GoogleGenAI({ apiKey: k.key });
        const res = (await this.withTimeout(ai.models.list() as Promise<unknown>, 30000)) as
          | AsyncIterable<{ name: string; displayName?: string; description?: string; supportedActions?: string[] }>
          | { models?: { name: string; displayName?: string; description?: string; supportedActions?: string[] }[] };
        const items: { name: string; displayName?: string; description?: string; supportedActions?: string[] }[] = [];
        if (Array.isArray(res)) {
          items.push(...res);
        } else if (res && typeof res === "object" && "models" in res && Array.isArray((res as { models: unknown[] }).models)) {
          items.push(...((res as { models: never[] }).models as never[]));
        } else {
          for await (const m of res as AsyncIterable<{ name: string; displayName?: string; description?: string; supportedActions?: string[] }>) {
            items.push(m);
          }
        }
        const out: { name: string; displayName: string; description: string }[] = [];
        for (const m of items) {
          const actions = m.supportedActions || [];
          if (!actions.some((a) => /generateContent/i.test(a))) continue;
          out.push({
            name: m.name?.replace(/^models\//, ""),
            displayName: m.displayName || m.name,
            description: m.description || "",
          });
        }
        this.pool.markHealthy(k.id);
        return out;
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error("models.list failed");
  }
}

export const orchestrator = new Orchestrator();
