"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import {
  DEFAULT_TENANT_ID,
  ESIGN_SETTINGS_PROVIDERS,
  type EsignSettingsProvider,
} from "@/lib/domain";
import { db } from "@/lib/db";
import { esignSettings } from "@/lib/db/schema";
import { currentDeskSession } from "@/lib/auth/session";
import { sendEnvelope } from "@/lib/integrations/esign";
import { flashSettings } from "@/lib/flash-action";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function isProvider(value: string): value is EsignSettingsProvider {
  return (ESIGN_SETTINGS_PROVIDERS as readonly string[]).includes(value);
}

async function assertAdmin() {
  const session = await currentDeskSession();
  if (!session.isAdmin) throw new Error("Admin only.");
  return session;
}

async function upsertRow(patch: {
  provider: string;
  connected: boolean;
  accountLabel: string | null;
  notes: string | null;
  lastConnectStatus: string | null;
}) {
  const [existing] = await db
    .select()
    .from(esignSettings)
    .where(eq(esignSettings.tenantId, DEFAULT_TENANT_ID));
  if (existing) {
    await db
      .update(esignSettings)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(esignSettings.id, existing.id));
    return;
  }
  await db.insert(esignSettings).values({
    tenantId: DEFAULT_TENANT_ID,
    ...patch,
  });
}

export async function saveEsignStub(formData: FormData) {
  await assertAdmin();
  const providerRaw = str(formData, "provider") || "none";
  const provider = isProvider(providerRaw) ? providerRaw : "none";
  const accountLabel = str(formData, "accountLabel") || null;
  const notes = str(formData, "notes") || null;
  const probe =
    provider === "none" ? null : sendEnvelope(provider, { documentId: "settings-probe" });
  await upsertRow({
    provider,
    connected: provider !== "none",
    accountLabel,
    notes:
      notes ||
      (provider === "none"
        ? "No e-sign provider. Signed apps still attach on the Deal."
        : "Stub only. Agency BYO later. No credentials stored. Nothing sent to a vendor."),
    lastConnectStatus: probe?.status ?? null,
  });
  revalidatePath("/settings");
  revalidatePath("/settings/esign");
  revalidatePath("/esign");
  await flashSettings("/settings/esign", "esign-saved");
}

export async function disconnectEsignStub() {
  await assertAdmin();
  await upsertRow({
    provider: "none",
    connected: false,
    accountLabel: null,
    notes: "Disconnected stub. Signed apps stay on the Deal.",
    lastConnectStatus: null,
  });
  revalidatePath("/settings");
  revalidatePath("/settings/esign");
  revalidatePath("/esign");
  redirect("/settings/esign?notice=esign-disconnected");
}
