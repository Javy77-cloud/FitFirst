import { eq } from "drizzle-orm";
import { appointmentLine, DEFAULT_TENANT_ID, type PriorAttempt } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  appetiteRules,
  carrierAppointments,
  carriers,
  quoteAttemptLogs,
  quoteSheets,
} from "@/lib/db/schema";
import { matchCarrier, rankFits, riskFromRecord, type CarrierMatch } from "./match";
import { evaluateShopFits, type ShopFit } from "./shop-fits";
import { appointmentLine } from "@/lib/domain";
import type { Risk } from "@/lib/db/schema";

export async function evaluateDealMarkets(risk: Risk): Promise<CarrierMatch[]> {
  const fits = await evaluateDealShopFits(risk);
  return fits;
}

export async function evaluateDealShopFits(risk: Risk): Promise<ShopFit[]> {
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

  const appointedMap = await appointedByCarrierLine();

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

  const dealLine = appointmentLine(risk.riskType === "auto" ? "AUTO" : "HO");
  const sheet = sheets[0]?.values ?? null;

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
