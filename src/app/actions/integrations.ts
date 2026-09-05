"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { currentDeskSession } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { calendarConnections, smsSettings, telephonySettings } from "@/lib/db/schema";
import {
  connectIntegrationStub,
  getIntegrationProvider,
  isIntegrationProviderId,
  stubAccountLabel,
} from "@/lib/integrations/catalog";
import { upsertCatalogConnection } from "@/lib/integrations/catalog-store";
import { completeGoogleOAuthStub } from "@/lib/integrations/google-calendar";
import { connectSmsProvider } from "@/lib/integrations/sms";
import { connectTelephonyProvider } from "@/lib/integrations/telephony";
import { markSendAccountDemoConnected } from "@/lib/templates/connectors";

function revalidateIntegrationSurfaces() {
  revalidatePath("/settings");
  revalidatePath("/settings/integrations");
  revalidatePath("/settings/social");
  revalidatePath("/settings/communications");
  revalidatePath("/settings/email");
  revalidatePath("/settings/video");
  revalidatePath("/settings/sms");
  revalidatePath("/settings/phone");
  revalidatePath("/calendar");
  revalidatePath("/social");
  revalidatePath("/");
}

async function assertAdmin() {
  const session = await currentDeskSession();
  if (!session.isAdmin) throw new Error("Admin only.");
}

async function syncLegacyConnect(id: ReturnType<typeof getIntegrationProvider>["id"]) {
  if (id === "gmail") await markSendAccountDemoConnected("google");
  if (id === "outlook") await markSendAccountDemoConnected("outlook");
  if (id === "yahoo") await markSendAccountDemoConnected("yahoo");
  if (id === "zoho_mail") await markSendAccountDemoConnected("zoho_mail");

  if (id === "google_calendar") {
    const stub = completeGoogleOAuthStub(stubAccountLabel(id));
    const [existing] = await db
      .select()
      .from(calendarConnections)
      .where(
        and(
          eq(calendarConnections.tenantId, DEFAULT_TENANT_ID),
          eq(calendarConnections.provider, "google"),
        ),
      );
    if (existing) {
      await db
        .update(calendarConnections)
        .set({
          connected: true,
          displayEmail: stub.displayEmail,
          connectedAt: new Date(),
          lastSyncStatus: stub.oauth.status,
          updatedAt: new Date(),
        })
        .where(eq(calendarConnections.id, existing.id));
    } else {
      await db.insert(calendarConnections).values({
        tenantId: DEFAULT_TENANT_ID,
        provider: "google",
        connected: true,
        displayEmail: stub.displayEmail,
        connectedAt: new Date(),
        lastSyncStatus: stub.oauth.status,
      });
    }
  }

  if (id === "twilio") {
    const phone = connectTelephonyProvider("twilio");
    const sms = connectSmsProvider("twilio");
    const [phoneRow] = await db
      .select()
      .from(telephonySettings)
      .where(eq(telephonySettings.tenantId, DEFAULT_TENANT_ID));
    if (phoneRow) {
      await db
        .update(telephonySettings)
        .set({
          provider: "twilio",
          connected: true,
          accountLabel: stubAccountLabel("twilio"),
          notes: "Stub only. Agency pays Twilio. No credentials stored.",
          lastConnectStatus: phone.status,
          updatedAt: new Date(),
        })
        .where(eq(telephonySettings.id, phoneRow.id));
    } else {
      await db.insert(telephonySettings).values({
        tenantId: DEFAULT_TENANT_ID,
        provider: "twilio",
        connected: true,
        accountLabel: stubAccountLabel("twilio"),
        notes: "Stub only. Agency pays Twilio. No credentials stored.",
        lastConnectStatus: phone.status,
      });
    }
    const [smsRow] = await db
      .select()
      .from(smsSettings)
      .where(eq(smsSettings.tenantId, DEFAULT_TENANT_ID));
    if (smsRow) {
      await db
        .update(smsSettings)
        .set({
          provider: "twilio",
          connected: true,
          displayFrom: "not-provisioned",
          lastConnectStatus: sms.status,
          notes: "Stub connection only. No number purchased.",
          updatedAt: new Date(),
        })
        .where(eq(smsSettings.id, smsRow.id));
    } else {
      await db.insert(smsSettings).values({
        tenantId: DEFAULT_TENANT_ID,
        provider: "twilio",
        connected: true,
        displayFrom: "not-provisioned",
        lastConnectStatus: sms.status,
        notes: "Stub connection only. No number purchased.",
      });
    }
  }
}

async function syncLegacyDisconnect(id: ReturnType<typeof getIntegrationProvider>["id"]) {
  if (id === "google_calendar") {
    const [existing] = await db
      .select()
      .from(calendarConnections)
      .where(
        and(
          eq(calendarConnections.tenantId, DEFAULT_TENANT_ID),
          eq(calendarConnections.provider, "google"),
        ),
      );
    if (existing) {
      await db
        .update(calendarConnections)
        .set({
          connected: false,
          connectedAt: null,
          lastSyncStatus: null,
          updatedAt: new Date(),
        })
        .where(eq(calendarConnections.id, existing.id));
    }
  }

  if (id === "twilio") {
    const [phoneRow] = await db
      .select()
      .from(telephonySettings)
      .where(eq(telephonySettings.tenantId, DEFAULT_TENANT_ID));
    if (phoneRow) {
      await db
        .update(telephonySettings)
        .set({
          provider: "none",
          connected: false,
          accountLabel: null,
          lastConnectStatus: null,
          updatedAt: new Date(),
        })
        .where(eq(telephonySettings.id, phoneRow.id));
    }
    const [smsRow] = await db
      .select()
      .from(smsSettings)
      .where(eq(smsSettings.tenantId, DEFAULT_TENANT_ID));
    if (smsRow) {
      await db
        .update(smsSettings)
        .set({
          provider: "none",
          connected: false,
          displayFrom: null,
          lastConnectStatus: null,
          updatedAt: new Date(),
        })
        .where(eq(smsSettings.id, smsRow.id));
    }
  }
}

export async function connectCatalogStub(formData: FormData) {
  await assertAdmin();
  const raw = String(formData.get("provider") ?? "");
  if (!isIntegrationProviderId(raw)) {
    redirect("/settings/integrations?notice=unknown-provider");
  }
  const provider = getIntegrationProvider(raw);
  const result = connectIntegrationStub(provider.id);
  await upsertCatalogConnection({
    provider: provider.id,
    category: provider.category,
    connected: true,
    accountLabel: stubAccountLabel(provider.id),
    notes: `${provider.byoNote} Connect is a stub. No OAuth ran.`,
    lastConnectStatus: result.status,
  });
  try {
    await syncLegacyConnect(provider.id);
  } catch {
    // Legacy tables may be mid-migrate. Catalog row is the settings shape.
  }
  revalidateIntegrationSurfaces();
  const next = safeIntegrationReturn(String(formData.get("next") ?? ""));
  redirect(`${next}?notice=connected&provider=${provider.id}`);
}

export async function disconnectCatalogStub(formData: FormData) {
  await assertAdmin();
  const raw = String(formData.get("provider") ?? "");
  if (!isIntegrationProviderId(raw)) {
    redirect("/settings/integrations?notice=unknown-provider");
  }
  const provider = getIntegrationProvider(raw);
  await upsertCatalogConnection({
    provider: provider.id,
    category: provider.category,
    connected: false,
    accountLabel: null,
    notes: "Disconnected stub. History on the desk stays.",
    lastConnectStatus: null,
  });
  try {
    await syncLegacyDisconnect(provider.id);
  } catch {
    // Catalog row is enough for the badge.
  }
  revalidateIntegrationSurfaces();
  const next = safeIntegrationReturn(String(formData.get("next") ?? ""));
  redirect(`${next}?notice=disconnected&provider=${provider.id}`);
}

function safeIntegrationReturn(raw: string): "/settings/integrations" | "/settings/social" {
  return raw === "/settings/social" ? "/settings/social" : "/settings/integrations";
}
