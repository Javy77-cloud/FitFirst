import { and, desc, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  alerts,
  deals,
  leadOffers,
  leadRoutingLogs,
  leadRoutingRules,
  leads,
  offices,
  territories,
  territoryOffices,
  userOffices,
  userTerritories,
  users,
} from "@/lib/db/schema";
import { ADMIN_USER_ID } from "@/lib/fixtures/ids";
import {
  countOpenDealsByOwner,
  routeLead,
  type RoutingProducer,
  type RoutingRule,
  type RoutingTerritory,
} from "./auto-route";

export type ApplyRoutingResult = {
  leadId: string;
  outcome: "assigned" | "unassigned";
  ownerId: string | null;
  offerId: string | null;
  reason: string;
};

function toRule(row: typeof leadRoutingRules.$inferSelect): RoutingRule {
  return {
    id: row.id,
    name: row.name,
    enabled: row.enabled,
    sortOrder: row.sortOrder,
    territoryId: row.territoryId,
    writtenLine: row.writtenLine,
    maxOpenDeals: row.maxOpenDeals,
    producerId: row.producerId,
  };
}

export async function loadRoutingContext() {
  const [
    ruleRows,
    userRows,
    dealRows,
    territoryRows,
    officeMemberships,
    territoryMemberships,
    territoryOfficeLinks,
  ] = await Promise.all([
    db
      .select()
      .from(leadRoutingRules)
      .where(eq(leadRoutingRules.tenantId, DEFAULT_TENANT_ID))
      .orderBy(leadRoutingRules.sortOrder),
    db.select().from(users).where(eq(users.tenantId, DEFAULT_TENANT_ID)),
    db
      .select({ ownerId: deals.ownerId, pipelineStage: deals.pipelineStage })
      .from(deals)
      .where(eq(deals.tenantId, DEFAULT_TENANT_ID)),
    db.select().from(territories).where(eq(territories.tenantId, DEFAULT_TENANT_ID)),
    db
      .select({ userId: userOffices.userId, officeId: userOffices.officeId })
      .from(userOffices)
      .where(eq(userOffices.tenantId, DEFAULT_TENANT_ID)),
    db
      .select({ userId: userTerritories.userId, territoryId: userTerritories.territoryId })
      .from(userTerritories)
      .where(eq(userTerritories.tenantId, DEFAULT_TENANT_ID)),
    db
      .select({ territoryId: territoryOffices.territoryId, officeId: territoryOffices.officeId })
      .from(territoryOffices)
      .where(eq(territoryOffices.tenantId, DEFAULT_TENANT_ID)),
  ]);

  const openCounts = countOpenDealsByOwner(dealRows);
  const producers: RoutingProducer[] = userRows.map((user) => ({
    id: user.id,
    name: user.name,
    role: user.role,
    active: user.active,
    accessStatus: user.accessStatus,
    openDealCount: openCounts.get(user.id) ?? 0,
  }));
  const catalog: RoutingTerritory[] = territoryRows.map((row) => ({
    id: row.id,
    name: row.name,
    states: row.states ?? [],
    counties: row.counties ?? [],
    geoLabel: row.geoLabel,
  }));

  return {
    rules: ruleRows.map(toRule),
    producers,
    territories: catalog,
    officeMemberships,
    territoryMemberships,
    territoryOfficeLinks,
    offices: await db.select().from(offices).where(eq(offices.tenantId, DEFAULT_TENANT_ID)),
  };
}

async function postUnassignedOffer(input: {
  leadId: string;
  firstName: string;
  lastName: string;
  state: string | null;
  line: string | null;
  reason: string;
}): Promise<string | null> {
  const [existing] = await db
    .select({ id: leadOffers.id })
    .from(leadOffers)
    .where(
      and(
        eq(leadOffers.tenantId, DEFAULT_TENANT_ID),
        eq(leadOffers.leadId, input.leadId),
        eq(leadOffers.status, "open"),
      ),
    )
    .limit(1);
  if (existing) return existing.id;

  const name = `${input.firstName} ${input.lastName}`.trim();
  const [offer] = await db
    .insert(leadOffers)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      title: `Unassigned · ${name}`,
      details: input.reason,
      kind: "unassigned",
      state: input.state,
      leadId: input.leadId,
      postedBy: ADMIN_USER_ID,
      status: "open",
    })
    .returning({ id: leadOffers.id });
  return offer?.id ?? null;
}

export async function applyLeadRouting(leadId: string): Promise<ApplyRoutingResult | null> {
  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), eq(leads.id, leadId)));
  if (!lead) return null;

  const ctx = await loadRoutingContext();
  const decision = routeLead({
    lead: {
      state: lead.state,
      city: lead.city,
      insuranceTypeDesired: lead.insuranceTypeDesired,
    },
    rules: ctx.rules,
    producers: ctx.producers,
    territories: ctx.territories,
    officeMemberships: ctx.officeMemberships,
    territoryMemberships: ctx.territoryMemberships,
    territoryOfficeLinks: ctx.territoryOfficeLinks,
  });

  const now = new Date();
  let offerId: string | null = null;

  if (decision.outcome === "assigned" && decision.producerId) {
    await db
      .update(leads)
      .set({ ownerId: decision.producerId, updatedAt: now })
      .where(eq(leads.id, lead.id));
    await db.insert(alerts).values({
      tenantId: DEFAULT_TENANT_ID,
      kind: "lead_routed",
      title: `Lead routed · ${lead.firstName} ${lead.lastName}`,
      body: decision.reason,
      severity: "info",
      entityType: "lead",
      entityId: lead.id,
      userId: decision.producerId,
    });
  } else {
    offerId = await postUnassignedOffer({
      leadId: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      state: lead.state,
      line: lead.insuranceTypeDesired,
      reason: decision.reason,
    });
    await db.insert(alerts).values({
      tenantId: DEFAULT_TENANT_ID,
      kind: "lead_unassigned",
      title: `Unassigned lead · ${lead.firstName} ${lead.lastName}`,
      body: decision.reason,
      severity: "info",
      entityType: "lead",
      entityId: lead.id,
      userId: null,
    });
  }

  await db.insert(leadRoutingLogs).values({
    tenantId: DEFAULT_TENANT_ID,
    leadId: lead.id,
    ruleId: decision.ruleId,
    producerId: decision.producerId,
    outcome: decision.outcome,
    reason: decision.reason,
  });

  return {
    leadId: lead.id,
    outcome: decision.outcome,
    ownerId: decision.producerId,
    offerId,
    reason: decision.reason,
  };
}

export async function latestRoutingLog(leadId: string) {
  const [row] = await db
    .select()
    .from(leadRoutingLogs)
    .where(and(eq(leadRoutingLogs.tenantId, DEFAULT_TENANT_ID), eq(leadRoutingLogs.leadId, leadId)))
    .orderBy(desc(leadRoutingLogs.createdAt))
    .limit(1);
  return row ?? null;
}
