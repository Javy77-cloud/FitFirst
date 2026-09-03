"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { matchCarrier, rankFits, riskFromRecord } from "@/lib/appetite/match";
import { toAppetiteInput } from "@/lib/appetite/rule-input";
import { portalFor } from "@/lib/appetite/portals";
import { appointmentLine, DEFAULT_TENANT_ID, type PriorAttempt } from "@/lib/domain";
import { db } from "@/lib/db";
import { appointedByCarrierLine } from "@/lib/db/queries";
import {
  appetiteRules,
  carriers,
  deals,
  quoteAttemptLogs,
  quotes,
  risks,
} from "@/lib/db/schema";

export async function shopInAppetiteAction(formData: FormData) {
  await shopInAppetite(String(formData.get("dealId") ?? ""));
}

export async function shopInAppetite(dealId: string) {
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, dealId));
  if (!deal || !risk) throw new Error("Deal or master risk is missing");

  const rules = await db
    .select({ rule: appetiteRules, carrier: carriers })
    .from(appetiteRules)
    .innerJoin(carriers, eq(appetiteRules.carrierId, carriers.id))
    .where(eq(appetiteRules.tenantId, DEFAULT_TENANT_ID));

  const logs = await db
    .select()
    .from(quoteAttemptLogs)
    .where(eq(quoteAttemptLogs.tenantId, DEFAULT_TENANT_ID));

  const snapshot = riskFromRecord(risk);
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

  const matches = rankFits(
    rules.map(({ rule, carrier }) => {
      const line = appointmentLine(rule.lineOfBusiness);
      const key = `${carrier.id}:${line}`;
      const appointed = appointedMap.has(key) ? appointedMap.get(key)! : null;
      return matchCarrier(snapshot, toAppetiteInput(carrier, rule, appointed), prior);
    }),
  );

  await db.delete(quotes).where(eq(quotes.dealId, dealId));

  for (const match of matches.filter((m) => m.band === "green")) {
    const portal = portalFor(match.carrierId, match.carrierName);
    const portalResult = await portal.submitQuote({
      carrierId: match.carrierId,
      dealId,
      riskId: risk.id,
    });
    const premium = risk.coverageA ? Math.round(risk.coverageA * 0.0165) : null;
    await db.insert(quotes).values({
      tenantId: DEFAULT_TENANT_ID,
      dealId,
      riskId: risk.id,
      carrierId: match.carrierId,
      quoteNumber: `STUB-${match.carrierName.slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-5)}`,
      premium,
      hurricaneDeductible: "2%",
      aopDeductible: "$2,500",
      coverageA: risk.coverageA,
      bindable: true,
      coverageGaps: risk.openingProtection === "none" ? ["No opening protection credit"] : [],
      notes: `${portalResult.message} Ranked fit score ${match.fitScore}.`,
      stub: true,
    });
  }

  await db
    .update(deals)
    .set({ pipelineStage: "quoting", updatedAt: new Date() })
    .where(eq(deals.id, dealId));

  revalidatePath(`/deals/${dealId}`);
  return matches;
}

export async function recordManualAttempt(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "");
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, dealId));
  if (!risk) throw new Error("Master risk missing");

  await db.insert(quoteAttemptLogs).values({
    tenantId: DEFAULT_TENANT_ID,
    dealId,
    riskId: risk.id,
    carrierId: String(formData.get("carrierId") ?? ""),
    lineOfBusiness: String(formData.get("line") ?? "HO"),
    result: String(formData.get("result") ?? "declined"),
    bindable: formData.get("bindable") === "true",
    quoteNumber: String(formData.get("quoteNumber") ?? "") || null,
    premium: Number(formData.get("premium") || 0) || null,
    covATried: risk.coverageA,
    why: String(formData.get("why") ?? "") || null,
    snapYearBuilt: risk.yearBuilt,
    snapRoofYear: risk.roofYear,
    snapRoofCovering: risk.roofCovering,
    snapConstruction: risk.construction,
    snapOpeningProtection: risk.openingProtection,
    snapOccupancy: risk.occupancy,
    snapStories: risk.stories,
    snapPool: risk.pool,
    snapProtectionClass: risk.protectionClass,
    snapMilesToCoast: risk.milesToCoast,
    snapCity: risk.city,
    snapCounty: risk.county,
    snapCoverageA: risk.coverageA,
  });

  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/logs");
}
