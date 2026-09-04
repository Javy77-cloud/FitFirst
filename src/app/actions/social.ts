"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { findOrCreateLead } from "@/app/actions/crm";
import { currentDeskSession } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { agencySettings } from "@/lib/db/schema";
import { AGENCY_SETTINGS_ID } from "@/lib/fixtures/ids";
import {
  canUseSocialPlatform,
  isSocialPlatformId,
  socialLeadSource,
} from "@/lib/social/platforms";
import { inquiryById, SOCIAL_INQUIRY_SEEDS } from "@/lib/social/seeds";
import { loadGbpMonitorPolicy } from "@/lib/social/store";
import { listCatalogItems } from "@/lib/integrations/catalog-store";

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
  const { lead } = await findOrCreateLead({
    firstName: inquiry.firstName,
    lastName: inquiry.lastName,
    email: inquiry.email,
    phone: inquiry.phone,
    city: inquiry.city,
    state: inquiry.state,
    zip: inquiry.zip,
    insuranceTypeDesired: inquiry.insuranceTypeDesired,
    source: socialLeadSource(inquiry.platform),
    notes: inquiry.excerpt,
  });
  refreshSocial();
  redirect(`/leads/${lead.id}`);
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
    const result = await findOrCreateLead({
      firstName: inquiry.firstName,
      lastName: inquiry.lastName,
      email: inquiry.email,
      phone: inquiry.phone,
      city: inquiry.city,
      state: inquiry.state,
      zip: inquiry.zip,
      insuranceTypeDesired: inquiry.insuranceTypeDesired,
      source: socialLeadSource(inquiry.platform),
      notes: inquiry.excerpt,
    });
    if (result.created) created += 1;
  }
  refreshSocial();
  redirect(created > 0 ? `/leads?notice=social-retrieved&n=${created}` : "/social?notice=no-new-inquiries");
}
