import { and, desc, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  appetiteGatePrefs,
  appetiteQuoteDecisions,
  appetiteStateRules,
  carrierAppetite,
  type AppetiteStateRuleRow,
  type CarrierAppetite,
} from "@/lib/db/schema";
import { slugFromCarrierName } from "./identity";
import { runQuoteGate, skipDeclineCarrierIds } from "./gate";
import { quoteDecisionInserts } from "./state-learning";
import type { AppetiteStateRule } from "./state-rules";
import type { AppetiteCarrier, MasterRiskSnapshot, QuoteGateResult } from "./types";

export function rowToStateRule(row: AppetiteStateRuleRow): AppetiteStateRule {
  return {
    carrierId: row.carrierId,
    state: row.state,
    lines: row.lines ?? [],
    catPosture: row.catPosture,
    hardDeclines: row.hardDeclines ?? [],
    softCautions: row.softCautions ?? [],
    preferredSignals: row.preferredSignals ?? [],
    notes: row.notes,
    researchDated: row.researchDated,
  };
}

export function rowToAppetiteCarrier(row: CarrierAppetite): AppetiteCarrier {
  return {
    carrierId: row.carrierId,
    legalName: row.legalName,
    segment: row.segment,
    linesOffered: row.linesOffered ?? [],
    linesNotOffered: row.linesNotOffered ?? [],
    statesAvailable: row.statesAvailable ?? [],
    statesRestricted: row.statesRestricted ?? [],
    statesRaw: row.statesRaw ?? [],
    portalName: row.portalName,
    csPhone: row.csPhone,
    claimsPhone: row.claimsPhone,
    rateable: row.rateable,
    hardDeclines: row.hardDeclines ?? [],
    softCautions: row.softCautions ?? [],
    preferredSignals: row.preferredSignals ?? [],
    catPosture: row.catPosture,
    notesForAgent: row.notesForAgent,
    quotePriority: row.quotePriority,
    flHoOrder: row.flHoOrder,
    needsStateConfirm: row.needsStateConfirm,
    linkedCarrierId: row.linkedCarrierId,
  };
}

export async function loadAppetiteGatePrefs(tenantId = DEFAULT_TENANT_ID) {
  const [row] = await db
    .select()
    .from(appetiteGatePrefs)
    .where(eq(appetiteGatePrefs.tenantId, tenantId))
    .limit(1);
  return row ?? null;
}

/** Admin-editable catalog used by the quote-gate. */
export async function loadRateableAppetite(tenantId = DEFAULT_TENANT_ID): Promise<AppetiteCarrier[]> {
  const rows = await db
    .select()
    .from(carrierAppetite)
    .where(and(eq(carrierAppetite.tenantId, tenantId), eq(carrierAppetite.rateable, true)));
  return rows.map(rowToAppetiteCarrier);
}

export async function loadAllAppetite(tenantId = DEFAULT_TENANT_ID): Promise<AppetiteCarrier[]> {
  const rows = await db.select().from(carrierAppetite).where(eq(carrierAppetite.tenantId, tenantId));
  return rows.map(rowToAppetiteCarrier);
}

export async function loadAppetiteStateRules(tenantId = DEFAULT_TENANT_ID): Promise<AppetiteStateRule[]> {
  const rows = await db.select().from(appetiteStateRules).where(eq(appetiteStateRules.tenantId, tenantId));
  return rows.map(rowToStateRule);
}

export async function upsertAppetiteCarriers(
  records: AppetiteCarrier[],
  tenantId = DEFAULT_TENANT_ID,
): Promise<{ upserted: number }> {
  for (const rec of records) {
    await db
      .insert(carrierAppetite)
      .values({
        tenantId,
        carrierId: rec.carrierId,
        legalName: rec.legalName,
        segment: rec.segment,
        linesOffered: rec.linesOffered,
        linesNotOffered: rec.linesNotOffered,
        statesAvailable: rec.statesAvailable,
        statesRestricted: rec.statesRestricted,
        statesRaw: rec.statesRaw,
        portalName: rec.portalName,
        csPhone: rec.csPhone,
        claimsPhone: rec.claimsPhone,
        rateable: rec.rateable,
        hardDeclines: rec.hardDeclines,
        softCautions: rec.softCautions,
        preferredSignals: rec.preferredSignals,
        catPosture: rec.catPosture,
        notesForAgent: rec.notesForAgent,
        quotePriority: rec.quotePriority,
        flHoOrder: rec.flHoOrder,
        needsStateConfirm: rec.needsStateConfirm,
        linkedCarrierId: rec.linkedCarrierId ?? null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [carrierAppetite.tenantId, carrierAppetite.carrierId],
        set: {
          legalName: rec.legalName,
          segment: rec.segment,
          linesOffered: rec.linesOffered,
          linesNotOffered: rec.linesNotOffered,
          statesAvailable: rec.statesAvailable,
          statesRestricted: rec.statesRestricted,
          statesRaw: rec.statesRaw,
          portalName: rec.portalName,
          csPhone: rec.csPhone,
          claimsPhone: rec.claimsPhone,
          rateable: rec.rateable,
          hardDeclines: rec.hardDeclines,
          softCautions: rec.softCautions,
          preferredSignals: rec.preferredSignals,
          catPosture: rec.catPosture,
          notesForAgent: rec.notesForAgent,
          quotePriority: rec.quotePriority,
          flHoOrder: rec.flHoOrder,
          needsStateConfirm: rec.needsStateConfirm,
          updatedAt: new Date(),
        },
      });
  }
  return { upserted: records.length };
}

export async function upsertAppetiteStateRules(
  records: AppetiteStateRule[],
  tenantId = DEFAULT_TENANT_ID,
): Promise<{ upserted: number }> {
  for (const rec of records) {
    await db
      .insert(appetiteStateRules)
      .values({
        tenantId,
        carrierId: rec.carrierId,
        state: rec.state,
        lines: rec.lines,
        catPosture: rec.catPosture,
        hardDeclines: rec.hardDeclines,
        softCautions: rec.softCautions,
        preferredSignals: rec.preferredSignals,
        notes: rec.notes,
        researchDated: rec.researchDated,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [appetiteStateRules.tenantId, appetiteStateRules.carrierId, appetiteStateRules.state],
        set: {
          lines: rec.lines,
          catPosture: rec.catPosture,
          hardDeclines: rec.hardDeclines,
          softCautions: rec.softCautions,
          preferredSignals: rec.preferredSignals,
          notes: rec.notes,
          researchDated: rec.researchDated,
          updatedAt: new Date(),
        },
      });
  }
  return { upserted: records.length };
}

export async function updateAppetiteRules(input: {
  carrierId: string;
  hardDeclines?: string[];
  softCautions?: string[];
  preferredSignals?: string[];
  flHoOrder?: number | null;
  quotePriority?: number | null;
  notesForAgent?: string | null;
  tenantId?: string;
}): Promise<void> {
  const tenantId = input.tenantId ?? DEFAULT_TENANT_ID;
  const patch: Partial<typeof carrierAppetite.$inferInsert> = { updatedAt: new Date() };
  if (input.hardDeclines !== undefined) patch.hardDeclines = input.hardDeclines;
  if (input.softCautions !== undefined) patch.softCautions = input.softCautions;
  if (input.preferredSignals !== undefined) patch.preferredSignals = input.preferredSignals;
  if (input.flHoOrder !== undefined) {
    patch.flHoOrder = input.flHoOrder;
    patch.quotePriority = input.quotePriority ?? input.flHoOrder;
  } else if (input.quotePriority !== undefined) {
    patch.quotePriority = input.quotePriority;
  }
  if (input.notesForAgent !== undefined) patch.notesForAgent = input.notesForAgent;

  await db
    .update(carrierAppetite)
    .set(patch)
    .where(and(eq(carrierAppetite.tenantId, tenantId), eq(carrierAppetite.carrierId, input.carrierId)));
}

export async function saveAppetiteFlHoOrder(
  slugs: string[],
  tenantId = DEFAULT_TENANT_ID,
  citizensWithinPct?: number,
): Promise<void> {
  const [existing] = await db
    .select({ id: appetiteGatePrefs.id })
    .from(appetiteGatePrefs)
    .where(eq(appetiteGatePrefs.tenantId, tenantId))
    .limit(1);
  const patch = {
    flHoOrder: slugs,
    ...(citizensWithinPct != null ? { citizensWithinPct } : {}),
    updatedAt: new Date(),
  };
  if (existing) {
    await db.update(appetiteGatePrefs).set(patch).where(eq(appetiteGatePrefs.id, existing.id));
    return;
  }
  await db.insert(appetiteGatePrefs).values({ tenantId, ...patch });
}

export async function persistQuoteGateDecisions(input: {
  result: QuoteGateResult;
  dealId?: string | null;
  riskId?: string | null;
  masterId?: string | null;
  riskState?: string | null;
  riskLine?: string | null;
  snapshot?: MasterRiskSnapshot | null;
  tenantId?: string;
}): Promise<void> {
  const tenantId = input.tenantId ?? DEFAULT_TENANT_ID;
  const rows = quoteDecisionInserts({
    result: input.result,
    tenantId,
    snapshot: input.snapshot ?? null,
    dealId: input.dealId,
    riskId: input.riskId,
    masterId: input.masterId,
    riskState: input.riskState,
    riskLine: input.riskLine,
  });
  if (rows.length === 0) return;
  await db.insert(appetiteQuoteDecisions).values(rows);
}

export async function listQuoteGateDecisions(dealId: string, tenantId = DEFAULT_TENANT_ID) {
  return db
    .select()
    .from(appetiteQuoteDecisions)
    .where(and(eq(appetiteQuoteDecisions.tenantId, tenantId), eq(appetiteQuoteDecisions.dealId, dealId)))
    .orderBy(desc(appetiteQuoteDecisions.createdAt));
}

export async function runQuoteGateFromStore(
  snapshot: MasterRiskSnapshot,
  tenantId = DEFAULT_TENANT_ID,
): Promise<QuoteGateResult | null> {
  const carriers = await loadRateableAppetite(tenantId);
  if (carriers.length === 0) return null;
  const [prefs, stateRules] = await Promise.all([
    loadAppetiteGatePrefs(tenantId),
    loadAppetiteStateRules(tenantId),
  ]);
  return runQuoteGate(snapshot, carriers, {
    flHoOrder: prefs?.flHoOrder ?? null,
    stateRules,
  });
}

export type QuoteGateShopFilter = {
  result: QuoteGateResult;
  skipSlugs: string[];
  skipLinkedCarrierIds: string[];
};

/** Run gate + persist log. Used by the quote path before any portal opens. */
export async function runAndPersistQuoteGate(input: {
  snapshot: MasterRiskSnapshot;
  tenantId?: string;
  uuidToName?: Map<string, string>;
}): Promise<QuoteGateShopFilter | null> {
  const tenantId = input.tenantId ?? DEFAULT_TENANT_ID;
  const result = await runQuoteGateFromStore(input.snapshot, tenantId);
  if (!result) return null;

  await persistQuoteGateDecisions({
    result,
    snapshot: input.snapshot,
    dealId: input.snapshot.dealId,
    riskId: input.snapshot.riskId,
    masterId: input.snapshot.masterId,
    tenantId,
  });

  const skipSlugs = skipDeclineCarrierIds(result);
  const skipSet = new Set(skipSlugs);
  const skipLinkedCarrierIds: string[] = [];
  const catalog = await loadRateableAppetite(tenantId);
  for (const row of catalog) {
    if (row.linkedCarrierId && skipSet.has(row.carrierId)) {
      skipLinkedCarrierIds.push(row.linkedCarrierId);
    }
  }
  if (input.uuidToName) {
    for (const [uuid, name] of input.uuidToName) {
      const slug = slugFromCarrierName(name);
      if (slug && skipSet.has(slug)) skipLinkedCarrierIds.push(uuid);
    }
  }

  return { result, skipSlugs, skipLinkedCarrierIds };
}
