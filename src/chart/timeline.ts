type Point = { d: string; v: number };
type Panel = {
  countries: Record<string, { lines: Record<string, Point[]> }>;
};

export type TimelineInput = {
  country: string;
  month: string;
  scenario: string | null;
};

/** Yield only. The spread stays in the rail so two units never share one chart. */
export function buildTimeline(panel: Panel, view: TimelineInput) {
  const published = panel.countries[view.country]?.lines.ltgdr ?? [];
  const publishedData = published.map((p) => ({ x: p.d, y: p.v }));
  const datasets: { label: string; data: { x: string; y: number }[] }[] = [
    { label: "Published", data: publishedData },
  ];
  if (view.scenario === "hold-10y") {
    const at = [...published].reverse().find((p) => p.d <= view.month);
    const later = published.filter((p) => p.d >= view.month);
    if (at && later.length > 1) {
      datasets.push({
        label: "Scenario",
        data: later.map((p) => ({ x: p.d, y: at.v })),
      });
    }
  }
  return { type: "line" as const, data: { datasets } };
}
