import { eq } from "drizzle-orm";
import {
  appointmentLine,
  DEFAULT_TENANT_ID,
  writesDealLine,
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
import { matchFloodShopCarriers } from "./javy-flood-shop-list";
import { matchCarrier, rankFits, riskFromRecord, type CarrierMatch } from "./match";
import { evaluateShopFits, type ShopFit } from "./shop-fits";
import { isMatchPriorResult } from "@/lib/quoting/forms";
import { priorDeclineScope } from "@/lib/quotes/decline-scope";
import { hasMarketLookupInput, sheetHasMarketFacts } from "@/lib/deals/manual-markets";

type SheetValues = Record<string, { value?: string | null } | null> | null;

/** Permissive Flood stub — first-wave list until real Flood appetite_rules exist. */
function floodFirstWaveRule(
  carrier: {
    id: string;
    name: string;
    portalStatus: string | null;
    dontWriteNotes: string | null;
    appetiteNotes: string | null;
  },
  appointed: boolean | null,
): AppetiteRuleInput {
  return {
    carrierId: carrier.id,
    carrierName: carrier.name,
    lineOfBusiness: "FLOOD",
    minCovA: null,
    maxCovA: null,
    minYearBuilt: null,
    maxRoofAge: null,
    allowedRoofCoverings: null,
    coastalAllowed: true,
    minMilesToCoast: null,
    maxMilesToCoast: null,
    mobileAllowed: true,
    requiresOpeningProtection: false,
    maxStories: null,
    allowedConstruction: null,
    allowedOccupancy: null,
    allowedCounties: null,
    excludedCounties: null,
    countyMinCovA: null,
    requireReplacementCost: false,
    rceFloorRatio: null,
    portalStatus: (carrier.portalStatus ?? "open") as AppetiteRuleInput["portalStatus"],
    dontWriteNotes: carrier.dontWriteNotes,
    writtenLines: ["FLOOD"],
    appointed: appointed ?? true,
    appetiteNotes:
      carrier.appetiteNotes?.trim() ||
      "First-wave Flood market — Neptune / Selective / Tower Hill / Wright.",
  };
}

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

  const [appointments, logs, sheets, deskCarriers] = await Promise.all([
    db
      .select()
      .from(carrierAppointments)
      .where(eq(carrierAppointments.tenantId, DEFAULT_TENANT_ID)),
    db.select().from(quoteAttemptLogs).where(eq(quoteAttemptLogs.tenantId, DEFAULT_TENANT_ID)),
    db
      .select()
      .from(quoteSheets)
      .where(eq(quoteSheets.dealId, risk.dealId)),
    db
      .select({
        id: carriers.id,
        name: carriers.name,
        portalStatus: carriers.portalStatus,
        dontWriteNotes: carriers.dontWriteNotes,
        appetiteNotes: carriers.appetiteNotes,
      })
      .from(carriers)
      .where(eq(carriers.tenantId, DEFAULT_TENANT_ID)),
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
      dealId: log.dealId,
      declineScope: priorDeclineScope(log.why),
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

  const fromRules: AppetiteRuleInput[] = rules.map(({ rule, carrier }) => {
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

  // Flood Markets: gate to Load my Flood list (FIRST_WAVE_FLOOD). Pure flood writers
  // often have no appetite_rules row, so HO carriers with a mistaken FLOOD tag used to win.
  const inputs: AppetiteRuleInput[] =
    dealLine === "FLOOD"
      ? matchFloodShopCarriers(deskCarriers).map((carrier) => {
          const appointment = appointments.find(
            (row) => row.carrierId === carrier.id && row.writtenLine === "FLOOD",
          );
          return floodFirstWaveRule(carrier, appointment ? appointment.appointed : true);
        })
      : fromRules;

  if (appointments.length || sheet) {
    return evaluateShopFits({
      risk: riskFromRecord(risk),
      dealLine,
      rules: inputs,
      prior,
      sheetValues: sheet,
      dealId: risk.dealId,
    }).matches;
  }

  return rankFits(
    inputs
      .filter((rule) => writesDealLine(rule.writtenLines ?? [], dealLine))
      .map((rule) => matchCarrier(riskFromRecord(risk), rule, prior, undefined, dealLine, risk.dealId)),
  ) as ShopFit[];
}
