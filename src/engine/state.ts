import { cardsFor } from "./cards";

export type View = {
  country: string;
  month: string;
  scenario: string | null;
  past: { country: string; month: string; scenario: string | null }[];
};

export type Action =
  | { type: "country"; id: string }
  | { type: "month"; id: string }
  | { type: "apply"; id: string }
  | { type: "clear" }
  | { type: "undo" };

type Panel = {
  default: { country: string; month: string };
  countries: Record<string, { euro?: boolean; lines: Record<string, { d: string }[]> }>;
};

export function initialState(panel: Panel): View {
  return {
    country: panel.default.country,
    month: panel.default.month,
    scenario: null,
    past: [],
  };
}

export function allowedScenarios(view: View, panel: Panel): string[] {
  return cardsFor(view.country, view.month, panel)
    .filter((card) => card.playable)
    .map((card) => card.id);
}

function snap(view: View) {
  return { country: view.country, month: view.month, scenario: view.scenario };
}

export function applyAction(view: View, action: Action, panel?: Panel): View {
  if (action.type === "undo") {
    const prev = view.past.at(-1);
    if (!prev) return view;
    return { ...prev, past: view.past.slice(0, -1) };
  }
  if (action.type === "apply") {
    if (!panel || !allowedScenarios(view, panel).includes(action.id)) return view;
    if (view.scenario === action.id) return view;
  }
  if (action.type === "country" && action.id === view.country) return view;
  if (action.type === "month" && action.id === view.month) return view;
  if (action.type === "clear" && view.scenario === null) return view;

  const past = [...view.past, snap(view)];
  if (action.type === "country") {
    const line = panel?.countries[action.id]?.lines.ltgdr ?? [];
    const month = [...line].reverse().find((row) => row.d <= view.month)?.d ?? line.at(-1)?.d ?? view.month;
    return { country: action.id, month, scenario: null, past };
  }
  if (action.type === "month") {
    const line = panel?.countries[view.country]?.lines.ltgdr ?? [];
    const last = line.at(-1)?.d;
    const scenario = last && action.id >= last ? null : view.scenario;
    return { ...view, month: action.id, scenario, past };
  }
  if (action.type === "apply") {
    return { ...view, scenario: action.id, past };
  }
  return { ...view, scenario: null, past };
}
