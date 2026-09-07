"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { currentDeskSession } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { agencySettings, integrationConnections } from "@/lib/db/schema";
import { AGENCY_SETTINGS_ID } from "@/lib/fixtures/ids";
import { flashAction } from "@/lib/flash-action";
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
import { cookies } from "next/headers";
import { isPaidWallPlatform, SOCIAL_OAUTH_COOKIE, socialReturnPath } from "@/lib/social/byo";
import {
  clearSocialByoApp,
  prepareSocialAuthorize,
  saveSocialByoApp,
} from "@/lib/social/byo-store";
import { deskPublicOrigin } from "@/lib/social/origin";

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
  const next = String(formData.get("next") ?? "");
  const dest = next === "/settings/integrations" ? "/settings/integrations" : "/settings/social";
  flashAction(dest, "settings-saved");
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
  flashAction("/settings/social", "owner-saved");
}

export async function saveSocialByoCredentials(formData: FormData) {
  await assertAdmin();
  const raw = String(formData.get("provider") ?? "");
  const dest = socialReturnPath(String(formData.get("next") ?? ""));
  if (!isSocialPlatformId(raw)) {
    redirect(`${dest}?notice=unknown-provider`);
  }
  const clientId = String(formData.get("clientId") ?? "").trim();
  const clientSecret = String(formData.get("clientSecret") ?? "");
  const accountLabel = String(formData.get("accountLabel") ?? "").trim();
  if (!clientId) {
    redirect(`${dest}?notice=needs-credentials&provider=${raw}`);
  }
  await saveSocialByoApp({
    provider: raw,
    clientId,
    clientSecret,
    accountLabel: accountLabel || null,
  });
  refreshSocial();
  flashAction(dest, "credentials-saved");
}

export async function startSocialByoOAuth(formData: FormData) {
  await assertAdmin();
  const raw = String(formData.get("provider") ?? "");
  const dest = socialReturnPath(String(formData.get("next") ?? ""));
  if (!isSocialPlatformId(raw)) {
    redirect(`${dest}?notice=unknown-provider`);
  }
  if (isPaidWallPlatform(raw)) {
    redirect(`${dest}?notice=paid-wall&provider=${raw}`);
  }
  const origin = await deskPublicOrigin();
  const prepared = await prepareSocialAuthorize({
    provider: raw,
    origin,
    returnTo: dest,
  });
  if (!prepared.ok) {
    const notice = prepared.reason === "paid_wall" ? "paid-wall" : "needs-credentials";
    redirect(`${dest}?notice=${notice}&provider=${raw}`);
  }
  const jar = await cookies();
  jar.set(SOCIAL_OAUTH_COOKIE, prepared.state, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 10 * 60,
  });
  redirect(prepared.url);
}

export async function clearSocialByoCredentials(formData: FormData) {
  await assertAdmin();
  const raw = String(formData.get("provider") ?? "");
  const dest = socialReturnPath(String(formData.get("next") ?? ""));
  if (!isSocialPlatformId(raw)) {
    redirect(`${dest}?notice=unknown-provider`);
  }
  await clearSocialByoApp(raw);
  refreshSocial();
  redirect(`${dest}?notice=credentials-cleared&provider=${raw}#${raw}`);
}
