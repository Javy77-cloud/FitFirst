import { eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID, type AppetiteRuleInput, type PriorAttempt } from "@/lib/domain";
import { db } from "@/lib/db";
import { appetiteRules, carriers, quoteAttemptLogs } from "@/lib/db/schema";
import { matchCarrier, rankFits, riskFromRecord, type CarrierMatch } from "./match";
import type { Risk } from "@/lib/db/schema";

export async function evaluateDealMarkets(risk: Risk): Promise<CarrierMatch[]> {
  const rules = await db
    .select({ rule: appetiteRules, carrier: carriers })
    .from(appetiteRules)
    .innerJoin(carriers, eq(appetiteRules.carrierId, carriers.id))
    .where(eq(appetiteRules.tenantId, DEFAULT_TENANT_ID));

  const logs = await db
    .select()
    .from(quoteAttemptLogs)
    .where(eq(quoteAttemptLogs.tenantId, DEFAULT_TENANT_ID));

  const prior: PriorAttempt[] = logs.map((log) => ({
    carrierId: log.carrierId,
    result: log.result as PriorAttempt["result"],
    why: log.why,
    bindable: log.bindable,
    snapYearBuilt: log.snapYearBuilt,
    snapRoofYear: log.snapRoofYear,
    snapRoofCovering: log.snapRoofCovering,
    snapConstruction: log.snapConstruction,
    snapCounty: log.snapCounty,
    snapMilesToCoast: log.snapMilesToCoast,
    snapCoverageA: log.snapCoverageA,
  }));

  return rankFits(
    rules.map(({ rule, carrier }) =>
      matchCarrier(
        riskFromRecord(risk),
        {
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
        },
        prior,
      ),
    ),
  );
}
