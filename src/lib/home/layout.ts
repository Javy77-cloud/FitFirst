import type { HomeWidgetId as PresetWidgetId } from "./presets";

export const HOME_WIDGET_IDS = [
  "kpi-accounts",
  "kpi-inforce",
  "kpi-policies",
  "kpi-carriers",
  "kpi-written",
  "kpi-fourth",
  "ratios",
  "mom",
  "strip",
  "hit-lost",
  "company",
  "line-mix",
  "carrier-mix",
  "leaderboard",
  "contest",
  "lead-offers",
  "renewal-risk",
  "birthdays",
  "turning65",
  "renewals",
  "attention",
  "cross-sell",
  "ana",
  "alerts",
  "recent-deals",
] as const;

export type HomeWidgetId = (typeof HOME_WIDGET_IDS)[number];
export type WidgetSpan = "1x1" | "1x2" | "2x1" | "2x2";

export type WidgetPlacement = {
  id: HomeWidgetId;
  span: WidgetSpan;
};

export const WIDGET_SPANS: WidgetSpan[] = ["1x1", "1x2", "2x1", "2x2"];

/** Which dashboard-preset / hide-checkbox gate controls each tile. */
export const LAYOUT_TO_PRESET: Record<HomeWidgetId, PresetWidgetId> = {
  "kpi-accounts": "kpis",
  "kpi-inforce": "kpis",
  "kpi-policies": "kpis",
  "kpi-carriers": "kpis",
  "kpi-written": "kpis",
  "kpi-fourth": "kpis",
  ratios: "ratios",
  mom: "mom",
  strip: "strip",
  "hit-lost": "hit_lost",
  company: "company",
  "line-mix": "charts",
  "carrier-mix": "charts",
  leaderboard: "leaderboard",
  contest: "contest",
  "lead-offers": "lead_offers",
  "renewal-risk": "renewal_risk",
  birthdays: "birthdays",
  turning65: "turning65",
  renewals: "renewals",
  attention: "attention",
  "cross-sell": "cross_sell",
  ana: "ana",
  alerts: "alerts",
  "recent-deals": "recent_deals",
};

export const DEFAULT_HOME_LAYOUT: WidgetPlacement[] = [
  { id: "kpi-accounts", span: "1x1" },
  { id: "kpi-inforce", span: "1x1" },
  { id: "kpi-policies", span: "1x1" },
  { id: "kpi-carriers", span: "1x1" },
  { id: "kpi-written", span: "1x1" },
  { id: "kpi-fourth", span: "1x1" },
  { id: "ratios", span: "2x1" },
  { id: "mom", span: "2x1" },
  { id: "strip", span: "2x1" },
  { id: "hit-lost", span: "2x1" },
  { id: "company", span: "2x1" },
  { id: "line-mix", span: "2x1" },
  { id: "carrier-mix", span: "2x1" },
  { id: "leaderboard", span: "2x1" },
  { id: "contest", span: "2x1" },
  { id: "lead-offers", span: "2x2" },
  { id: "renewal-risk", span: "2x1" },
  { id: "birthdays", span: "2x1" },
  { id: "turning65", span: "2x1" },
  { id: "renewals", span: "2x1" },
  { id: "attention", span: "2x1" },
  { id: "cross-sell", span: "2x1" },
  { id: "ana", span: "2x1" },
  { id: "alerts", span: "2x1" },
  { id: "recent-deals", span: "2x1" },
];

const ID_SET = new Set<string>(HOME_WIDGET_IDS);
const SPAN_SET = new Set<string>(WIDGET_SPANS);

export function homeLayoutStorageKey(scope: { role: string; agentUserId?: string | null }): string {
  const book = scope.agentUserId ? `agent:${scope.agentUserId}` : scope.role;
  return `ff-home-layout:v1:${book}`;
}

export function isWidgetSpan(value: string): value is WidgetSpan {
  return SPAN_SET.has(value);
}

export function spanClass(span: WidgetSpan): string {
  if (span === "2x2") return "col-span-2 row-span-2";
  if (span === "2x1") return "col-span-2 row-span-1";
  if (span === "1x2") return "col-span-1 row-span-2";
  return "col-span-1 row-span-1";
}

export function mergeHomeLayout(saved: unknown): WidgetPlacement[] {
  const incoming = Array.isArray(saved) ? saved : [];
  const seen = new Set<HomeWidgetId>();
  const next: WidgetPlacement[] = [];

  for (const row of incoming) {
    if (!row || typeof row !== "object") continue;
    const id = (row as { id?: unknown }).id;
    const span = (row as { span?: unknown }).span;
    if (typeof id !== "string" || !ID_SET.has(id)) continue;
    if (typeof span !== "string" || !SPAN_SET.has(span)) continue;
    if (seen.has(id as HomeWidgetId)) continue;
    seen.add(id as HomeWidgetId);
    next.push({ id: id as HomeWidgetId, span: span as WidgetSpan });
  }

  for (const fallback of DEFAULT_HOME_LAYOUT) {
    if (seen.has(fallback.id)) continue;
    next.push(fallback);
  }
  return next;
}

export function moveWidget(layout: WidgetPlacement[], fromId: string, toId: string): WidgetPlacement[] {
  if (fromId === toId) return layout;
  const from = layout.findIndex((item) => item.id === fromId);
  const to = layout.findIndex((item) => item.id === toId);
  if (from < 0 || to < 0) return layout;
  const next = layout.slice();
  const [row] = next.splice(from, 1);
  next.splice(to, 0, row);
  return next;
}

export function setWidgetSpan(layout: WidgetPlacement[], id: string, span: WidgetSpan): WidgetPlacement[] {
  return layout.map((item) => (item.id === id ? { ...item, span } : item));
}
