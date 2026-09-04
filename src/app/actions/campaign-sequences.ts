"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireSignedInAction } from "@/lib/auth/guards";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { campaignSequences } from "@/lib/db/schema";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function refreshSequences() {
  revalidatePath("/automations");
  revalidatePath("/automations/sequences");
  revalidatePath("/automations/templates");
  revalidatePath("/work-queue");
}

export async function toggleCampaignSequence(formData: FormData) {
  await requireSignedInAction();
  const id = str(formData, "id");
  if (!id) {
    redirect("/automations/sequences?error=Missing%20sequence.");
  }
  const enabled = str(formData, "enabled") === "true";
  await db
    .update(campaignSequences)
    .set({ enabled, updatedAt: new Date() })
    .where(and(eq(campaignSequences.tenantId, DEFAULT_TENANT_ID), eq(campaignSequences.id, id)));
  refreshSequences();
  redirect(`/automations/sequences?notice=${enabled ? "sequence-on" : "sequence-off"}`);
}
