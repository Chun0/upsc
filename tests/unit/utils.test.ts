import { describe, it, expect } from "vitest";
import { clamp, pct, seededShuffle, maskKey, normalizeAnswer, parseJsonLoose, fmtClock, todayKey, uid, round2 } from "../../lib/utils";

describe("utils", () => {
  it("clamp", () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-2, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });
  it("pct / round2", () => {
    expect(pct(0.755)).toBe("75.5%");
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });
  it("seededShuffle is deterministic and complete", () => {
    const a = [1, 2, 3, 4, 5, 6, 7, 8];
    const s1 = seededShuffle(a, 42);
    const s2 = seededShuffle(a, 42);
    expect(s1).toEqual(s2);
    expect([...s1].sort()).toEqual([...a].sort());
    expect(seededShuffle(a, 1)).not.toEqual(seededShuffle(a, 2));
  });
  it("maskKey hides middle", () => {
    expect(maskKey("sk-abcdef123456")).toBe("sk-a…3456");
    expect(maskKey("short")).toBe("••••");
  });
  it("normalizeAnswer strips punctuation/case/space", () => {
    expect(normalizeAnswer("  New Delhi! ")).toBe("new delhi");
    expect(normalizeAnswer("R.S. Sharma")).toBe("r s sharma");
  });
  it("parseJsonLoose handles fences and prose", () => {
    expect(parseJsonLoose('```json\n{"a": 1}\n```').a).toBe(1);
    expect(parseJsonLoose('Here you go: {"b": [1,2]} thanks!').b).toEqual([1, 2]);
    expect(() => parseJsonLoose("no json here")).toThrow();
    expect(() => parseJsonLoose("")).toThrow();
  });
  it("fmtClock", () => {
    expect(fmtClock(65)).toBe("01:05");
    expect(fmtClock(3600)).toBe("60:00");
  });
  it("todayKey shifts by days", () => {
    const d = new Date();
    const k = todayKey(0);
    expect(k).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(k + "T00:00:00").getDay()).toBe(d.getDay());
  });
  it("uid unique-ish", () => {
    const a = new Set(Array.from({ length: 200 }, () => uid(8)));
    expect(a.size).toBeGreaterThan(190);
  });
});
