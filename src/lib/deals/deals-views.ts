import { parseRenewalsView, renewalsHref, type PipelineViewId } from "@/lib/wire/pipeline";

export const DEALS_VIEWS = ["stack", "radar"] as const;
export type DealsViewId = (typeof DEALS_VIEWS)[number];

export function isDealsViewId(raw?: string | null): raw is DealsViewId {
  return raw === "stack" || raw === "radar";
}

/** Agents land on Priority Stack. Owners / agency-book roles land on Radar. */
export function defaultDealsView(
  session?: { isAdmin?: boolean; user?: { canSeeAgencyWidgets?: boolean | null } | null } | null,
): DealsViewId {
  if (!session) return "stack";
  return session.isAdmin || Boolean(session.user?.canSeeAgencyWidgets) ? "radar" : "stack";
}

/**
 * Stack | Radar are the only Deals shopping views.
 * Legacy list/grid → stack. Legacy board/funnel → radar.
 */
export function parseDealsView(
  raw?: string | null,
  fallback: DealsViewId = "stack",
): DealsViewId {
  if (raw === "stack" || raw === "radar") return raw;
  if (raw === "board" || raw === "funnel") return "radar";
  if (raw === "list" || raw === "table" || raw === "grid") return "stack";
  return fallback;
}

export function dealsViewHref(opts: {
  view?: DealsViewId | null;
  pipeline?: string | null;
  family?: string | null;
  pcSub?: string | null;
  lifeSub?: string | null;
  healthSub?: string | null;
  attention?: string | null;
  heat?: string | null;
  lens?: string | null;
  scope?: string | null;
  valueBand?: string | null;
  q?: string | null;
} = {}): string {
  const params = new URLSearchParams();
  if (opts.pipeline && opts.pipeline !== "all") params.set("pipeline", opts.pipeline);
  if (opts.view) params.set("view", opts.view);
  if (opts.family) params.set("family", opts.family);
  if (opts.pcSub) params.set("pcSub", opts.pcSub);
  if (opts.lifeSub) params.set("lifeSub", opts.lifeSub);
  if (opts.healthSub) params.set("healthSub", opts.healthSub);
  if (opts.attention) params.set("attention", opts.attention);
  if (opts.heat) params.set("heat", opts.heat);
  if (opts.lens) params.set("lens", opts.lens);
  if (opts.scope) params.set("scope", opts.scope);
  if (opts.valueBand) params.set("valueBand", opts.valueBand);
  if (opts.q) params.set("q", opts.q);
  const qs = params.toString();
  return qs ? `/deals?${qs}` : "/deals";
}

/** New ↔ Renewals does not carry Stack/Radar onto Renewals or List/Grid onto Deals. */
export function dealsBookToggleHrefs(view?: string | null): { newHref: string; renewalsHref: string } {
  if (isDealsViewId(view)) {
    return { newHref: dealsViewHref({ view }), renewalsHref: "/renewals" };
  }
  const renewals = view ? parseRenewalsView(view) : null;
  return {
    newHref: "/deals",
    renewalsHref: renewals ? renewalsHref({ view: renewals }) : "/renewals",
  };
}

export function asSavedDealsView(raw?: string | null): DealsViewId | PipelineViewId | null {
  if (isDealsViewId(raw)) return raw;
  if (raw === "board" || raw === "funnel") return "radar";
  if (raw === "list" || raw === "table" || raw === "grid") return "stack";
  return null;
}
