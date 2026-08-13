// ============ API key pool: round-robin + per-(key × model) rate-limit buckets ============
import type { ApiKeyRec } from "../types";

/** Conservative defaults (user-tunable). 2026 free-tier reality: flash ~15rpm,
 *  flash-lite ~30rpm; paid tiers differ. Defaults err on the safe side. */
export const DEFAULT_RPM: Record<string, number> = {
  "gemini-2.5-pro": 2,
  "gemini-2.5-flash": 5,
  "gemini-flash": 5,
  "gemini-flash-lite": 15,
  gemma: 30,
  default: 10,
};

export function modelFamily(model: string): string {
  const m = (model || "").toLowerCase();
  if (m.includes("pro")) return "gemini-2.5-pro";
  if (m.includes("flash-lite")) return "gemini-flash-lite";
  if (m.includes("flash")) return "gemini-flash";
  if (m.includes("gemma")) return "gemma";
  return "default";
}

export function defaultRpm(model: string, overrides?: Record<string, number>): number {
  if (overrides) {
    if (overrides[model] && overrides[model] > 0) return overrides[model];
  }
  const fam = modelFamily(model);
  const rpm = DEFAULT_RPM[fam] ?? DEFAULT_RPM.default;
  return rpm > 0 ? rpm : 10;
}

/** Sliding-window-ish token bucket: refills continuously at rpm rate. */
export class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  constructor(public rpm: number, now = Date.now()) {
    this.tokens = rpm;
    this.lastRefill = now;
  }
  private refill(now: number) {
    const elapsed = (now - this.lastRefill) / 60000;
    if (elapsed > 0) {
      this.tokens = Math.min(this.rpm, this.tokens + elapsed * this.rpm);
      this.lastRefill = now;
    }
  }
  tryTake(now = Date.now()): boolean {
    this.refill(now);
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }
  waitMs(now = Date.now()): number {
    this.refill(now);
    if (this.tokens >= 1) return 0;
    const perTokenMs = 60000 / Math.max(1, this.rpm);
    return Math.ceil(perTokenMs - (now - this.lastRefill));
  }
  tokensLeft(now = Date.now()): number {
    this.refill(now);
    return this.tokens;
  }
}

export interface AcquireResult {
  key?: ApiKeyRec;
  waitMs: number;
  keyCount: number;
}

export class KeyPool {
  keys: ApiKeyRec[] = [];
  rpmOverrides: Record<string, number> = {};
  private cursor = 0;
  private buckets = new Map<string, TokenBucket>(); // `${keyId}::${model}`
  private failoverKeyId: string | null = null;

  setKeys(keys: ApiKeyRec[]) {
    this.keys = [...keys];
    if (this.cursor >= this.keys.length) this.cursor = 0;
    if (this.failoverKeyId && !this.keys.some((k) => k.id === this.failoverKeyId)) {
      this.failoverKeyId = null;
    }
  }

  bucketFor(keyId: string, model: string, rpm: number): TokenBucket {
    const id = `${keyId}::${model}`;
    let b = this.buckets.get(id);
    if (!b) {
      b = new TokenBucket(rpm);
      this.buckets.set(id, b);
    }
    if (b.rpm !== rpm) b = new TokenBucket(rpm);
    this.buckets.set(id, b);
    return b;
  }

  rpmFor(model: string): number {
    return defaultRpm(model, this.rpmOverrides);
  }

  usableKeys(): ApiKeyRec[] {
    return this.keys.filter((k) => k.key && k.status !== "error");
  }

  /** Round-robin (or failover) acquisition that respects per-key-per-model buckets. */
  acquire(model: string, rotation: "roundrobin" | "failover" = "roundrobin", now = Date.now()): AcquireResult {
    const usable = this.usableKeys();
    if (!usable.length) return { waitMs: 0, keyCount: 0 };

    if (rotation === "failover") {
      if (this.failoverKeyId) {
        const primary = usable.find((k) => k.id === this.failoverKeyId);
        if (primary) {
          if (this.bucketFor(primary.id, model, this.rpmFor(model)).tryTake(now)) {
            return { key: primary, waitMs: 0, keyCount: usable.length };
          }
          // primary is throttled -> try others, but keep primary as failover target
          for (const k of usable) {
            if (k.id === primary.id) continue;
            if (this.bucketFor(k.id, model, this.rpmFor(model)).tryTake(now)) {
              return { key: k, waitMs: 0, keyCount: usable.length };
            }
          }
          return { waitMs: Math.max(1, this.bucketFor(primary.id, model, this.rpmFor(model)).waitMs(now)), keyCount: usable.length };
        }
      }
    }

    // round robin
    for (let i = 0; i < usable.length; i++) {
      const idx = (this.cursor + i) % usable.length;
      const key = usable[idx];
      if (this.bucketFor(key.id, model, this.rpmFor(model)).tryTake(now)) {
        this.cursor = (idx + 1) % usable.length;
        return { key, waitMs: 0, keyCount: usable.length };
      }
    }
    const waits = usable.map((k) => this.bucketFor(k.id, model, this.rpmFor(model)).waitMs(now));
    return { waitMs: Math.max(1, Math.min(...waits)), keyCount: usable.length };
  }

  reportFailure(keyId: string) {
    const k = this.keys.find((k) => k.id === keyId);
    if (k) k.status = "error";
  }

  markHealthy(keyId: string) {
    const k = this.keys.find((k) => k.id === keyId);
    if (k && k.status === "error") k.status = "ok";
  }

  setFailoverTarget(keyId: string | null) {
    this.failoverKeyId = keyId;
  }

  status(model: string) {
    const now = Date.now();
    return this.usableKeys().map((k) => ({
      id: k.id,
      label: k.label,
      masked: k.masked,
      status: k.status,
      lastError: k.lastError,
      tokensLeft: Math.floor(this.bucketFor(k.id, model, this.rpmFor(model)).tokensLeft(now)),
      rpm: this.rpmFor(model),
    }));
  }
}
