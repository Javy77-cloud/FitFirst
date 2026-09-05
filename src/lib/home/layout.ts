import type { HomeWidgetId as PresetWidgetId } from "./presets";
import type { SocialPlatformId } from "@/lib/social/platforms";

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
  "social-facebook",
  "social-instagram",
  "social-x",
  "social-linkedin",
  "social-gbp",
] as const;

export type HomeWidgetId = (typeof HOME_WIDGET_IDS)[number];
export type WidgetSpan = "1x1" | "1x2" | "1x3" | "2x1" | "2x2" | "3x1" | "3x2" | "4x1" | "4x2";

export type WidgetPlacement = {
  id: HomeWidgetId;
  span: WidgetSpan;
  /** Visual column count from corner resize (1–4). Independent of neighbors. */
  cols?: number;
  /** Pixel height from corner resize. Independent of neighbors. */
  heightPx?: number;
};

export const WIDGET_SPANS: WidgetSpan[] = ["1x1", "1x2", "1x3", "2x1", "2x2", "3x1", "3x2", "4x1", "4x2"];

export const MIN_TILE_HEIGHT = 128;
export const MAX_TILE_HEIGHT = 720;

export type NamedHomeLayout = {
  id: string;
  name: string;
  placements: WidgetPlacement[];
  hiddenWidgets: string[];
};

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
  "social-facebook": "social",
  "social-instagram": "social",
  "social-x": "social",
  "social-linkedin": "social",
  "social-gbp": "social",
};

export const SOCIAL_LAYOUT_TO_PLATFORM: Partial<Record<HomeWidgetId, SocialPlatformId>> = {
  "social-facebook": "facebook",
  "social-instagram": "instagram",
  "social-x": "x",
  "social-linkedin": "linkedin",
  "social-gbp": "google_business_profile",
};

export const LAYOUT_WIDGET_LABEL: Record<HomeWidgetId, string> = {
  "kpi-accounts": "Active accounts",
  "kpi-inforce": "Premium in-force",
  "kpi-policies": "Policies",
  "kpi-carriers": "Carriers",
  "kpi-written": "Written this month",
  "kpi-fourth": "Commission / renewals KPI",
  ratios: "Premium and policy ratios",
  mom: "This month vs last",
  strip: "Pipeline strip",
  "hit-lost": "Hit ratio / lost business",
  company: "Agency this month",
  "line-mix": "Policies by line",
  "carrier-mix": "Carrier share",
  leaderboard: "Production leaderboard",
  contest: "Reward / contest board",
  "lead-offers": "Management lead offers",
  "renewal-risk": "Renewal-risk flags",
  birthdays: "Birthdays",
  turning65: "Turning 65",
  renewals: "Renewal windows",
  attention: "Needs attention",
  "cross-sell": "Cross-sell",
  ana: "Open shop",
  alerts: "In-app alerts",
  "recent-deals": "Recent deals",
  "social-facebook": "Facebook",
  "social-instagram": "Instagram",
  "social-x": "X",
  "social-linkedin": "LinkedIn",
  "social-gbp": "Google Business Profile",
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
  { id: "social-facebook", span: "1x1" },
  { id: "social-instagram", span: "1x1" },
  { id: "social-x", span: "1x1" },
  { id: "social-linkedin", span: "1x1" },
  { id: "social-gbp", span: "1x1" },
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

export function spanCols(span: WidgetSpan): number {
  if (span.startsWith("4")) return 4;
  if (span.startsWith("3")) return 3;
  if (span.startsWith("2")) return 2;
  return 1;
}

export function spanRows(span: WidgetSpan): number {
  if (span.endsWith("3")) return 3;
  if (span.endsWith("2")) return 2;
  return 1;
}

export function spanMinHeight(span: WidgetSpan): string {
  const rows = spanRows(span);
  if (rows >= 3) return "min-h-[33rem]";
  if (rows === 2) return "min-h-[21.5rem]";
  return "min-h-[10rem]";
}

export function colSpanClass(cols: number): string {
  if (cols >= 4) return "col-span-2 xl:col-span-4";
  if (cols === 3) return "col-span-2 xl:col-span-3";
  if (cols === 2) return "col-span-2";
  return "col-span-1";
}

/**
 * Column span + own min-height. No CSS row-span — shared row tracks were
 * stretching stacked neighbors when one tile changed height.
 */
export function spanClass(span: WidgetSpan): string {
  return `${colSpanClass(spanCols(span))} ${spanMinHeight(span)} self-start`;
}

export function clampTileHeight(value: number): number {
  return Math.min(MAX_TILE_HEIGHT, Math.max(MIN_TILE_HEIGHT, Math.round(value)));
}

export function clampTileCols(value: number): number {
  return Math.min(4, Math.max(1, Math.round(value)));
}

export function nearestSpan(cols: number, heightPx: number): WidgetSpan {
  const col = clampTileCols(cols);
  const row = heightPx >= 480 ? 3 : heightPx >= 280 ? 2 : 1;
  const key = `${col}x${row}`;
  if (isWidgetSpan(key)) return key;
  if (row === 3 && isWidgetSpan(`${col}x2`)) return `${col}x2` as WidgetSpan;
  return isWidgetSpan(`${col}x1`) ? (`${col}x1` as WidgetSpan) : "1x1";
}

export function tileGridClass(item: Pick<WidgetPlacement, "span" | "cols" | "heightPx">): string {
  const cols = item.cols ? clampTileCols(item.cols) : spanCols(item.span);
  const height = item.heightPx ? "" : spanMinHeight(item.span);
  return `${colSpanClass(cols)} ${height} self-start`.trim();
}

export function parseHeightPx(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return clampTileHeight(value);
}

export function parseCols(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return clampTileCols(value);
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
    const heightPx = parseHeightPx((row as { heightPx?: unknown }).heightPx);
    const cols = parseCols((row as { cols?: unknown }).cols);
    next.push({
      id: id as HomeWidgetId,
      span: span as WidgetSpan,
      ...(cols ? { cols } : {}),
      ...(heightPx ? { heightPx } : {}),
    });
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

/** Resize only this tile. Neighbors keep their stored w/h. */
export function setWidgetSpan(layout: WidgetPlacement[], id: string, span: WidgetSpan): WidgetPlacement[] {
  return layout.map((item) => (item.id === id ? { id: item.id, span } : item));
}

/** Corner-resize only this tile. Neighbors keep their stored w/h. */
export function setWidgetSize(
  layout: WidgetPlacement[],
  id: string,
  size: { cols: number; heightPx: number; span?: WidgetSpan },
): WidgetPlacement[] {
  const cols = clampTileCols(size.cols);
  const heightPx = clampTileHeight(size.heightPx);
  const span = size.span ?? nearestSpan(cols, heightPx);
  return layout.map((item) => (item.id === id ? { id: item.id, span, cols, heightPx } : item));
}
