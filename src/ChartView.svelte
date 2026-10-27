<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import {
    Chart,
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    TimeScale,
    Tooltip,
    Legend,
    Decimation,
  } from "chart.js";
  import "chartjs-adapter-date-fns";
  import { buildTimeline } from "./chart/timeline";

  Chart.register(
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    TimeScale,
    Tooltip,
    Legend,
    Decimation,
  );

  let { panel, view } = $props();
  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;

  function paint() {
    if (!canvas) return;
    const spec = buildTimeline(panel, view);
    const datasets = spec.data.datasets.map((d, i) => ({
      ...d,
      yAxisID: d.label?.includes("spread") ? "y1" : "y",
      borderColor: i === 0 ? "#100f0f" : i === 1 && d.label === "Scenario" ? "#af3029" : "#4385be",
      borderWidth: d.label === "Scenario" ? 2 : 1.5,
      pointRadius: 0,
      tension: 0,
    }));
    const data = { datasets };
    const published = spec.data.datasets[0]?.data ?? [];
    const first = published[0]?.x;
    const last = published.at(-1)?.x;
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      animation: false as const,
      plugins: {
        legend: { labels: { boxWidth: 12, font: { family: "IBM Plex Sans" } } },
        decimation: { enabled: true, algorithm: "lttb" as const },
      },
      scales: {
        x: {
          type: "time" as const,
          min: first,
          max: last,
          time: { unit: "year" as const },
        },
        y: { title: { display: true, text: "10-year yield, percent" } },
        y1: {
          position: "right" as const,
          grid: { drawOnChartArea: false },
          title: { display: true, text: "Spread, basis points" },
        },
      },
    };
    if (!chart) {
      chart = new Chart(canvas, { type: "line", data, options });
    } else {
      chart.data = data;
      chart.update();
    }
  }

  onMount(paint);
  $effect(() => {
    view.country;
    view.month;
    view.scenario;
    if (chart) paint();
  });
  onDestroy(() => chart?.destroy());
</script>

<canvas bind:this={canvas} aria-label="French and German 10-year yields and the OAT-Bund spread"></canvas>
