import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { modifiedDuration, scenarioReturn } from "../src/engine/duration";
import { applyAction, initialState } from "../src/engine/state";
import { buildTimeline } from "../src/chart/timeline";
import { cardsFor } from "../src/engine/cards";
import { countryName, sortCountries } from "../src/engine/names";

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
  const earlier = panel.countries.FRA.lines.ltgdr[0].d;

  it("rejects a card on the last month", () => {
    const next = applyAction(base, { type: "apply", id: "hold-10y" }, panel);
    expect(next).toBe(base);
    const face = cardsFor("FRA", base.month, panel).find((card) => card.id === "hold-10y");
    expect(face?.play).toBe("Pick an earlier month. Today is already the last point.");
  });

  it("rejects the SPX put for France", () => {
    const next = applyAction({ ...base, month: earlier }, { type: "apply", id: "spx-put" }, panel);
    expect(next.scenario).toBeNull();
  });

  it("does not apply the same card twice", () => {
    const once = applyAction({ ...base, month: earlier }, { type: "apply", id: "hold-10y" }, panel);
    expect(once.scenario).toBe("hold-10y");
    const twice = applyAction(once, { type: "apply", id: "hold-10y" }, panel);
    expect(twice).toBe(once);
  });

  it("undo restores the previous view", () => {
    const next = applyAction({ ...base, month: earlier }, { type: "apply", id: "hold-10y" }, panel);
    const back = applyAction(next, { type: "undo" }, panel);
    expect(back.scenario).toBeNull();
    expect(back.country).toBe("FRA");
  });
});

describe("timeline", () => {
  it("changes the last point and leaves earlier points on the published line", () => {
    const yields = panel.countries.FRA.lines.ltgdr;
    const earlier = yields.find((row) => row.v > 6);
    expect(earlier).toBeTruthy();
    const config = buildTimeline(panel, {
      country: "FRA",
      month: earlier.d,
      scenario: "hold-10y",
    });
    const published = config.data.datasets[0].data as { x: string; y: number }[];
    const fork = config.data.datasets.find((d) => d.label === "Scenario");
    const forkData = (fork?.data ?? []) as { x: string; y: number }[];
    expect(published.map((point) => point.y)).toEqual(yields.map((row) => row.v));
    expect(config.data.datasets.some((d) => d.label?.includes("spread"))).toBe(false);
    expect(published.at(-1)?.y).toBeCloseTo(4.4325, 3);
    expect(forkData.filter((p) => p.x < earlier.d)).toEqual([]);
    expect(forkData.at(-1)?.y).toBeCloseTo(earlier.v, 3);
    expect(forkData.at(-1)?.y).not.toBeCloseTo(published.at(-1)?.y ?? 0, 2);
  });
});

describe("names and cards", () => {
  it("names ISO codes and keeps France first", () => {
    expect(countryName("BGD")).toBe("Bangladesh");
    const ordered = sortCountries([
      { id: "BGD", name: "Bangladesh" },
      { id: "FRA", name: "France" },
      { id: "DEU", name: "Germany" },
    ]);
    expect(ordered[0].id).toBe("FRA");
  });

  it("keeps named countries ahead of bare codes", () => {
    const ordered = sortCountries(
      Object.values(panel.countries).map((row: { iso: string; name: string }) => ({
        id: row.iso,
        name: countryName(row.iso, row.name),
      })),
    );
    expect(ordered[0].id).toBe("FRA");
    expect(ordered.slice(0, 5).every((row) => row.name !== row.id)).toBe(true);
  });

  it("lists chapter 1 and 2, and keeps the SPX card off France", () => {
    const ids = cardsFor("FRA", "2012-06-29", panel).map((card) => card.id);
    for (const id of [
      "hold-10y",
      "spot",
      "outright",
      "fx-swap",
      "vanilla-call",
      "vanilla-put",
      "digital",
      "barrier",
      "tarf",
      "accumulator",
      "dual-currency",
      "participating",
    ]) {
      expect(ids).toContain(id);
    }
    expect(ids).not.toContain("spx-put");
    expect(cardsFor("USA", "2012-06-29", panel).some((card) => card.id === "spx-put")).toBe(true);
    for (const card of cardsFor("FRA", "2012-06-29", panel)) {
      expect(`${card.name}${card.effect}${card.cost}${card.status}${card.play}`).not.toMatch(/[—–]/);
    }
  });

  it("locks FX options on one missing series", () => {
    const face = cardsFor("FRA", "2012-01-31", panel).find((card) => card.id === "vanilla-call");
    expect(face?.playable).toBe(false);
    expect(face?.status).toBe("Missing: FX volatility");
    expect([face?.name, face?.effect, face?.cost, face?.status, face?.play].filter(Boolean)).toHaveLength(5);
  });
});
