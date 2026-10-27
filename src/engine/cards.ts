export type Point = { d: string; v: number };

export type Card = {
  id: string;
  name: string;
  effect: string;
  cost: string;
  status: string;
  play: string;
  playable: boolean;
};

type Panel = {
  countries: Record<string, { lines: Record<string, Point[]> }>;
};

const EARLIER = "Pick an earlier month. Today is already the last point.";

function has(panel: Panel, country: string, key: string): boolean {
  return (panel.countries[country]?.lines[key]?.length ?? 0) > 0;
}

function card(
  id: string,
  name: string,
  effect: string,
  cost: string,
  missing: string | null,
): Card {
  const ready = missing === null;
  const line = ready ? "Ready" : `Missing: ${missing}`;
  return { id, name, effect, cost, status: line, play: ready ? "Play" : line, playable: ready };
}

/** Wystup chapters 1 and 2, plus the 10-year hold. Five lines each. */
export function cardsFor(country: string, month: string, panel: Panel): Card[] {
  const yields = panel.countries[country]?.lines.ltgdr ?? [];
  const last = yields.at(-1)?.d ?? null;
  const beforeLast = Boolean(last && month < last);
  const hold: Card = yields.length === 0
    ? card("hold-10y", "Hold the 10-year", "Today's yield becomes the yield on the month you pick.", "You give up later moves in the published yield.", "10-year yield")
    : {
        id: "hold-10y",
        name: "Hold the 10-year",
        effect: "Today's yield becomes the yield on the month you pick.",
        cost: "You give up later moves in the published yield.",
        status: beforeLast ? "Ready" : EARLIER,
        play: beforeLast ? "Play" : EARLIER,
        playable: beforeLast,
      };

  const dollarRate = country === "USA" && has(panel, country, "ltgdr");
  const fx = has(panel, country, "fx");
  const vol = has(panel, country, "fxvol");
  const outrightMissing = dollarRate && fx ? null : dollarRate ? "dollar exchange rate" : "dollar interest rate";

  return [
    hold,
    card("spot", "FX spot", "Today's dollar value follows later realised moves.", "You give up the local-currency path.", fx ? null : "dollar exchange rate"),
    card("outright", "FX outright", "A forward replaces the later spot path.", "You lock the rate instead of staying in spot.", outrightMissing),
    card("fx-swap", "FX swap", "Two exchanges replace the later spot path.", "You swap principal at the near date and the far date.", outrightMissing),
    card("vanilla-call", "FX vanilla call", "Today's yield stays. The call pays if spot finishes above the strike.", "You pay a premium.", vol ? null : "FX volatility"),
    card("vanilla-put", "FX vanilla put", "Today's yield stays. The put pays if spot finishes below the strike.", "You pay a premium.", vol ? null : "FX volatility"),
    card("digital", "FX digital", "Today's yield stays. You receive a fixed cash amount or nothing.", "You pay a premium.", vol ? null : "FX volatility"),
    card("barrier", "FX barrier", "Today's yield stays. The option dies if spot crosses a level.", "You pay a premium for a contract that can knock out.", vol ? null : "FX volatility"),
    card("tarf", "Target redemption forward", "Today's yield stays. Gains stop once a target is hit.", "Losses are not capped.", vol ? null : "FX volatility"),
    card("accumulator", "FX accumulator", "Today's yield stays. You buy more when spot is weak.", "The extra purchases are obligatory.", vol ? null : "FX volatility"),
    card("dual-currency", "Dual-currency deposit", "Today's yield stays. Repayment can switch currency.", "You can be repaid in the weaker currency.", vol ? null : "FX volatility"),
    card("participating", "Participating forward", "Today's yield stays. You keep part of a favourable move.", "You keep all of an adverse move.", vol ? null : "FX volatility"),
    card("risk-reversal", "Risk reversal", "Today's yield stays. One option pays for the other.", "You are short the other wing.", vol ? null : "FX volatility"),
    card("straddle", "Straddle", "Today's yield stays. You profit if spot moves far either way.", "You pay two premiums.", vol ? null : "FX volatility"),
    card("strangle", "Strangle", "Today's yield stays. You profit if spot moves past either strike.", "You pay two premiums.", vol ? null : "FX volatility"),
    card(
      "cross-currency-swap",
      "Cross-currency swap",
      "Today's yield stays. Two interest streams are exchanged.",
      "You also exchange the notionals.",
      country === "USA" ? "foreign interest rate" : "dollar interest rate",
    ),
    card(
      "spx-put",
      "SPX put",
      "Today's yield stays. The put pays on the US index.",
      "You pay the listed premium.",
      "listed premium",
    ),
  ].filter((item) => item.id !== "spx-put" || country === "USA");
}

export function cardById(country: string, month: string, panel: Panel, id: string): Card | undefined {
  return cardsFor(country, month, panel).find((item) => item.id === id);
}
