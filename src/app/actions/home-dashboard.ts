"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { requireAdminAction, requireSignedInAction } from "@/lib/auth/guards";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { findMatchingLead } from "@/app/actions/crm";
import {
  agencySettings,
  alerts,
  contests,
  leadOfferClaims,
  leadOffers,
  leads,
  userDashboardPrefs,
  userHomeLayouts,
  users,
} from "@/lib/db/schema";
import {
  parseHomeLayoutId,
  parseHomeLayoutName,
  parseStoredHomeLayout,
  suggestedHomeLayoutName,
} from "@/lib/home/custom-layouts";
import { mergeHomeLayout } from "@/lib/home/layout";
import {
  canAwardOffer,
  canClaimOffer,
  canTakeOwnership,
  parseEmailFrom,
  parseLeadOfferKind,
  parseLeadOfferRelation,
} from "@/lib/home/lead-offers";
import {
  HOME_WIDGET_IDS,
  hiddenForPreset,
  parseBookScope,
  parseDashboardPreset,
  type HomeWidgetId,
} from "@/lib/home/presets";

function refreshHome() {
  revalidatePath("/");
  revalidatePath("/settings/agency");
  revalidatePath("/leads");
  revalidatePath("/alerts");
}

export async function saveHomePreset(formData: FormData) {
  const session = await requireSignedInAction();
  if (!session.userId) return;
  const preset = parseDashboardPreset(String(formData.get("preset") ?? ""));
  await upsertPrefs(session.userId, {
    preset,
    hiddenWidgets: hiddenForPreset(preset),
    activeLayoutId: null,
  });
  refreshHome();
}

export async function saveHomeResizeTiles(formData: FormData) {
  const session = await requireSignedInAction();
  if (!session.userId) return;
  await upsertPrefs(session.userId, { resizeTiles: formData.get("resizeTiles") === "1" });
}

export async function createHomeLayout(formData: FormData) {
  const session = await requireSignedInAction();
  if (!session.userId) return;
  const existing = await listUserLayouts(session.userId);
  const name =
    parseHomeLayoutName(formData.get("name")) ?? suggestedHomeLayoutName(existing);
  const placements = mergeHomeLayout(parseJson(formData.get("placements")));
  const hidden = parseHiddenWidgets(parseJson(formData.get("hiddenWidgets")));
  const [row] = await db
    .insert(userHomeLayouts)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      userId: session.userId,
      name,
      placements,
      hiddenWidgets: hidden,
    })
    .returning({ id: userHomeLayouts.id });
  if (!row) return;
  await upsertPrefs(session.userId, { activeLayoutId: row.id, hiddenWidgets: hidden });
  refreshHome();
}

export async function renameHomeLayout(formData: FormData) {
  const session = await requireSignedInAction();
  if (!session.userId) return;
  const layoutId = parseHomeLayoutId(formData.get("layoutId"));
  const name = parseHomeLayoutName(formData.get("name"));
  if (!layoutId || !name) return;
  const updated = await db
    .update(userHomeLayouts)
    .set({ name, updatedAt: new Date() })
    .where(
      and(
        eq(userHomeLayouts.tenantId, DEFAULT_TENANT_ID),
        eq(userHomeLayouts.userId, session.userId),
        eq(userHomeLayouts.id, layoutId),
      ),
    )
    .returning({ id: userHomeLayouts.id });
  if (!updated[0]) return;
  refreshHome();
}

export async function selectHomeLayout(formData: FormData) {
  const session = await requireSignedInAction();
  if (!session.userId) return;
  const layoutId = parseHomeLayoutId(formData.get("layoutId"));
  if (!layoutId) return;
  const [row] = await db
    .select()
    .from(userHomeLayouts)
    .where(
      and(
        eq(userHomeLayouts.tenantId, DEFAULT_TENANT_ID),
        eq(userHomeLayouts.userId, session.userId),
        eq(userHomeLayouts.id, layoutId),
      ),
    );
  if (!row) return;
  const parsed = parseStoredHomeLayout(row);
  await upsertPrefs(session.userId, {
    activeLayoutId: parsed.id,
    hiddenWidgets: parsed.hiddenWidgets,
  });
  refreshHome();
}

export async function saveHomeTilePlacements(formData: FormData) {
  const session = await requireSignedInAction();
  if (!session.userId) return;
  const layoutId = parseHomeLayoutId(formData.get("layoutId"));
  if (!layoutId) return;
  const placements = mergeHomeLayout(parseJson(formData.get("placements")));
  await db
    .update(userHomeLayouts)
    .set({ placements, updatedAt: new Date() })
    .where(
      and(
        eq(userHomeLayouts.tenantId, DEFAULT_TENANT_ID),
        eq(userHomeLayouts.userId, session.userId),
        eq(userHomeLayouts.id, layoutId),
      ),
    );
}

export async function saveHomeBookScope(formData: FormData) {
  const session = await requireAdminAction();
  if (!session.userId) return;
  const bookScope = parseBookScope(String(formData.get("bookScope") ?? ""));
  await upsertPrefs(session.userId, { bookScope });
  refreshHome();
}

export async function saveHomeHiddenWidgets(formData: FormData) {
  const session = await requireSignedInAction();
  if (!session.userId) return;
  const shown = new Set(HOME_WIDGET_IDS.filter((id) => formData.get(`show_${id}`) === "1"));
  const hidden = HOME_WIDGET_IDS.filter((id) => !shown.has(id));
  const prefs = await currentPrefs(session.userId);
  await upsertPrefs(session.userId, { hiddenWidgets: hidden });
  if (prefs?.activeLayoutId) {
    await db
      .update(userHomeLayouts)
      .set({ hiddenWidgets: hidden, updatedAt: new Date() })
      .where(
        and(
          eq(userHomeLayouts.tenantId, DEFAULT_TENANT_ID),
          eq(userHomeLayouts.userId, session.userId),
          eq(userHomeLayouts.id, prefs.activeLayoutId),
        ),
      );
  }
  refreshHome();
}

export async function saveShowCompanyWidgets(formData: FormData) {
  await requireAdminAction();
  const on = formData.get("showCompanyWidgets") === "1";
  await db
    .update(agencySettings)
    .set({ showCompanyWidgets: on, updatedAt: new Date() })
    .where(eq(agencySettings.tenantId, DEFAULT_TENANT_ID));
  refreshHome();
}

export async function postContest(formData: FormData) {
  const session = await requireAdminAction();
  const title = String(formData.get("title") ?? "").trim();
  const rules = String(formData.get("rules") ?? "").trim();
  const metric = String(formData.get("metric") ?? "premium") === "policy_count" ? "policy_count" : "premium";
  const startsAt = parseDay(String(formData.get("startsAt") ?? ""));
  const endsAt = parseDay(String(formData.get("endsAt") ?? ""), true);
  if (!title || !rules || !startsAt || !endsAt) return;
  await db.insert(contests).values({
    tenantId: DEFAULT_TENANT_ID,
    title,
    rules,
    metric,
    startsAt,
    endsAt,
    createdBy: session.userId,
    active: true,
  });
  refreshHome();
}

async function currentPrefs(userId: string) {
  const [existing] = await db
    .select()
    .from(userDashboardPrefs)
    .where(
      and(eq(userDashboardPrefs.tenantId, DEFAULT_TENANT_ID), eq(userDashboardPrefs.userId, userId)),
    );
  return existing ?? null;
}

async function listUserLayouts(userId: string) {
  return db
    .select({ id: userHomeLayouts.id, name: userHomeLayouts.name })
    .from(userHomeLayouts)
    .where(and(eq(userHomeLayouts.tenantId, DEFAULT_TENANT_ID), eq(userHomeLayouts.userId, userId)));
}

function parseJson(raw: FormDataEntryValue | null): unknown {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function upsertPrefs(
  userId: string,
  patch: {
    preset?: ReturnType<typeof parseDashboardPreset>;
    bookScope?: ReturnType<typeof parseBookScope>;
    hiddenWidgets?: HomeWidgetId[];
    activeLayoutId?: string | null;
    resizeTiles?: boolean;
  },
) {
  const existing = await currentPrefs(userId);
  if (existing) {
    await db
      .update(userDashboardPrefs)
      .set({
        preset: patch.preset ?? existing.preset,
        bookScope: patch.bookScope ?? existing.bookScope,
        hiddenWidgets: patch.hiddenWidgets ?? existing.hiddenWidgets,
        activeLayoutId: "activeLayoutId" in patch ? patch.activeLayoutId ?? null : existing.activeLayoutId,
        resizeTiles: patch.resizeTiles ?? existing.resizeTiles,
        updatedAt: new Date(),
      })
      .where(eq(userDashboardPrefs.id, existing.id));
    return;
  }
  const preset = patch.preset ?? "my_production";
  await db.insert(userDashboardPrefs).values({
    tenantId: DEFAULT_TENANT_ID,
    userId,
    preset,
    bookScope: patch.bookScope ?? "agency",
    hiddenWidgets: patch.hiddenWidgets ?? hiddenForPreset(preset),
    activeLayoutId: patch.activeLayoutId ?? null,
    resizeTiles: patch.resizeTiles ?? false,
  });
}

export async function postLeadOffer(formData: FormData) {
  const session = await requireAdminAction();
  if (!session.userId) return;
  const kind = parseLeadOfferKind(String(formData.get("kind") ?? ""));
  const language = String(formData.get("language") ?? "").trim() || null;
  const state = String(formData.get("state") ?? "").trim().toUpperCase() || null;
  const emailFrom = String(formData.get("emailFrom") ?? "").trim() || null;
  const emailSubject = String(formData.get("emailSubject") ?? "").trim() || null;
  const emailSnippet = String(formData.get("emailSnippet") ?? "").trim() || null;
  const emailBody = String(formData.get("emailBody") ?? "").trim() || null;
  const emailStubId = String(formData.get("emailStubId") ?? "").trim() || null;
  const title =
    String(formData.get("title") ?? "").trim() ||
    emailSubject ||
    (kind === "inbound_email" ? "Inbound email — who owns this?" : "");
  const details =
    String(formData.get("details") ?? "").trim() ||
    emailSnippet ||
    (kind === "inbound_email" ? "Shared from the agency inbox." : "");
  if (!title || !details) return;
  if (kind === "inbound_email" && !emailFrom && !emailStubId && !emailSubject) return;
  await db.insert(leadOffers).values({
    tenantId: DEFAULT_TENANT_ID,
    title,
    details,
    kind,
    language,
    state,
    emailFrom,
    emailSubject,
    emailSnippet,
    emailBody,
    emailStubId,
    postedBy: session.userId,
    status: "open",
  });
  refreshHome();
}

export async function claimLeadOffer(formData: FormData) {
  const session = await requireSignedInAction();
  if (!session.userId) return;
  const offerId = String(formData.get("offerId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!offerId) return;
  const [offer] = await db
    .select()
    .from(leadOffers)
    .where(and(eq(leadOffers.tenantId, DEFAULT_TENANT_ID), eq(leadOffers.id, offerId)));
  if (!offer || !canClaimOffer(offer.status, false, offer.kind)) return;
  const [existing] = await db
    .select()
    .from(leadOfferClaims)
    .where(
      and(
        eq(leadOfferClaims.tenantId, DEFAULT_TENANT_ID),
        eq(leadOfferClaims.offerId, offerId),
        eq(leadOfferClaims.agentId, session.userId),
      ),
    );
  if (existing) return;
  await db.insert(leadOfferClaims).values({
    tenantId: DEFAULT_TENANT_ID,
    offerId,
    agentId: session.userId,
    note,
  });
  refreshHome();
}

export async function takeOwnershipLeadOffer(formData: FormData) {
  const session = await requireSignedInAction();
  if (!session.userId) return;
  const offerId = String(formData.get("offerId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  const relation = parseLeadOfferRelation(String(formData.get("relation") ?? "")) ?? "new_lead";
  if (!offerId) return;
  const [offer] = await db
    .select()
    .from(leadOffers)
    .where(and(eq(leadOffers.tenantId, DEFAULT_TENANT_ID), eq(leadOffers.id, offerId)));
  if (!offer || !canTakeOwnership(offer.status, offer.kind)) return;

  const now = new Date();
  const parsed = parseEmailFrom(offer.emailFrom);
  const identity = {
    firstName: parsed.firstName,
    lastName: parsed.lastName,
    email: parsed.email,
  };
  let leadId = offer.leadId;
  if (leadId) {
    await db
      .update(leads)
      .set({ ownerId: session.userId, updatedAt: now })
      .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), eq(leads.id, leadId)));
  } else {
    const existing = await findMatchingLead(identity);
    if (existing) {
      leadId = existing.id;
      await db
        .update(leads)
        .set({ ownerId: session.userId, updatedAt: now })
        .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), eq(leads.id, existing.id)));
    } else {
      const [lead] = await db
        .insert(leads)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          ownerId: session.userId,
          firstName: identity.firstName,
          lastName: identity.lastName,
          email: identity.email,
          source: "inbound_email",
          notes: [offer.emailSubject, offer.emailSnippet, offer.emailStubId ? `stub ${offer.emailStubId}` : null]
            .filter(Boolean)
            .join(" — "),
          preferredLanguage: offer.language,
          state: offer.state,
          status: "new",
        })
        .returning();
      leadId = lead.id;
    }
  }

  await db.insert(leadOfferClaims).values({
    tenantId: DEFAULT_TENANT_ID,
    offerId,
    agentId: session.userId,
    note,
    relation,
  });
  await db
    .update(leadOffers)
    .set({
      status: "claimed",
      claimedBy: session.userId,
      claimedAt: now,
      leadId,
      updatedAt: now,
    })
    .where(and(eq(leadOffers.id, offer.id), eq(leadOffers.status, "open"), isNull(leadOffers.claimedBy)));

  const relationLabel = relation === "know_client" ? "I know this client" : "New lead";
  await db.insert(alerts).values({
    tenantId: DEFAULT_TENANT_ID,
    kind: "lead_offer",
    title: `${session.name} claimed inbound email`,
    body: `${parsed.displayName || `${identity.firstName} ${identity.lastName}`} is now on ${session.name}'s book. ${relationLabel}. Follow-up is theirs.`,
    severity: "info",
    entityType: "lead",
    entityId: leadId,
  });
  refreshHome();
}

export async function awardLeadOffer(formData: FormData) {
  const session = await requireAdminAction();
  const offerId = String(formData.get("offerId") ?? "").trim();
  const agentId = String(formData.get("agentId") ?? "").trim();
  if (!offerId || !agentId) return;
  const [offer] = await db
    .select()
    .from(leadOffers)
    .where(and(eq(leadOffers.tenantId, DEFAULT_TENANT_ID), eq(leadOffers.id, offerId)));
  if (!offer || !canAwardOffer(offer.status, offer.kind)) return;
  const [agent] = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, DEFAULT_TENANT_ID), eq(users.id, agentId), eq(users.active, true)));
  if (!agent) return;
  const now = new Date();
  await db
    .update(leadOffers)
    .set({ status: "awarded", awardedTo: agent.id, awardedAt: now, updatedAt: now })
    .where(eq(leadOffers.id, offer.id));
  if (offer.leadId) {
    await db
      .update(leads)
      .set({ ownerId: agent.id, updatedAt: now })
      .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), eq(leads.id, offer.leadId)));
  }
  refreshHome();
}

function parseDay(raw: string, endOfDay = false): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  return new Date(`${raw}T${endOfDay ? "23:59:59.000Z" : "00:00:00.000Z"}`);
}
