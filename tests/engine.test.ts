import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { modifiedDuration, scenarioReturn } from "../src/engine/duration";
import { applyAction, initialState } from "../src/engine/state";
import { buildTimeline } from "../src/chart/timeline";

const panel = JSON.parse(readFileSync("public/data/panel.json", "utf8"));

describe("panel default", () => {
  it("opens on France at the last yield on or before the pull date", () => {
    expect(panel.default.country).toBe("FRA");
    expect(panel.default.month).toBe("2026-09-30");
    const last = panel.countries.FRA.lines.ltgdr.at(-1);
    expect(last).toEqual({ d: "2026-09-30", v: 4.4325 });
    expect(panel.countries.FRA.lines.oat_bund_bps.at(-1).v).toBeCloseTo(94.55, 1);
    expect(panel.countries.FRA.lines.ltgdr.some((row) => row.d > "2026-10-27")).toBe(false);
  });
});

describe("duration", () => {
  it("matches a 10-year par bond at 4 percent", () => {
    expect(modifiedDuration(0.04, 10)).toBeCloseTo(8.11, 2);
  });

  it("earns carry minus duration times the yield change", () => {
    const got = scenarioReturn(0.04, 10, 0.01, 1 / 12);
    const dur = modifiedDuration(0.04, 10);
    expect(got).toBeCloseTo(0.04 / 12 - dur * 0.01, 6);
  });
});

describe("state", () => {
  const base = initialState(panel);

  it("leaves the object unchanged when the scenario is rejected", () => {
    const next = applyAction(base, { type: "apply", id: "spx-put" });
    expect(next).toBe(base);
    expect(next.scenario).toBeNull();
  });

  it("does not apply the same scenario twice", () => {
    const once = applyAction(base, { type: "apply", id: "rate-10y" }, panel);
    expect(once.scenario).toBe("rate-10y");
    const twice = applyAction(once, { type: "apply", id: "rate-10y" }, panel);
    expect(twice).toBe(once);
  });

  it("undo restores the previous view", () => {
    const next = applyAction(base, { type: "apply", id: "rate-10y" }, panel);
    const back = applyAction(next, { type: "undo" }, panel);
    expect(back.scenario).toBeNull();
    expect(back.country).toBe("FRA");
  });
});

describe("timeline", () => {
  it("keeps the published yield and adds a scenario only after the decision", () => {
    const config = buildTimeline(panel, {
      country: "FRA",
      month: "2026-09-30",
      scenario: "rate-10y",
    });
    const published = config.data.datasets[0].data as { x: string; y: number }[];
    const fork = config.data.datasets.find((d) => d.label === "Scenario");
    const forkData = (fork?.data ?? []) as { x: string; y: number }[];
    expect(published.at(-1)?.y).toBeCloseTo(4.4325, 3);
    expect(forkData.filter((p) => p.x < "2026-09-30")).toEqual([]);
    expect(forkData[0]?.x >= "2026-09-30").toBe(true);
  });
});
