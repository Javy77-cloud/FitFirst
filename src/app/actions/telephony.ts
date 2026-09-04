"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID, TELEPHONY_PROVIDERS, type TelephonyProvider } from "@/lib/domain";
import { db } from "@/lib/db";
import { telephonySettings } from "@/lib/db/schema";
import { currentDeskSession } from "@/lib/auth/session";
import { connectTelephonyProvider } from "@/lib/integrations/telephony";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function isProvider(value: string): value is TelephonyProvider {
  return (TELEPHONY_PROVIDERS as readonly string[]).includes(value);
}

async function assertAdmin() {
  const session = await currentDeskSession();
  if (!session.isAdmin) throw new Error("Admin only.");
  return session;
}

async function upsertRow(patch: {
  provider: string;
  connected: boolean;
  displayFrom: string | null;
  accountLabel: string | null;
  notes: string | null;
  lastConnectStatus: string | null;
}) {
  const [existing] = await db
    .select()
    .from(telephonySettings)
    .where(eq(telephonySettings.tenantId, DEFAULT_TENANT_ID));
  if (existing) {
    await db
      .update(telephonySettings)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(telephonySettings.id, existing.id));
    return;
  }
  await db.insert(telephonySettings).values({
    tenantId: DEFAULT_TENANT_ID,
    ...patch,
  });
}

export async function saveTelephonyStub(formData: FormData) {
  await assertAdmin();
  const providerRaw = str(formData, "provider") || "none";
  const provider = isProvider(providerRaw) ? providerRaw : "none";
  const displayFrom = str(formData, "displayFrom") || null;
  const accountLabel = str(formData, "accountLabel") || null;
  const notes = str(formData, "notes") || null;
  const result = provider === "none" ? null : connectTelephonyProvider(provider);
  await upsertRow({
    provider,
    connected: provider !== "none",
    displayFrom,
    accountLabel,
    notes:
      notes ||
      (provider === "none"
        ? "No trunk. Call log still writes on Contact, Policy, Deal, Lead, or Business."
        : "Stub only. Agency pays Twilio / BYO later. No credentials stored. Nothing dials."),
    lastConnectStatus: result?.status ?? null,
  });
  revalidatePath("/settings");
  revalidatePath("/settings/phone");
  revalidatePath("/phone");
  redirect("/settings/phone?notice=telephony-stub");
}

export async function disconnectTelephonyStub() {
  await assertAdmin();
  await upsertRow({
    provider: "none",
    connected: false,
    displayFrom: null,
    accountLabel: null,
    notes: "Disconnected stub. Call log stays in-desk.",
    lastConnectStatus: null,
  });
  revalidatePath("/settings");
  revalidatePath("/settings/phone");
  revalidatePath("/phone");
  redirect("/settings/phone?notice=telephony-disconnected");
}
