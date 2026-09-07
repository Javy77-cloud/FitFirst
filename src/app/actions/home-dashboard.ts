"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { requireAdminAction, requireSignedInAction } from "@/lib/auth/guards";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { findMatchingLead } from "@/app/actions/crm";
import { agencySettings, alerts, contests, leadOfferClaims, leadOffers, leads, userDashboardPrefs, users } from "@/lib/db/schema";
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
  parseHiddenWidgets,
  type HomeWidgetId,
} from "@/lib/home/presets";
import {
  findNamedHomeLayout,
  parseNamedHomeLayouts,
  renameNamedHomeLayout,
  upsertNamedHomeLayout,
} from "@/lib/home/custom-layouts";
import { mergeHomeLayout, type NamedHomeLayout } from "@/lib/home/layout";
import { flashAction } from "@/lib/flash-action";

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
  const existing = await loadPrefsRow(session.userId);
  const layouts = parseNamedHomeLayouts(existing?.customLayouts);
  const active = findNamedHomeLayout(layouts, existing?.activeLayoutId);
  const customLayouts = active
    ? upsertNamedHomeLayout(layouts, { ...active, hiddenWidgets: hidden })
    : layouts;
  await upsertPrefs(session.userId, { hiddenWidgets: hidden, customLayouts });
  refreshHome();
  flashAction("/", "widgets-saved");
}

export async function saveResizeTiles(formData: FormData) {
  const session = await requireSignedInAction();
  if (!session.userId) return;
  await upsertPrefs(session.userId, { resizeTiles: formData.get("resizeTiles") === "1" });
  refreshHome();
}

export async function saveCustomHomeLayout(formData: FormData) {
  const session = await requireSignedInAction();
  if (!session.userId) return;
  const name = String(formData.get("name") ?? "");
  let placementsRaw: unknown = [];
  try {
    placementsRaw = JSON.parse(String(formData.get("placements") ?? "[]"));
  } catch {
    placementsRaw = [];
  }
  const existing = await loadPrefsRow(session.userId);
  const layouts = parseNamedHomeLayouts(existing?.customLayouts);
  const hidden = existing ? parseHiddenWidgets(existing.hiddenWidgets) : hiddenForPreset("my_production");
  const layout: NamedHomeLayout = {
    id: crypto.randomUUID(),
    name,
    placements: mergeHomeLayout(placementsRaw),
    hiddenWidgets: hidden,
  };
  if (!layout.name.trim()) return;
  const customLayouts = upsertNamedHomeLayout(layouts, layout);
  if (customLayouts === layouts) return;
  await upsertPrefs(session.userId, { customLayouts, activeLayoutId: layout.id });
  refreshHome();
  flashAction("/", "home-layout-saved");
}

export async function renameCustomHomeLayout(formData: FormData) {
  const session = await requireSignedInAction();
  if (!session.userId) return;
  const layoutId = String(formData.get("layoutId") ?? "").trim();
  const name = String(formData.get("name") ?? "");
  const existing = await loadPrefsRow(session.userId);
  const layouts = parseNamedHomeLayouts(existing?.customLayouts);
  const customLayouts = renameNamedHomeLayout(layouts, layoutId, name);
  if (customLayouts === layouts) return;
  await upsertPrefs(session.userId, { customLayouts });
  refreshHome();
}

export async function selectCustomHomeLayout(formData: FormData) {
  const session = await requireSignedInAction();
  if (!session.userId) return;
  const layoutId = String(formData.get("layoutId") ?? "").trim();
  const existing = await loadPrefsRow(session.userId);
  const layouts = parseNamedHomeLayouts(existing?.customLayouts);
  const layout = findNamedHomeLayout(layouts, layoutId);
  if (!layout) return;
  await upsertPrefs(session.userId, {
    activeLayoutId: layout.id,
    hiddenWidgets: parseHiddenWidgets(layout.hiddenWidgets),
  });
  refreshHome();
}

export async function persistCustomLayoutPlacements(formData: FormData) {
  const session = await requireSignedInAction();
  if (!session.userId) return;
  const layoutId = String(formData.get("layoutId") ?? "").trim();
  let placementsRaw: unknown = [];
  try {
    placementsRaw = JSON.parse(String(formData.get("placements") ?? "[]"));
  } catch {
    return;
  }
  const existing = await loadPrefsRow(session.userId);
  const layouts = parseNamedHomeLayouts(existing?.customLayouts);
  const layout = findNamedHomeLayout(layouts, layoutId);
  if (!layout) return;
  const customLayouts = upsertNamedHomeLayout(layouts, {
    ...layout,
    placements: mergeHomeLayout(placementsRaw),
  });
  await upsertPrefs(session.userId, { customLayouts, activeLayoutId: layout.id });
}

export async function saveShowCompanyWidgets(formData: FormData) {
  await requireAdminAction();
  const on = formData.get("showCompanyWidgets") === "1";
  await db
    .update(agencySettings)
    .set({ showCompanyWidgets: on, updatedAt: new Date() })
    .where(eq(agencySettings.tenantId, DEFAULT_TENANT_ID));
  refreshHome();
  flashAction("/settings/agency", "widgets-saved");
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

async function loadPrefsRow(userId: string) {
  const [existing] = await db
    .select()
    .from(userDashboardPrefs)
    .where(
      and(eq(userDashboardPrefs.tenantId, DEFAULT_TENANT_ID), eq(userDashboardPrefs.userId, userId)),
    );
  return existing ?? null;
}

async function upsertPrefs(
  userId: string,
  patch: {
    preset?: ReturnType<typeof parseDashboardPreset>;
    bookScope?: ReturnType<typeof parseBookScope>;
    hiddenWidgets?: HomeWidgetId[];
    customLayouts?: NamedHomeLayout[];
    activeLayoutId?: string | null;
    resizeTiles?: boolean;
  },
) {
  const existing = await loadPrefsRow(userId);
  if (existing) {
    await db
      .update(userDashboardPrefs)
      .set({
        preset: patch.preset ?? existing.preset,
        bookScope: patch.bookScope ?? existing.bookScope,
        hiddenWidgets: patch.hiddenWidgets ?? existing.hiddenWidgets,
        customLayouts: patch.customLayouts ?? existing.customLayouts,
        activeLayoutId: patch.activeLayoutId === undefined ? existing.activeLayoutId : patch.activeLayoutId,
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
    customLayouts: patch.customLayouts ?? [],
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
