"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { smsSettings } from "@/lib/db/schema";
import { requireAdminAction } from "@/lib/auth/guards";
import { connectSmsProvider } from "@/lib/integrations/sms";

export async function connectSmsStub() {
  await requireAdminAction("Only an admin can connect the agency SMS line.");
  const result = connectSmsProvider("twilio");
  const [existing] = await db
    .select()
    .from(smsSettings)
    .where(eq(smsSettings.tenantId, DEFAULT_TENANT_ID));
  if (existing) {
    await db
      .update(smsSettings)
      .set({
        provider: "twilio",
        connected: true,
        displayFrom: "not-provisioned",
        lastConnectStatus: result.status,
        notes: "Stub connection only. No number purchased. Twilio is not called.",
        updatedAt: new Date(),
      })
      .where(eq(smsSettings.id, existing.id));
  } else {
    await db.insert(smsSettings).values({
      tenantId: DEFAULT_TENANT_ID,
      provider: "twilio",
      connected: true,
      displayFrom: "not-provisioned",
      lastConnectStatus: result.status,
      notes: "Stub connection only. No number purchased. Twilio is not called.",
    });
  }
  revalidatePath("/settings/sms");
  redirect("/settings/sms?notice=sms-not-implemented");
}

export async function disconnectSmsStub() {
  await requireAdminAction("Only an admin can disconnect the agency SMS line.");
  const [existing] = await db
    .select()
    .from(smsSettings)
    .where(eq(smsSettings.tenantId, DEFAULT_TENANT_ID));
  if (existing) {
    await db
      .update(smsSettings)
      .set({
        provider: "none",
        connected: false,
        displayFrom: null,
        lastConnectStatus: null,
        updatedAt: new Date(),
      })
      .where(eq(smsSettings.id, existing.id));
  }
  revalidatePath("/settings/sms");
  redirect("/settings/sms?notice=sms-disconnected");
}
