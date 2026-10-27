<script lang="ts">
  import { onMount } from "svelte";
  import ChartView from "./ChartView.svelte";
  import { allowedScenarios, applyAction, initialState, type View } from "./engine/state";

  type Point = { d: string; v: number; annual?: boolean };
  type Country = { iso: string; name: string; euro?: boolean; lines: Record<string, Point[]> };
  type Panel = {
    asof: string;
    default: { country: string; month: string };
    notes: string[];
    countries: Record<string, Country>;
  };

  let panel = $state<Panel | null>(null);
  let view = $state<View | null>(null);
  let loadError = $state("");

  const base = import.meta.env.BASE_URL;

  let shareApplied = false;

  $effect(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get("s");
    if (shareApplied || !raw || !panel || !view) return;
    shareApplied = true;
    try {
      const saved = JSON.parse(decodeURIComponent(raw)) as Partial<View>;
      if (saved.country && panel.countries[saved.country]) {
        view = {
          country: saved.country,
          month: saved.month || view.month,
          scenario: saved.scenario ?? null,
          past: [],
        };
      }
    } catch {
      loadError = "The share link could not be read.";
    }
  });

  async function load() {
    const res = await fetch(`${base}data/panel.json`);
    if (!res.ok) {
      loadError = "The history file did not load.";
      return;
    }
    panel = (await res.json()) as Panel;
    view = initialState(panel);
  }

  function act(action: Parameters<typeof applyAction>[1]) {
    if (!panel || !view) return;
    view = applyAction(view, action, panel);
  }

  function share() {
    if (!view) return;
    const payload = encodeURIComponent(
      JSON.stringify({ country: view.country, month: view.month, scenario: view.scenario }),
    );
    const url = `${location.origin}${location.pathname}?s=${payload}`;
    localStorage.setItem("altmacro-scenario", payload);
    navigator.clipboard?.writeText(url).catch(() => undefined);
  }

  function at(lines: Point[] | undefined, month: string) {
    if (!lines?.length) return null;
    const hit = [...lines].reverse().find((row) => row.d <= month);
    return hit ?? null;
  }

  const country = $derived(panel && view ? panel.countries[view.country] : null);
  const names = $derived(
    panel
      ? Object.values(panel.countries)
          .map((c) => ({ id: c.iso, name: c.name || c.iso }))
          .sort((a, b) => a.name.localeCompare(b.name))
      : [],
  );
  const scenarios = $derived(panel && view ? allowedScenarios(view, panel) : []);
  const yieldNow = $derived(country && view ? at(country.lines.ltgdr, view.month) : null);
  const spreadNow = $derived(country && view ? at(country.lines.oat_bund_bps, view.month) : null);
  const unemp = $derived(country && view ? at(country.lines.unemp1, view.month) : null);

  onMount(() => {
    load();
  });

  $effect(() => {
    if (!view) return;
    (window as Window & { __altmacro?: unknown }).__altmacro = {
      country: view.country,
      month: view.month,
      scenario: view.scenario,
    };
  });
</script>

{#if !panel || !view}
  <main class="grid h-dvh place-items-center">
    <p>{loadError || "Loading the measured history."}</p>
  </main>
{:else}
  <main class="grid h-dvh grid-rows-[auto_1fr_auto] gap-4 p-4 lg:grid-cols-[16rem_1fr_16rem] lg:grid-rows-[1fr_auto]">
    <section class="flex flex-col gap-3 lg:col-start-1 lg:row-start-1">
      <p class="font-serif text-2xl">Altmacro</p>
      <label class="text-sm">
        Country
        <select
          class="mt-1 w-full border border-line bg-paper p-2"
          value={view.country}
          onchange={(e) => act({ type: "country", id: e.currentTarget.value })}
        >
          {#each names as row (row.id)}
            <option value={row.id}>{row.name}</option>
          {/each}
        </select>
      </label>
      <p class="text-pretty text-sm text-muted">
        Published history for {country?.name}. The decision month is
        <span class="num">{view.month}</span>.
        {#if country?.euro}
          This country uses the euro, so there is no nominal devaluation control.
        {/if}
      </p>
      <dl class="grid gap-2 text-sm">
        <div>
          <dt>10-year yield</dt>
          <dd class="num text-lg">{yieldNow ? `${yieldNow.v.toFixed(2)}%` : "Not in the file"}</dd>
        </div>
        <div>
          <dt>OAT minus Bund</dt>
          <dd class="num text-lg">{spreadNow ? `${spreadNow.v.toFixed(1)} bp` : "Needs both yields"}</dd>
        </div>
        <div>
          <dt>Unemployment</dt>
          <dd class="num">{unemp ? `${unemp.v.toFixed(2)}%` : "Not in the file"}{unemp?.annual ? " (annual)" : ""}</dd>
        </div>
      </dl>
    </section>

    <section class="min-h-64 lg:col-start-2 lg:row-start-1">
      <ChartView {panel} {view} />
    </section>

    <section class="flex flex-col gap-3 lg:col-start-3 lg:row-start-1">
      <h2 class="font-serif text-xl">Scenario</h2>
      <p class="text-pretty text-sm text-muted">
        A scenario starts at the decision month. Dates before that stay on the published line.
      </p>
      {#each scenarios as id (id)}
        <button
          class="border border-ink px-3 py-2 text-left"
          onclick={() => act({ type: "apply", id })}
        >
          {id === "rate-10y" ? "Hold the 10-year yield from the decision month" : id}
        </button>
      {/each}
      {#if !scenarios.includes("spx-put")}
        <p class="text-sm text-muted">SPX put is off. It needs the United States.</p>
      {/if}
      <button class="border border-line px-3 py-2 text-left" onclick={() => act({ type: "clear" })}>
        Clear scenario
      </button>
      <button class="border border-line px-3 py-2 text-left" onclick={() => act({ type: "undo" })}>
        Undo
      </button>
      {#if view.scenario}
        {#key view.scenario}
          <p class="animate__animated animate__fadeIn text-sm" style="--animate-duration: 0.35s">
            Scenario on. The red line holds the decision yield.
          </p>
        {/key}
      {/if}
    </section>

    <footer class="flex flex-wrap items-end justify-between gap-3 border-t border-line pt-3 lg:col-span-3">
      <p class="num text-sm">
        Published {yieldNow ? yieldNow.v.toFixed(2) : "n/a"}%.
        Gap versus the held yield is 0.00 percentage points at the decision month.
      </p>
      <button class="border border-ink px-3 py-2" onclick={share}>Copy share link</button>
    </footer>
  </main>
{/if}
