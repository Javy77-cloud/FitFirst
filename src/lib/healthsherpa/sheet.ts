import {
  isMarketplaceCoverageType,
  isMedicareCoverageType,
  normalizeHealthPlanType,
} from "@/lib/quote-sheet/sheet-defaults";

export const USING_HEALTHSHERPA_KEY = "using_healthsherpa";

export const HEALTHSHERPA_MANUAL_PLAN_TYPES = ["Dental", "Vision", "Short-term", "Other"] as const;

export function isUsingHealthSherpa(raw: string | null | undefined): boolean {
  const text = String(raw ?? "").trim().toLowerCase();
  return text === "yes" || text === "true" || text === "1" || text === "on";
}

export function isHealthSherpaManualPlan(raw: string | null | undefined): boolean {
  const plan = normalizeHealthPlanType(raw) || String(raw ?? "").trim();
  return (HEALTHSHERPA_MANUAL_PLAN_TYPES as readonly string[]).some(
    (value) => value.toLowerCase() === plan.toLowerCase(),
  );
}

export function healthSherpaProductForPlan(
  raw: string | null | undefined,
): "medicare" | "marketplace" | "manual" {
  if (isMedicareCoverageType(raw)) return "medicare";
  if (isMarketplaceCoverageType(raw)) return "marketplace";
  if (isHealthSherpaManualPlan(raw)) return "manual";
  return "manual";
}

export function healthSherpaCollapsibleGroups(usingHealthSherpa: boolean): Set<string> {
  if (!usingHealthSherpa) return new Set();
  return new Set(["Medicare", "Marketplace"]);
}
