import { describe, it, expect } from "vitest";
import { donutChart, barChart, radarChart, sparkline, progressRing, miniStat } from "../../lib/report/charts";

describe("chart builders", () => {
  it("donut includes segments and center label", () => {
    const s = donutChart([{ label: "a", value: 3, color: "#111" }, { label: "b", value: 1, color: "#222" }], 140, 20, "75%", "sub");
    expect(s).toContain("<svg");
    expect(s.split("<circle").length - 1).toBeGreaterThanOrEqual(2);
    expect(s).toContain("75%");
  });
  it("donut escapes html in labels", () => {
    const s = donutChart([{ label: "<script>", value: 1, color: "#111" }], 100, 10, "<b>x</b>");
    expect(s).not.toContain("<script>");
    expect(s).not.toContain("<b>");
  });
  it("barChart handles negatives and truncates long labels", () => {
    const s = barChart([{ label: "very long section name that needs truncation", value: -2, max: 10, display: "-2" }], 400, 20, 10);
    expect(s).toContain("<svg");
    expect(s).toContain("…");
  });
  it("radarChart draws polygons for N axes", () => {
    const s = radarChart([{ label: "A", value: 0.5 }, { label: "B", value: 0.8 }, { label: "C", value: 0.2 }], 260);
    expect((s.match(/<polygon/g) || []).length).toBeGreaterThanOrEqual(4);
    expect(s).toContain("A");
  });
  it("sparkline and progressRing render", () => {
    expect(sparkline([1, 2, 3], 100, 30)).toContain("polyline");
    expect(sparkline([], 100, 30)).toBe("");
    expect(progressRing(0.5, 100)).toContain("50%");
    expect(progressRing(1.4, 100)).toContain("100%");
  });
  it("miniStat builds stat chips", () => {
    const s = miniStat([{ label: "Score", value: "10/20" }]);
    expect(s).toContain("Score");
    expect(s).toContain("10/20");
  });
});
