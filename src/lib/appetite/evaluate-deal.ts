import { eq } from "drizzle-orm";
import {
  appointmentLine,
  DEFAULT_TENANT_ID,
  type AppetiteRuleInput,
  type PriorAttempt,
} from "@/lib/domain";
import { db } from "@/lib/db";
import {
  appetiteRules,
  carrierAppointments,
  carriers,
  quoteAttemptLogs,
  quoteSheets,
  type Risk,
} from "@/lib/db/schema";
import { matchCarrier, rankFits, riskFromRecord, type CarrierMatch } from "./match";
import { evaluateShopFits, type ShopFit } from "./shop-fits";
import { isMatchPriorResult } from "@/lib/quoting/forms";
import { hasMarketLookupInput, sheetHasMarketFacts } from "@/lib/deals/manual-markets";

type SheetValues = Record<string, { value?: string | null } | null> | null;

/** Markets matcher (legacy appetite_rules). Portal skip-decline lives in shopDealQuotes + quote-gate. */
export async function evaluateDealMarkets(
  risk: Risk,
  sheetValues?: SheetValues,
  dealLine?: string | null,
): Promise<CarrierMatch[]> {
  if (sheetValues !== undefined && !sheetHasMarketFacts(sheetValues)) {
    return [];
  }
  const fits = await evaluateDealShopFits(risk, sheetValues, dealLine);
  return fits;
}

export async function evaluateDealShopFits(
  risk: Risk,
  sheetValues?: SheetValues,
  dealLineOverride?: string | null,
): Promise<ShopFit[]> {
  const rules = await db
    .select({ rule: appetiteRules, carrier: carriers })
    .from(appetiteRules)
    .innerJoin(carriers, eq(appetiteRules.carrierId, carriers.id))
    .where(eq(appetiteRules.tenantId, DEFAULT_TENANT_ID));

  const [appointments, logs, sheets] = await Promise.all([
    db
      .select()
      .from(carrierAppointments)
      .where(eq(carrierAppointments.tenantId, DEFAULT_TENANT_ID)),
    db.select().from(quoteAttemptLogs).where(eq(quoteAttemptLogs.tenantId, DEFAULT_TENANT_ID)),
    db
      .select()
      .from(quoteSheets)
      .where(eq(quoteSheets.dealId, risk.dealId)),
  ]);

  const prior: PriorAttempt[] = logs
    .filter((log) => isMatchPriorResult(log.result))
    .map((log) => ({
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

  const dealLine = appointmentLine(
    (dealLineOverride ?? (risk.riskType === "auto" ? "AUTO" : "HO")).toUpperCase(),
  );
  const wantedSheet =
    dealLineOverride === "AUTO" || dealLineOverride === "auto"
      ? "auto"
      : dealLineOverride === "FLOOD" || dealLineOverride === "flood"
        ? "flood"
        : risk.riskType === "auto"
          ? "auto"
          : "home";
  const loaded = sheets.find((row) => row.line === wantedSheet) ?? sheets[0];
  const sheet = sheetValues !== undefined ? sheetValues : (loaded?.values ?? null);
  if (!hasMarketLookupInput(risk, sheet) || !sheetHasMarketFacts(sheet)) {
    return [];
  }

  const inputs: AppetiteRuleInput[] = rules.map(({ rule, carrier }) => {
    const appointment = appointments.find(
      (row) => row.carrierId === carrier.id && row.writtenLine === dealLine,
    );
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
      appointed: appointment ? appointment.appointed : true,
      appetiteNotes: rule.notes?.trim() || carrier.appetiteNotes || null,
    };
  });

  if (appointments.length || sheet) {
    return evaluateShopFits({
      risk: riskFromRecord(risk),
      dealLine,
      rules: inputs,
      prior,
      sheetValues: sheet,
    }).matches;
  }

  return rankFits(inputs.map((rule) => matchCarrier(riskFromRecord(risk), rule, prior))) as ShopFit[];
}
