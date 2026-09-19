import type { HeatState, VelocityPhase } from "@/lib/deals/velocity";
import { HIGH_VALUE_COVERAGE_A } from "@/lib/deals/velocity";
import { bookFamily } from "@/lib/desk/policy-line";

export const DEAL_HEAT_FILTERS = ["hot", "cooling", "near_cold", "cold"] as const;
export type DealHeatFilter = (typeof DEAL_HEAT_FILTERS)[number];

export const DEAL_LENS_IDS = ["my-hot-pc", "agency-cold", "high-value-quoting"] as const;
export type DealLensId = (typeof DEAL_LENS_IDS)[number];

export const DEAL_LENSES: Array<{
  id: DealLensId;
  label: string;
  heat?: DealHeatFilter;
  scope?: "mine" | "team";
  family?: "pc" | "life" | "health";
  valueBand?: "high";
  phase?: VelocityPhase;
}> = [
  { id: "my-hot-pc", label: "My hot P&C", heat: "hot", scope: "mine", family: "pc" },
  { id: "agency-cold", label: "Agency cold 14d+", heat: "cold", scope: "team" },
  { id: "high-value-quoting", label: "High value quoting", valueBand: "high", phase: "quotes" },
];

export function parseDealHeat(raw?: string | null): DealHeatFilter | null {
  return raw && (DEAL_HEAT_FILTERS as readonly string[]).includes(raw) ? (raw as DealHeatFilter) : null;
}

export function parseDealLens(raw?: string | null): DealLensId | null {
  return raw && (DEAL_LENS_IDS as readonly string[]).includes(raw) ? (raw as DealLensId) : null;
}

export function parseDealScope(raw?: string | null): "mine" | "team" | null {
  return raw === "mine" || raw === "team" ? raw : null;
}

export function parseValueBand(raw?: string | null): "high" | "mid" | "low" | null {
  return raw === "high" || raw === "mid" || raw === "low" ? raw : null;
}

export type DealLensCard = {
  ownerId?: string | null;
  lineOfBusiness?: string | null;
  heat: HeatState;
  value: number;
  phase: VelocityPhase;
};

export function matchesDealLens(
  card: DealLensCard,
  filter: {
    heat?: string | null;
    lens?: string | null;
    scope?: string | null;
    valueBand?: string | null;
    viewerId?: string | null;
    canSeeTeam?: boolean;
  },
): boolean {
  const lens = parseDealLens(filter.lens);
  const preset = lens ? DEAL_LENSES.find((row) => row.id === lens) : null;
  const heat = parseDealHeat(filter.heat) ?? preset?.heat ?? null;
  const scope = parseDealScope(filter.scope) ?? preset?.scope ?? null;
  const valueBand = parseValueBand(filter.valueBand) ?? preset?.valueBand ?? null;
  const family = preset?.family ?? null;
  const phase = preset?.phase ?? null;

  if (heat && card.heat !== heat) return false;
  if (family && bookFamily(card.lineOfBusiness ?? "") !== family) return false;
  if (phase === "quotes" && card.phase !== "quotes" && card.phase !== "post_quote_gap") return false;
  if (valueBand === "high" && card.value < HIGH_VALUE_COVERAGE_A) return false;
  if (valueBand === "mid" && (card.value < 80_000 || card.value >= HIGH_VALUE_COVERAGE_A)) return false;
  if (valueBand === "low" && card.value >= 80_000) return false;
  if (scope === "mine" && filter.viewerId && card.ownerId !== filter.viewerId) return false;
  if (scope === "team" && !filter.canSeeTeam && filter.viewerId && card.ownerId !== filter.viewerId) {
    return false;
  }
  return true;
}
