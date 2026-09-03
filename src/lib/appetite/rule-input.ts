import type { AppetiteRuleInput } from "@/lib/domain";
import type { AppetiteRule, Carrier } from "@/lib/db/schema";

export function toAppetiteInput(
  carrier: Pick<Carrier, "id" | "name" | "portalStatus" | "dontWriteNotes" | "writtenLines">,
  rule: AppetiteRule,
  appointed?: boolean | null,
): AppetiteRuleInput {
  return {
    carrierId: carrier.id,
    carrierName: carrier.name,
    lineOfBusiness: rule.lineOfBusiness,
    minCovA: rule.minCovA,
    maxCovA: rule.maxCovA,
    minYearBuilt: rule.minYearBuilt,
    maxRoofAge: rule.maxRoofAge,
    allowedRoofCoverings: rule.allowedRoofCoverings,
    coastalAllowed: rule.coastalAllowed,
    minMilesToCoast: rule.minMilesToCoast,
    maxMilesToCoast: rule.maxMilesToCoast,
    mobileAllowed: rule.mobileAllowed,
    requiresOpeningProtection: rule.requiresOpeningProtection,
    maxStories: rule.maxStories,
    allowedConstruction: rule.allowedConstruction,
    allowedOccupancy: rule.allowedOccupancy,
    allowedCounties: rule.allowedCounties,
    excludedCounties: rule.excludedCounties,
    countyMinCovA: rule.countyMinCovA,
    requireReplacementCost: rule.requireReplacementCost,
    rceFloorRatio: rule.rceFloorRatio,
    portalStatus: carrier.portalStatus as AppetiteRuleInput["portalStatus"],
    dontWriteNotes: carrier.dontWriteNotes,
    writtenLines: carrier.writtenLines,
    appointed: appointed ?? null,
  };
}
