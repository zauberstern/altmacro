<script lang="ts">
  import { onMount } from "svelte";
  import ChartView from "./ChartView.svelte";
  import { applyAction, initialState, type View } from "./engine/state";
  import { cardsFor } from "./engine/cards";
  import { countryName, sortCountries } from "./engine/names";
  import { buildTimeline } from "./chart/timeline";

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

  let copied = $state(false);

  function share() {
    if (!view) return;
    const payload = encodeURIComponent(
      JSON.stringify({ country: view.country, month: view.month, scenario: view.scenario }),
    );
    const url = `${location.origin}${location.pathname}?s=${payload}`;
    localStorage.setItem("altmacro-scenario", payload);
    navigator.clipboard?.writeText(url).then(() => {
      copied = true;
    }).catch(() => undefined);
  }

  function at(lines: Point[] | undefined, month: string) {
    if (!lines?.length) return null;
    const hit = [...lines].reverse().find((row) => row.d <= month);
    return hit ?? null;
  }

  let page = $state(0);
  const country = $derived(panel && view ? panel.countries[view.country] : null);
  const names = $derived(
    panel
      ? sortCountries(
          Object.values(panel.countries).map((c) => ({
            id: c.iso,
            name: countryName(c.iso, c.name),
          })),
        )
      : [],
  );
  const cards = $derived(panel && view ? cardsFor(view.country, view.month, panel) : []);
  const visible = $derived(cards.slice(page * 5, page * 5 + 5));
  const months = $derived(country?.lines.ltgdr?.map((row) => row.d) ?? []);
  const today = $derived(country?.lines.ltgdr?.at(-1) ?? null);
  const held = $derived(
    country && view && view.scenario === "hold-10y" && today && view.month < today.d
      ? at(country.lines.ltgdr, view.month)
      : null,
  );
  const shown = $derived(held ?? today);
  const spreadNow = $derived(country && today ? at(country.lines.oat_bund_bps, today.d) : null);
  const nextCard = $derived(cards.find((card) => card.playable)?.name ?? null);
  const stateLine = $derived(
    view
      ? `${countryName(view.country, country?.name)}, ${today ? today.d.slice(0, 7) : "no yield"}, ${view.scenario ? "Hold the 10-year" : "no card"}`
      : "",
  );

  onMount(() => {
    load();
  });

  $effect(() => {
    if (!view || !panel) return;
    const spec = buildTimeline(panel, view);
    const published = spec.data.datasets[0]?.data ?? [];
    const fork = spec.data.datasets.find((row) => row.label === "Scenario")?.data ?? null;
    const last = (fork ?? published).at(-1)?.y ?? null;
    (window as Window & { __altmacro?: unknown }).__altmacro = {
      country: view.country,
      month: view.month,
      scenario: view.scenario,
      published,
      fork,
      last,
    };
  });
</script>

{#if !panel || !view}
  <main class="grid h-dvh place-items-center">
    <p>{loadError || "Loading the measured history."}</p>
  </main>
{:else}
  <main class="grid h-dvh grid-rows-[auto_1fr_auto] gap-4 overflow-auto p-4 lg:grid-cols-[18rem_1fr] lg:grid-rows-[1fr_auto]">
    <aside class="flex flex-col gap-3">
      <p class="text-sm">{stateLine}</p>
      <p class="text-sm">Today's 10-year yield is {shown ? `${shown.v.toFixed(2)}%` : "not in this file"}.</p>
      <p class="num text-4xl font-semibold">{shown ? `${shown.v.toFixed(2)}%` : "not in this file"}</p>
      {#if held && today}
        <p class="num text-sm">Published yield on {today.d.slice(0, 7)} is {today.v.toFixed(2)}%.</p>
      {/if}
      {#if view.country === "FRA"}
        <p class="num text-sm">OAT Bund spread {spreadNow ? `${spreadNow.v.toFixed(1)} bp` : "not in this file"}.</p>
      {/if}
      <label class="text-sm">
        Country
        <select
          id="country"
          class="mt-1 w-full border border-line bg-paper p-2"
          value={view.country}
          onchange={(e) => {
            page = 0;
            act({ type: "country", id: e.currentTarget.value });
          }}
        >
          {#each names as row (row.id)}
            <option value={row.id}>{row.name}</option>
          {/each}
        </select>
      </label>
      <label class="text-sm">
        Play month
        <select
          id="play-month"
          class="mt-1 w-full border border-line bg-paper p-2"
          value={view.month}
          onchange={(e) => act({ type: "month", id: e.currentTarget.value })}
        >
          {#each months as month (month)}
            <option value={month}>{month.slice(0, 7)}</option>
          {/each}
        </select>
      </label>
      <button type="button" class="border border-ink px-3 py-2 text-left" onclick={share}>
        {copied ? "Link copied." : "Copy share link"}
      </button>
      {#if view.past.length}
        <button type="button" class="border border-line px-3 py-2 text-left" onclick={() => act({ type: "undo" })}>
          Undo
        </button>
      {/if}
    </aside>

    <section class="flex min-h-0 flex-col gap-3">
      <div class="relative h-72 w-full">
        <ChartView {panel} {view} />
      </div>
      <p class="text-sm">
        {#if view.scenario}
          Today's yield is the {view.month.slice(0, 7)} yield.
        {:else if nextCard}
          Next card: {nextCard}.
        {:else}
          Pick an earlier month. Today is already the last point.
        {/if}
      </p>
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {#each visible as card (card.id)}
          <article class="flex flex-col gap-2 border border-line p-3 text-sm">
            <p>{card.effect}</p>
            <p class="font-semibold">{card.name}</p>
            <p>{card.cost}</p>
            <p>{card.status}</p>
            <button
              type="button"
              class="mt-auto border border-ink px-3 py-2 text-left disabled:border-line disabled:opacity-60"
              disabled={!card.playable || view.scenario === card.id}
              onclick={() => act({ type: "apply", id: card.id })}
            >{view.scenario === card.id ? "This card is on." : card.play}</button>
          </article>
        {/each}
      </div>
      {#if cards.length > 5}
        <button type="button" class="text-left text-sm underline" onclick={() => (page = (page + 1) % Math.ceil(cards.length / 5))}>
          Show the next 5 cards
        </button>
      {/if}
    </section>

    <footer class="border-t border-line pt-3 text-sm text-muted lg:col-span-2">
      The monthly file ends in 2026-09. October daily prints are not in this file.
    </footer>
  </main>
{/if}
