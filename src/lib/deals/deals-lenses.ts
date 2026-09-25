import { ownerMatchesMine } from "@/lib/auth/producer-identity";
import type { HeatState } from "@/lib/deals/velocity";
import type { DealsViewId } from "@/lib/deals/deals-views";

export const DEAL_HEAT_FILTERS = ["hot", "cooling", "near_cold", "cold"] as const;
export type DealHeatFilter = (typeof DEAL_HEAT_FILTERS)[number];

export const DEAL_LENS_IDS = ["my-hot", "book-cold"] as const;
export type DealLensId = (typeof DEAL_LENS_IDS)[number];

const LEGACY_LENS_MAP: Record<string, DealLensId> = {
  "my-hot-pc": "my-hot",
  "agency-cold": "book-cold",
};

export const DEAL_LENSES: Array<{
  id: DealLensId;
  label: string;
  heat: DealHeatFilter;
  scope: "mine" | "team";
  ownerOnly?: boolean;
  help: string;
}> = [
  {
    id: "my-hot",
    label: "My hot",
    heat: "hot",
    scope: "mine",
    help: "Your deals silent under 5 days (call, email, SMS, or meeting). After a quote is sent, silence is days since the quote with no reply.",
  },
  {
    id: "book-cold",
    label: "Book cold 14d+",
    heat: "cold",
    scope: "team",
    ownerOnly: true,
    help: "Agency book silent 14+ days — the cold rule. Same clock as Radar Y.",
  },
];

export function parseDealHeat(raw?: string | null): DealHeatFilter | null {
  return raw && (DEAL_HEAT_FILTERS as readonly string[]).includes(raw) ? (raw as DealHeatFilter) : null;
}

export function parseDealLens(raw?: string | null): DealLensId | null {
  if (!raw) return null;
  if ((DEAL_LENS_IDS as readonly string[]).includes(raw)) return raw as DealLensId;
  return LEGACY_LENS_MAP[raw] ?? null;
}

export function parseDealScope(raw?: string | null): "mine" | "team" | null {
  return raw === "mine" || raw === "team" ? raw : null;
}

export function parseValueBand(_raw?: string | null): "high" | "mid" | "low" | null {
  return null;
}

export function defaultDealScope(input: { canSeeTeam: boolean; view?: DealsViewId | null }): "mine" | "team" {
  // Same default for Radar and Stack so switching views never flips Mine/Team.
  // Agency-book viewers land on Team; Mine is the opt-in.
  void input.view;
  return input.canSeeTeam ? "team" : "mine";
}

export function resolveDealScope(input: {
  scope?: string | null;
  canSeeTeam: boolean;
  view?: DealsViewId | null;
}): "mine" | "team" {
  if (!input.canSeeTeam) return "mine";
  return parseDealScope(input.scope) ?? defaultDealScope(input);
}

export type DealLensCard = {
  ownerId?: string | null;
  lineOfBusiness?: string | null;
  heat: HeatState;
  value?: number;
  phase?: string;
};

export type DealLensFilter = {
  heat?: string | null;
  lens?: string | null;
  scope?: string | null;
  valueBand?: string | null;
  viewerId?: string | null;
  /** Session user plus same-person alias user ids (Javy Rivera / Francisco Javier Garcia). */
  viewerIds?: readonly string[] | null;
  /** Solo agency: Mine includes every deal the viewer can already see. */
  soloBook?: boolean;
  canSeeTeam?: boolean;
  view?: DealsViewId | null;
};

export function resolveDealFilters(filter: DealLensFilter): {
  heat: DealHeatFilter | null;
  scope: "mine" | "team";
  lens: DealLensId | null;
} {
  const lens = parseDealLens(filter.lens);
  const preset = lens ? DEAL_LENSES.find((row) => row.id === lens) : null;
  const canSeeTeam = Boolean(filter.canSeeTeam);
  if (preset?.ownerOnly && !canSeeTeam) {
    return {
      heat: parseDealHeat(filter.heat),
      scope: "mine",
      lens: null,
    };
  }
  const heat = parseDealHeat(filter.heat) ?? preset?.heat ?? null;
  const scope = resolveDealScope({
    scope: filter.scope ?? preset?.scope ?? null,
    canSeeTeam,
    view: filter.view,
  });
  return { heat, scope, lens: preset && (!preset.ownerOnly || canSeeTeam) ? lens : null };
}

export function matchesDealLens(card: DealLensCard, filter: DealLensFilter): boolean {
  const resolved = resolveDealFilters(filter);
  if (resolved.heat && card.heat !== resolved.heat) return false;
  if (resolved.scope === "mine") {
    if (
      !ownerMatchesMine(card.ownerId, {
        viewerId: filter.viewerId,
        viewerIds: filter.viewerIds,
        soloBook: filter.soloBook,
      })
    ) {
      return false;
    }
  }
  return true;
}

export function lensesAreActive(filter: {
  heat?: string | null;
  lens?: string | null;
  scope?: string | null;
  attention?: string | null;
  canSeeTeam?: boolean;
  view?: DealsViewId | null;
}): boolean {
  const resolved = resolveDealFilters(filter);
  const defaultScope = defaultDealScope({ canSeeTeam: Boolean(filter.canSeeTeam), view: filter.view });
  return Boolean(
    resolved.heat ||
      resolved.lens ||
      resolved.scope !== defaultScope ||
      (filter.attention ?? "").trim(),
  );
}

export function visibleLenses(canSeeTeam: boolean) {
  return DEAL_LENSES.filter((item) => !item.ownerOnly || canSeeTeam);
}
