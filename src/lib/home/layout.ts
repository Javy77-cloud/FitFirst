export const HOME_WIDGET_IDS = [
  "kpi-inforce",
  "kpi-written",
  "kpi-pipeline",
  "kpi-fourth",
  "renewals",
  "attention",
  "line-mix",
  "carrier-mix",
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

export const DEFAULT_HOME_LAYOUT: WidgetPlacement[] = [
  { id: "kpi-inforce", span: "1x1" },
  { id: "kpi-written", span: "1x1" },
  { id: "kpi-pipeline", span: "1x1" },
  { id: "kpi-fourth", span: "1x1" },
  { id: "renewals", span: "2x1" },
  { id: "attention", span: "2x1" },
  { id: "line-mix", span: "2x1" },
  { id: "carrier-mix", span: "2x1" },
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
