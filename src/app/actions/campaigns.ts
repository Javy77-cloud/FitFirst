"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { campaignSendLogs, emailCampaigns } from "@/lib/db/schema";
import { resolveCampaignAudience } from "@/lib/db/ops-queries";
import { sendCampaignEmail } from "@/lib/integrations/email";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function upsertCampaign(formData: FormData) {
  const id = str(formData, "id");
  const values = {
    tenantId: DEFAULT_TENANT_ID,
    name: str(formData, "name") || "Untitled campaign",
    subject: str(formData, "subject") || "(no subject)",
    body: str(formData, "body") || "",
    audienceType: str(formData, "audienceType") || "tag",
    audienceValue: str(formData, "audienceValue") || "",
    status: "draft" as const,
    updatedAt: new Date(),
  };

  if (id) {
    await db
      .update(emailCampaigns)
      .set(values)
      .where(and(eq(emailCampaigns.tenantId, DEFAULT_TENANT_ID), eq(emailCampaigns.id, id)));
    revalidatePath("/campaigns");
    revalidatePath(`/campaigns/${id}`);
    revalidatePath("/automations");
    revalidatePath("/automations/campaigns");
    redirect(`/campaigns/${id}`);
  }

  const [row] = await db.insert(emailCampaigns).values(values).returning();
  revalidatePath("/campaigns");
  revalidatePath("/automations");
  revalidatePath("/automations/campaigns");
  redirect(`/campaigns/${row.id}`);
}

export async function stubSendCampaign(formData: FormData) {
  const id = str(formData, "id");
  const [campaign] = await db
    .select()
    .from(emailCampaigns)
    .where(and(eq(emailCampaigns.tenantId, DEFAULT_TENANT_ID), eq(emailCampaigns.id, id)));
  if (!campaign) throw new Error("Campaign not found");

  const audience = await resolveCampaignAudience(campaign.audienceType, campaign.audienceValue);
  if (audience.length === 0) {
    await db.insert(campaignSendLogs).values({
      tenantId: DEFAULT_TENANT_ID,
      campaignId: id,
      recipientName: "(empty audience)",
      outcome: "would_send",
      detail: `would send — no matching ${campaign.audienceType} "${campaign.audienceValue}"`,
    });
  } else {
    for (const recipient of audience) {
      const result = sendCampaignEmail({
        campaignName: campaign.name,
        subject: campaign.subject,
        recipientEmail: recipient.email,
        recipientName: recipient.name,
      });
      await db.insert(campaignSendLogs).values({
        tenantId: DEFAULT_TENANT_ID,
        campaignId: id,
        recipientEmail: result.recipientEmail,
        recipientName: result.recipientName,
        outcome: result.status,
        detail: result.message,
      });
    }
  }

  await db
    .update(emailCampaigns)
    .set({ status: "stub_sent", sentAt: new Date(), updatedAt: new Date() })
    .where(eq(emailCampaigns.id, id));

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${id}`);
  revalidatePath("/automations");
  revalidatePath("/automations/campaigns");
  redirect(`/campaigns/${id}?notice=would-send`);
}
