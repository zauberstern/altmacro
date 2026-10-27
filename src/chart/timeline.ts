type Point = { d: string; v: number };
type Panel = {
  countries: Record<string, { lines: Record<string, Point[]> }>;
};

export type TimelineInput = {
  country: string;
  month: string;
  scenario: string | null;
};

export function buildTimeline(panel: Panel, view: TimelineInput) {
  const lines = panel.countries[view.country]?.lines ?? {};
  const published = lines.ltgdr ?? [];
  const publishedData = published.map((p) => ({ x: p.d, y: p.v }));
  const datasets: { label: string; data: { x: string; y: number }[] }[] = [
    { label: "Published", data: publishedData },
  ];
  if (view.scenario === "rate-10y") {
    const at = [...published].reverse().find((p) => p.d <= view.month);
    if (at) {
      datasets.push({
        label: "Scenario",
        data: published
          .filter((p) => p.d >= view.month)
          .map((p) => ({ x: p.d, y: at.v })),
      });
    }
  }
  const spread = (lines.oat_bund_bps ?? []).map((p) => ({ x: p.d, y: p.v }));
  if (spread.length) {
    datasets.push({ label: "OAT-Bund spread, bp", data: spread });
  }
  return { type: "line" as const, data: { datasets } };
}
