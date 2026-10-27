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
  const lines = panel.countries[view.country]?.lines ?? {};
  const out: string[] = [];
  if (lines.ltgdr?.length) out.push("rate-10y");
  if (view.country === "USA" && lines.ltgdr?.length) out.push("us-treasury");
  if (view.country === "USA") out.push("spx-put");
  return out;
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
    return { country: action.id, month: view.month, scenario: null, past };
  }
  if (action.type === "month") {
    return { ...view, month: action.id, past };
  }
  if (action.type === "apply") {
    return { ...view, scenario: action.id, past };
  }
  return { ...view, scenario: null, past };
}
