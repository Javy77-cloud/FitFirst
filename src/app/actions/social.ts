"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { currentDeskSession } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { agencySettings, integrationConnections } from "@/lib/db/schema";
import { AGENCY_SETTINGS_ID } from "@/lib/fixtures/ids";
import { connectionOwnerFor, ingestSocialLead } from "@/lib/leads/offers";
import {
  canUseSocialPlatform,
  isSocialPlatformId,
  socialLeadSource,
} from "@/lib/social/platforms";
import { inquiryById, SOCIAL_INQUIRY_SEEDS } from "@/lib/social/seeds";
import { loadGbpMonitorPolicy } from "@/lib/social/store";
import { listCatalogItems } from "@/lib/integrations/catalog-store";
import { isIntegrationProviderId } from "@/lib/integrations/catalog";

function refreshSocial() {
  revalidatePath("/");
  revalidatePath("/social");
  revalidatePath("/leads");
  revalidatePath("/settings");
  revalidatePath("/settings/social");
  revalidatePath("/settings/integrations");
}

async function assertAdmin() {
  const session = await currentDeskSession();
  if (!session.isAdmin) throw new Error("Admin only.");
  return session;
}

export async function saveGbpAgentMonitor(formData: FormData) {
  await assertAdmin();
  const allow = formData.get("allowAgentsMonitorGbp") === "on" || formData.get("allowAgentsMonitorGbp") === "true";
  const [existing] = await db
    .select({ id: agencySettings.id })
    .from(agencySettings)
    .where(eq(agencySettings.tenantId, DEFAULT_TENANT_ID));
  if (existing) {
    await db
      .update(agencySettings)
      .set({ allowAgentsMonitorGbp: allow, updatedAt: new Date() })
      .where(eq(agencySettings.id, existing.id));
  } else {
    await db.insert(agencySettings).values({
      id: AGENCY_SETTINGS_ID,
      tenantId: DEFAULT_TENANT_ID,
      allowAgentsMonitorGbp: allow,
    });
  }
  refreshSocial();
  redirect(`/settings/social?notice=${allow ? "gbp-agents-on" : "gbp-agents-off"}`);
}

export async function openSocialInquiryAsLead(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.signedIn) throw new Error("Sign in to continue.");
  const inquiryId = String(formData.get("inquiryId") ?? "").trim();
  const inquiry = inquiryById(inquiryId);
  if (!inquiry) {
    redirect("/social?notice=unknown-inquiry");
  }
  const role = session.isAdmin ? "admin" : "agent";
  const [items, allowAgentsMonitorGbp] = await Promise.all([
    listCatalogItems(),
    loadGbpMonitorPolicy(),
  ]);
  const connected = items.some((item) => item.id === inquiry.platform && item.connected);
  if (!connected) {
    redirect("/social?notice=platform-disconnected");
  }
  if (!canUseSocialPlatform(inquiry.platform, role, allowAgentsMonitorGbp)) {
    redirect("/social?notice=gbp-locked");
  }
  const connectionOwnerUserId = connectionOwnerFor(
    inquiry.platform,
    items.map((item) => ({ id: item.id, ownerUserId: item.ownerUserId })),
  );
  const result = await ingestSocialLead({
    firstName: inquiry.firstName,
    lastName: inquiry.lastName,
    email: inquiry.email,
    phone: inquiry.phone,
    city: inquiry.city,
    state: inquiry.state,
    zip: inquiry.zip,
    insuranceTypeDesired: inquiry.insuranceTypeDesired,
    source: socialLeadSource(inquiry.platform),
    platform: inquiry.platform,
    notes: inquiry.excerpt,
    connectionOwnerUserId,
  });
  refreshSocial();
  revalidatePath("/alerts");
  if (result.assignment === "unassigned" && !session.isAdmin) {
    redirect("/social?notice=unassigned-queued");
  }
  redirect(`/leads/${result.lead.id}`);
}

export async function retrieveVisibleSocialInquiries() {
  const session = await currentDeskSession();
  if (!session.signedIn) throw new Error("Sign in to continue.");
  const role = session.isAdmin ? "admin" : "agent";
  const [items, allowAgentsMonitorGbp] = await Promise.all([
    listCatalogItems(),
    loadGbpMonitorPolicy(),
  ]);
  const connected = new Set(
    items.filter((item) => item.connected && isSocialPlatformId(item.id)).map((item) => item.id),
  );
  let created = 0;
  for (const inquiry of SOCIAL_INQUIRY_SEEDS) {
    if (!connected.has(inquiry.platform)) continue;
    if (!canUseSocialPlatform(inquiry.platform, role, allowAgentsMonitorGbp)) continue;
    const connectionOwnerUserId = connectionOwnerFor(
      inquiry.platform,
      items.map((item) => ({ id: item.id, ownerUserId: item.ownerUserId })),
    );
    const result = await ingestSocialLead({
      firstName: inquiry.firstName,
      lastName: inquiry.lastName,
      email: inquiry.email,
      phone: inquiry.phone,
      city: inquiry.city,
      state: inquiry.state,
      zip: inquiry.zip,
      insuranceTypeDesired: inquiry.insuranceTypeDesired,
      source: socialLeadSource(inquiry.platform),
      platform: inquiry.platform,
      notes: inquiry.excerpt,
      connectionOwnerUserId,
    });
    if (result.created) created += 1;
  }
  refreshSocial();
  revalidatePath("/alerts");
  redirect(created > 0 ? `/leads?notice=social-retrieved&n=${created}` : "/social?notice=no-new-inquiries");
}

export async function saveSocialAccountOwner(formData: FormData) {
  await assertAdmin();
  const raw = String(formData.get("provider") ?? "");
  if (!isIntegrationProviderId(raw) || !isSocialPlatformId(raw)) {
    redirect("/settings/social?notice=unknown-provider");
  }
  const ownerRaw = String(formData.get("ownerUserId") ?? "").trim();
  const ownerUserId = ownerRaw || null;
  const [row] = await db
    .select()
    .from(integrationConnections)
    .where(
      and(
        eq(integrationConnections.tenantId, DEFAULT_TENANT_ID),
        eq(integrationConnections.provider, raw),
      ),
    );
  if (row) {
    await db
      .update(integrationConnections)
      .set({ ownerUserId, updatedAt: new Date() })
      .where(eq(integrationConnections.id, row.id));
  }
  refreshSocial();
  redirect("/settings/social?notice=owner-saved");
}
