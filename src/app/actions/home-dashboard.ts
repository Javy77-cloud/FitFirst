"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { requireAdminAction, requireSignedInAction } from "@/lib/auth/guards";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { agencySettings, contests, leadOfferClaims, leadOffers, leads, userDashboardPrefs, users } from "@/lib/db/schema";
import { canAwardOffer, canClaimOffer } from "@/lib/home/lead-offers";
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
}

export async function saveHomePreset(formData: FormData) {
  const session = await requireSignedInAction();
  if (!session.userId) return;
  const preset = parseDashboardPreset(String(formData.get("preset") ?? ""));
  await upsertPrefs(session.userId, { preset, hiddenWidgets: hiddenForPreset(preset) });
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
  await upsertPrefs(session.userId, { hiddenWidgets: hidden });
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

async function upsertPrefs(
  userId: string,
  patch: {
    preset?: ReturnType<typeof parseDashboardPreset>;
    bookScope?: ReturnType<typeof parseBookScope>;
    hiddenWidgets?: HomeWidgetId[];
  },
) {
  const [existing] = await db
    .select()
    .from(userDashboardPrefs)
    .where(
      and(eq(userDashboardPrefs.tenantId, DEFAULT_TENANT_ID), eq(userDashboardPrefs.userId, userId)),
    );
  if (existing) {
    await db
      .update(userDashboardPrefs)
      .set({
        preset: patch.preset ?? existing.preset,
        bookScope: patch.bookScope ?? existing.bookScope,
        hiddenWidgets: patch.hiddenWidgets ?? existing.hiddenWidgets,
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
  });
}

export async function postLeadOffer(formData: FormData) {
  const session = await requireAdminAction();
  if (!session.userId) return;
  const title = String(formData.get("title") ?? "").trim();
  const details = String(formData.get("details") ?? "").trim();
  const language = String(formData.get("language") ?? "").trim() || null;
  const state = String(formData.get("state") ?? "").trim().toUpperCase() || null;
  if (!title || !details) return;
  await db.insert(leadOffers).values({
    tenantId: DEFAULT_TENANT_ID,
    title,
    details,
    language,
    state,
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
  if (!offer || !canClaimOffer(offer.status, false)) return;
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

export async function awardLeadOffer(formData: FormData) {
  const session = await requireAdminAction();
  const offerId = String(formData.get("offerId") ?? "").trim();
  const agentId = String(formData.get("agentId") ?? "").trim();
  if (!offerId || !agentId) return;
  const [offer] = await db
    .select()
    .from(leadOffers)
    .where(and(eq(leadOffers.tenantId, DEFAULT_TENANT_ID), eq(leadOffers.id, offerId)));
  if (!offer || !canAwardOffer(offer.status)) return;
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
