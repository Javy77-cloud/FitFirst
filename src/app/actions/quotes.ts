"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { matchCarrier, rankFits, riskFromRecord } from "@/lib/appetite/match";
import { toAppetiteInput } from "@/lib/appetite/rule-input";
import { portalFor } from "@/lib/appetite/portals";
import { appointmentLine, DEFAULT_TENANT_ID, type PriorAttempt, type ShopLine } from "@/lib/domain";
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
import { applySavedSheetToDeal } from "@/app/actions/quote-sheet";
import { attachFinalizedQuotePdfs } from "@/lib/lifecycle/hooks";
import { isMatchPriorResult, quotingUnlockedForDeal } from "@/lib/quoting/forms";
import {
  EXPLICIT_MARKET_ACTION_MARKER,
  MANUAL_MARKET_MARKER,
  manualCarrierIdsFromLogs,
} from "@/lib/deals/manual-markets";
import { flashAction } from "@/lib/flash-action";

export async function shopInAppetiteAction(formData: FormData) {
  await shopInAppetite(String(formData.get("dealId") ?? ""));
}

export async function requestAppetiteQuotesAction(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "");
  await shopDealQuotes(dealId, "appetite");
  flashAction(`/deals/${dealId}?tab=quotes`, "quotes-requested");
}

export async function requestStretchQuotesAction(formData: FormData) {
  await shopDealQuotes(String(formData.get("dealId") ?? ""), "stretch");
}

export async function shopInAppetite(dealId: string) {
  return shopDealQuotes(dealId, "appetite");
}

export async function shopDealQuotes(dealId: string, pass: "appetite" | "stretch") {
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (deal) {
    const line = (deal.quotingLine || "home") as ShopLine;
    await applySavedSheetToDeal(dealId, line);
  }
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, dealId));
  if (!deal || !risk) throw new Error("Deal or master risk is missing");
  if (!quotingUnlockedForDeal(deal)) {
    throw new Error("Approve the master sheet before shopping markets.");
  }

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

  const matches = rankFits(
    rules.map(({ rule, carrier }) => {
      const line = appointmentLine(rule.lineOfBusiness);
      const key = `${carrier.id}:${line}`;
      const appointed = appointedMap.has(key) ? appointedMap.get(key)! : null;
      return matchCarrier(snapshot, toAppetiteInput(carrier, rule, appointed), prior);
    }),
  );

  const dealLogs = logs.filter((log) => log.dealId === dealId);
  const manualIds = new Set(manualCarrierIdsFromLogs(dealLogs));
  const byId = new Map(matches.map((match) => [match.carrierId, match]));

  const shopIds = new Set<string>();
  if (pass === "appetite") {
    for (const match of matches.filter((row) => row.band === "green")) shopIds.add(match.carrierId);
    for (const id of manualIds) shopIds.add(id);
    await db.delete(quotes).where(eq(quotes.dealId, dealId));
  } else {
    const existing = await db.select().from(quotes).where(eq(quotes.dealId, dealId));
    const already = new Set(existing.map((row) => row.carrierId));
    for (const match of matches.filter((row) => row.band === "yellow")) {
      if (!already.has(match.carrierId)) shopIds.add(match.carrierId);
    }
  }

  const named = await db.select({ id: carriers.id, name: carriers.name }).from(carriers);
  const nameById = new Map(named.map((row) => [row.id, row.name]));

  // Live desk: do not invent stub premiums. Real quotes come from Chrome Fill / portal paste.
  for (const carrierId of shopIds) {
    const match = byId.get(carrierId);
    const carrierName = match?.carrierName ?? nameById.get(carrierId) ?? "Carrier";
    const portal = portalFor(carrierId, carrierName);
    const portalResult = await portal.submitQuote({
      carrierId,
      dealId,
      riskId: risk.id,
    });
    const manual = manualIds.has(carrierId);
    await db.insert(quoteAttemptLogs).values({
      tenantId: DEFAULT_TENANT_ID,
      dealId,
      riskId: risk.id,
      carrierId,
      lineOfBusiness: deal.lineOfBusiness || "HO",
      result: "maybe",
      bindable: false,
      why: `${EXPLICIT_MARKET_ACTION_MARKER} ${pass} shop · ${portalResult.message}${manual ? ` ${MANUAL_MARKET_MARKER}` : ""} · no stub premium (Fill/portal for real quote). Fit ${match?.fitScore ?? "—"}.`,
      snapYearBuilt: risk.yearBuilt,
      snapRoofYear: risk.roofYear,
      snapRoofCovering: risk.roofCovering,
      snapConstruction: risk.construction,
      snapCounty: risk.county,
      snapMilesToCoast: risk.milesToCoast,
      snapCoverageA: risk.coverageA,
    });
  }

  await db
    .update(deals)
    .set({ pipelineStage: "quoting", updatedAt: new Date() })
    .where(eq(deals.id, dealId));

  await attachFinalizedQuotePdfs(dealId);

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
    premium: String(formData.get("premium") ?? "") || null,
    covATried: risk.coverageA,
    why: String(formData.get("why") ?? "") || null,
    lostReason:
      String(formData.get("result") ?? "declined") === "declined"
        ? String(formData.get("lostReason") ?? "").trim() || null
        : null,
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
  revalidatePath("/carriers/logs");
  revalidatePath("/logs");
}

export async function deleteSelectedQuotesAction(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "").trim();
  const ids = formData
    .getAll("quoteId")
    .map((value) => String(value).trim())
    .filter(Boolean);
  if (!dealId) throw new Error("Deal is missing.");
  if (ids.length === 0) throw new Error("Select at least one quote to delete.");

  await db
    .delete(quotes)
    .where(and(eq(quotes.dealId, dealId), inArray(quotes.id, ids), eq(quotes.tenantId, DEFAULT_TENANT_ID)));

  revalidatePath(`/deals/${dealId}`);
  flashAction(
    `/deals/${dealId}?tab=quotes`,
    ids.length === 1 ? "Quote deleted" : `${ids.length} quotes deleted`,
  );
}

