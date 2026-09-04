/**
 * Lead-offer contract for the home bulletin.
 *
 * Home bot owns the bulletin UI. This module owns:
 *   - create Lead from social / inbound
 *   - in-app notify the assigned agent
 *   - Admin award / assign of unassigned inbound
 *
 * Import `listOpenLeadOffers` / `awardLeadToAgent` / `ingestSocialLead`.
 */
import { and, desc, eq } from "drizzle-orm";
import { findOrCreateLead } from "@/app/actions/crm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { alerts, leads, socialLeadOffers, users } from "@/lib/db/schema";
import { formatPersonName } from "@/lib/crm/display";
import { isSocialPlatformId } from "@/lib/social/platforms";
import { inboundAssignment, type InboundAssignment } from "./routing";

export { connectionOwnerFor, inboundAssignment, isInboundSocialSource } from "./routing";
export type { InboundAssignment } from "./routing";

export const LEAD_OFFER_STATUSES = ["open", "awarded"] as const;
export type LeadOfferStatus = (typeof LEAD_OFFER_STATUSES)[number];

export type SocialLeadIdentity = {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  middleName?: string | null;
  mailingAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  dateOfBirth?: string | null;
  insuranceTypeDesired?: string | null;
  preferredLanguage?: string | null;
  notes?: string | null;
  source: string;
  platform?: string | null;
};

export type LeadOfferBulletinRow = {
  id: string;
  leadId: string;
  source: string;
  platform: string | null;
  status: LeadOfferStatus;
  ownerUserId: string | null;
  leadName: string;
  leadEmail: string | null;
  leadPhone: string | null;
  createdAt: Date;
};


export async function notifyAgentOfLead(input: {
  leadId: string;
  userId: string;
  title: string;
  body: string;
}): Promise<string> {
  const [row] = await db
    .insert(alerts)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      kind: "social_lead",
      title: input.title,
      body: input.body,
      severity: "info",
      entityType: "lead",
      entityId: input.leadId,
      userId: input.userId,
    })
    .returning({ id: alerts.id });
  return row?.id ?? "";
}

async function notifyUnassignedLead(input: { leadId: string; title: string; body: string }): Promise<string> {
  const [row] = await db
    .insert(alerts)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      kind: "social_lead_unassigned",
      title: input.title,
      body: input.body,
      severity: "info",
      entityType: "lead",
      entityId: input.leadId,
      userId: null,
    })
    .returning({ id: alerts.id });
  return row?.id ?? "";
}

async function upsertOffer(input: {
  leadId: string;
  source: string;
  platform: string | null;
  status: LeadOfferStatus;
  ownerUserId: string | null;
  awardedByUserId?: string | null;
  alertId?: string | null;
  notes?: string | null;
}) {
  const [existing] = await db
    .select()
    .from(socialLeadOffers)
    .where(and(eq(socialLeadOffers.tenantId, DEFAULT_TENANT_ID), eq(socialLeadOffers.leadId, input.leadId)));
  const now = new Date();
  const patch = {
    source: input.source,
    platform: input.platform,
    status: input.status,
    ownerUserId: input.ownerUserId,
    awardedByUserId: input.awardedByUserId ?? existing?.awardedByUserId ?? null,
    awardedAt: input.status === "awarded" ? (existing?.awardedAt ?? now) : null,
    alertId: input.alertId ?? existing?.alertId ?? null,
    notes: input.notes ?? existing?.notes ?? null,
    updatedAt: now,
  };
  if (existing) {
    const [row] = await db
      .update(socialLeadOffers)
      .set(patch)
      .where(eq(socialLeadOffers.id, existing.id))
      .returning();
    return row;
  }
  const [row] = await db
    .insert(socialLeadOffers)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      leadId: input.leadId,
      ...patch,
    })
    .returning();
  return row;
}

export async function ingestSocialLead(input: SocialLeadIdentity & {
  connectionOwnerUserId: string | null;
}): Promise<{
  lead: typeof leads.$inferSelect;
  created: boolean;
  assignment: InboundAssignment;
  notifiedUserId: string | null;
  offerId: string | null;
}> {
  const { assignment, ownerUserId } = inboundAssignment(input.connectionOwnerUserId);
  const platform = input.platform && isSocialPlatformId(input.platform) ? input.platform : null;
  const source = input.source || (platform as string) || "social";
  const { lead, created } = await findOrCreateLead({
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone,
    middleName: input.middleName,
    mailingAddress: input.mailingAddress,
    city: input.city,
    state: input.state,
    zip: input.zip,
    dateOfBirth: input.dateOfBirth,
    insuranceTypeDesired: input.insuranceTypeDesired,
    preferredLanguage: input.preferredLanguage,
    notes: input.notes,
    source,
  });

  const shouldOwn = created || !lead.ownerId;
  if (shouldOwn && lead.ownerId !== ownerUserId) {
    await db
      .update(leads)
      .set({ ownerId: ownerUserId, source, updatedAt: new Date() })
      .where(eq(leads.id, lead.id));
    lead.ownerId = ownerUserId;
    lead.source = source;
  }

  const name = formatPersonName(lead);
  const platformLabel = platform ?? source;
  let notifiedUserId: string | null = null;
  let alertId: string | null = null;

  if (created) {
    if (assignment === "agent" && ownerUserId) {
      alertId = await notifyAgentOfLead({
        leadId: lead.id,
        userId: ownerUserId,
        title: `Social lead · ${name}`,
        body: `${platformLabel} inquiry landed on your connected account. Open the Lead — no live vendor sync.`,
      });
      notifiedUserId = ownerUserId;
    } else {
      alertId = await notifyUnassignedLead({
        leadId: lead.id,
        title: `Unassigned social lead · ${name}`,
        body: `Agency ${platformLabel} inbound. Admin can award this Lead to any agent.`,
      });
    }
  }

  const offer = await upsertOffer({
    leadId: lead.id,
    source,
    platform,
    status: assignment === "agent" && ownerUserId ? "awarded" : "open",
    ownerUserId,
    alertId,
    notes: input.notes ?? null,
  });

  return {
    lead,
    created,
    assignment,
    notifiedUserId,
    offerId: offer?.id ?? null,
  };
}

export async function awardLeadToAgent(input: {
  leadId: string;
  agentId: string;
  awardedByUserId: string;
}): Promise<{ ok: true; leadId: string; ownerUserId: string } | { ok: false; reason: string }> {
  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), eq(leads.id, input.leadId)));
  if (!lead) return { ok: false, reason: "Lead not found." };

  const [agent] = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, DEFAULT_TENANT_ID), eq(users.id, input.agentId)));
  if (!agent || agent.role !== "agent") return { ok: false, reason: "Pick an agent." };

  await db
    .update(leads)
    .set({ ownerId: agent.id, updatedAt: new Date() })
    .where(eq(leads.id, lead.id));

  const name = formatPersonName(lead);
  const alertId = await notifyAgentOfLead({
    leadId: lead.id,
    userId: agent.id,
    title: `Lead awarded · ${name}`,
    body: `Admin awarded this ${lead.source ?? "inbound"} Lead to you.`,
  });

  await upsertOffer({
    leadId: lead.id,
    source: lead.source ?? "social",
    platform: lead.source && isSocialPlatformId(lead.source) ? lead.source : null,
    status: "awarded",
    ownerUserId: agent.id,
    awardedByUserId: input.awardedByUserId,
    alertId,
    notes: lead.notes,
  });

  return { ok: true, leadId: lead.id, ownerUserId: agent.id };
}

/** Bulletin feed. Home bot renders this; do not invent a second board here. */
export async function listOpenLeadOffers(): Promise<LeadOfferBulletinRow[]> {
  const rows = await db
    .select({
      offer: socialLeadOffers,
      lead: leads,
    })
    .from(socialLeadOffers)
    .innerJoin(leads, eq(socialLeadOffers.leadId, leads.id))
    .where(and(eq(socialLeadOffers.tenantId, DEFAULT_TENANT_ID), eq(socialLeadOffers.status, "open")))
    .orderBy(desc(socialLeadOffers.createdAt));

  return rows.map(({ offer, lead }) => ({
    id: offer.id,
    leadId: lead.id,
    source: offer.source,
    platform: offer.platform,
    status: offer.status === "awarded" ? "awarded" : "open",
    ownerUserId: offer.ownerUserId,
    leadName: formatPersonName(lead),
    leadEmail: lead.email,
    leadPhone: lead.phone,
    createdAt: offer.createdAt,
  }));
}

export async function listAwardableAgents() {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(and(eq(users.tenantId, DEFAULT_TENANT_ID), eq(users.role, "agent")))
    .orderBy(users.name);
}

