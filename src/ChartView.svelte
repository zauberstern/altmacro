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
    const datasets = spec.data.datasets.map((d) => ({
      ...d,
      borderColor: d.label === "Scenario" ? "#af3029" : "#6f6e69",
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
      },
    };
    if (!chart) {
      chart = new Chart(canvas, { type: "line", data, options });
    } else {
      chart.data = data;
      if (chart.options.scales?.x) {
        chart.options.scales.x.min = first;
        chart.options.scales.x.max = last;
      }
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

<canvas class="absolute inset-0 h-full w-full" bind:this={canvas} aria-label="10-year yield, published and scenario"></canvas>
