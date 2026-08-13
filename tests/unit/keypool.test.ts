import { describe, it, expect } from "vitest";
import { KeyPool, TokenBucket, defaultRpm, modelFamily } from "../../lib/ai/keypool";
import type { ApiKeyRec } from "../../lib/types";

function key(id: string, status: "ok" | "error" = "ok"): ApiKeyRec {
  return { id, label: id, key: `sk-${id}-1234567890`, masked: "sk-" + id + "…", status, addedAt: 0 };
}

describe("modelFamily / defaultRpm", () => {
  it("classifies model families", () => {
    expect(modelFamily("gemini-flash-latest")).toBe("gemini-flash");
    expect(modelFamily("gemini-flash-lite-latest")).toBe("gemini-flash-lite");
    expect(modelFamily("gemma-4-31b-it")).toBe("gemma");
    expect(modelFamily("gemini-2.5-pro")).toBe("gemini-2.5-pro");
    expect(modelFamily("something-new")).toBe("default");
  });
  it("applies overrides", () => {
    expect(defaultRpm("gemini-flash-latest")).toBe(5);
    expect(defaultRpm("gemini-flash-lite-latest")).toBe(15);
    expect(defaultRpm("gemma-4-31b-it")).toBe(30);
    expect(defaultRpm("gemini-flash-latest", { "gemini-flash-latest": 60 })).toBe(60);
  });
});

describe("TokenBucket", () => {
  it("allows rpm takes then blocks", () => {
    const t0 = Date.now();
    const b = new TokenBucket(2, t0);
    expect(b.tryTake(t0)).toBe(true);
    expect(b.tryTake(t0)).toBe(true);
    expect(b.tryTake(t0)).toBe(false);
  });
  it("refills over time", () => {
    const t0 = Date.now();
    const b = new TokenBucket(1, t0);
    expect(b.tryTake(t0)).toBe(true);
    expect(b.tryTake(t0 + 60000)).toBe(true); // 1 min later -> 1 token
    expect(b.tryTake(t0 + 60001)).toBe(false);
  });
  it("computes wait time", () => {
    const t0 = Date.now();
    const b = new TokenBucket(1, t0);
    b.tryTake(t0);
    const w = b.waitMs(t0);
    expect(w).toBeGreaterThan(0);
    expect(w).toBeLessThanOrEqual(60000);
  });
});

describe("KeyPool", () => {
  it("round-robins across keys", () => {
    const p = new KeyPool();
    p.setKeys([key("a"), key("b"), key("c")]);
    const seq = [p.acquire("m")!.key!.id, p.acquire("m")!.key!.id, p.acquire("m")!.key!.id, p.acquire("m")!.key!.id];
    expect(seq).toEqual(["a", "b", "c", "a"]);
  });
  it("skips errored keys", () => {
    const p = new KeyPool();
    p.setKeys([key("a", "error"), key("b")]);
    const seq = [p.acquire("m")!.key!.id, p.acquire("m")!.key!.id];
    expect(seq).toEqual(["b", "b"]);
  });
  it("respects per-key buckets with one key (waits when exhausted)", () => {
    const p = new KeyPool();
    p.rpmOverrides = { "m": 2 };
    p.setKeys([key("a")]);
    const t0 = Date.now();
    expect(p.acquire("m", "roundrobin", t0).key!.id).toBe("a");
    expect(p.acquire("m", "roundrobin", t0).key!.id).toBe("a");
    const third = p.acquire("m", "roundrobin", t0);
    expect(third.key).toBeUndefined();
    expect(third.waitMs).toBeGreaterThan(0);
  });
  it("failover sticks to primary key until error", () => {
    const p = new KeyPool();
    p.setKeys([key("a"), key("b")]);
    p.setFailoverTarget("a");
    expect(p.acquire("m", "failover")!.key!.id).toBe("a");
    expect(p.acquire("m", "failover")!.key!.id).toBe("a");
    p.reportFailure("a");
    expect(p.acquire("m", "failover")!.key!.id).toBe("b");
  });
  it("reports no keys gracefully", () => {
    const p = new KeyPool();
    p.setKeys([]);
    const r = p.acquire("m");
    expect(r.key).toBeUndefined();
    expect(r.keyCount).toBe(0);
  });
});
