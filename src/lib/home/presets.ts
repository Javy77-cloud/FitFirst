export const DASHBOARD_PRESETS = ["my_production", "pipeline_focus", "retention"] as const;
export type DashboardPreset = (typeof DASHBOARD_PRESETS)[number];

export const DASHBOARD_PRESET_LABEL: Record<DashboardPreset, string> = {
  my_production: "My production",
  pipeline_focus: "Pipeline focus",
  retention: "Retention / renewals",
};

export const BOOK_SCOPES = ["my_book", "agency"] as const;
export type BookScope = (typeof BOOK_SCOPES)[number];

export const HOME_WIDGET_IDS = [
  "kpis",
  "ratios",
  "mom",
  "strip",
  "charts",
  "leaderboard",
  "contest",
  "lead_offers",
  "birthdays",
  "turning65",
  "renewals",
  "attention",
  "cross_sell",
  "ana",
  "alerts",
  "recent_deals",
  "company",
] as const;
export type HomeWidgetId = (typeof HOME_WIDGET_IDS)[number];

export const HOME_WIDGET_LABEL: Record<HomeWidgetId, string> = {
  kpis: "Book KPIs",
  ratios: "Premium and policy ratios",
  mom: "This month vs last",
  strip: "Pipeline strip",
  charts: "Carrier and line charts",
  leaderboard: "Production leaderboard",
  contest: "Reward / contest board",
  lead_offers: "Management lead offers",
  birthdays: "Client birthdays",
  turning65: "Turning 65",
  renewals: "Renewal windows",
  attention: "Needs attention",
  cross_sell: "Cross-sell",
  ana: "Ana Dib shop",
  alerts: "In-app alerts",
  recent_deals: "Recent deals",
  company: "Agency widgets",
};

const PRESET_WIDGETS: Record<DashboardPreset, readonly HomeWidgetId[]> = {
  my_production: [
    "kpis",
    "ratios",
    "mom",
    "strip",
    "charts",
    "leaderboard",
    "contest",
    "lead_offers",
    "company",
    "attention",
    "ana",
  ],
  pipeline_focus: [
    "strip",
    "mom",
    "attention",
    "recent_deals",
    "alerts",
    "lead_offers",
    "cross_sell",
    "charts",
    "ana",
  ],
  retention: [
    "kpis",
    "mom",
    "renewals",
    "birthdays",
    "turning65",
    "attention",
    "charts",
    "contest",
    "company",
  ],
};

export function parseDashboardPreset(raw: string | null | undefined): DashboardPreset {
  if (raw && (DASHBOARD_PRESETS as readonly string[]).includes(raw)) {
    return raw as DashboardPreset;
  }
  return "my_production";
}

export function parseBookScope(raw: string | null | undefined): BookScope {
  if (raw && (BOOK_SCOPES as readonly string[]).includes(raw)) {
    return raw as BookScope;
  }
  return "my_book";
}

export function parseHiddenWidgets(raw: unknown): HomeWidgetId[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is HomeWidgetId =>
    (HOME_WIDGET_IDS as readonly string[]).includes(String(id)),
  );
}

export function widgetsForPreset(preset: DashboardPreset): HomeWidgetId[] {
  return [...PRESET_WIDGETS[preset]];
}

export function hiddenForPreset(preset: DashboardPreset): HomeWidgetId[] {
  const shown = new Set(widgetsForPreset(preset));
  return HOME_WIDGET_IDS.filter((id) => !shown.has(id));
}

export function isWidgetVisible(
  id: HomeWidgetId,
  preset: DashboardPreset,
  hidden: readonly string[],
  opts?: { showCompanyWidgets?: boolean; isAgent?: boolean },
): boolean {
  void preset;
  if (hidden.includes(id)) return false;
  if (id === "company" && opts?.isAgent && !opts.showCompanyWidgets) return false;
  return true;
}
