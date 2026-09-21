"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { currentDeskSession } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { calendarConnections } from "@/lib/db/schema";
import { flashSettings } from "@/lib/flash-action";
import { isRedirectError } from "@/lib/lifecycle/shop";
import { deskPublicOrigin } from "@/lib/social/origin";
import { isByoPlaceholderSecret, planByoClientId } from "@/lib/integrations/byo-credentials";
import { canConnectByoIntegration, canStartByoOauth, tenantLooksSolo } from "@/lib/integrations/connect-policy";
import { getAgentFeatureToggles } from "@/lib/settings/agent-feature-toggles-prefs";
import { listRecentGmail, sendGmailMessage } from "@/lib/integrations/gmail";
import { yahooMailboxPing } from "@/lib/integrations/yahoo-mail";
import { pingDocuSignSandbox } from "@/lib/integrations/docusign-sandbox";
import { startByoOauthCredentialNotice } from "@/lib/integrations/oauth-env";
import {
  BYO_OAUTH_COOKIE,
  byoOauthReturnPath,
  isByoOauthProviderId,
} from "@/lib/integrations/oauth-specs";
import {
  clearByoApp,
  disconnectByo,
  loadStoredByoApp,
  prepareByoAuthorize,
  recordByoOauthError,
  saveByoApp,
} from "@/lib/integrations/oauth-store";
import { markSendAccountConnected } from "@/lib/templates/connectors";

function refreshByoSurfaces() {
  revalidatePath("/settings");
  revalidatePath("/settings/integrations");
  revalidatePath("/settings/email");
  revalidatePath("/settings/video");
  revalidatePath("/settings/esign");
  revalidatePath("/settings/social");
  revalidatePath("/calendar");
  revalidatePath("/inbox");
  revalidatePath("/notifications");
}

async function assertCanConnect() {
  const session = await currentDeskSession();
  if (!canConnectByoIntegration(session)) {
    throw new Error("Agency Admin only. Solos (Admin + desk) can connect personal Gmail.");
  }
  return session;
}

async function assertCanStartOauth(provider: string) {
  const session = await currentDeskSession();
  const toggles = await getAgentFeatureToggles();
  if (!canStartByoOauth(session, provider, toggles.agentsMayConnectPersonalGoogle)) {
    throw new Error("Agency Admin only. Solos (Admin + desk) can connect personal Gmail.");
  }
  return session;
}

export async function saveByoOauthCredentials(formData: FormData) {
  const dest = byoOauthReturnPath(String(formData.get("next") ?? ""));
  const raw = String(formData.get("provider") ?? "");
  try {
    await assertCanConnect();
    if (!isByoOauthProviderId(raw)) redirect(`${dest}?notice=unknown-provider`);
    const incomingId = String(formData.get("clientId") ?? "");
    const incomingSecret = String(formData.get("clientSecret") ?? "");
    const accountLabel = String(formData.get("accountLabel") ?? "").trim();
    const existing = await loadStoredByoApp(raw);
    const idPlan = planByoClientId({ incoming: incomingId, existing: existing?.clientId });
    if (!idPlan.ok) {
      await recordByoOauthError(raw, idPlan.message);
      redirect(`${dest}?notice=oauth-wall&provider=${raw}#${raw}`);
    }
    const saved = await saveByoApp({
      provider: raw,
      clientId: idPlan.clientId,
      clientSecret: incomingSecret,
      accountLabel: accountLabel || null,
    });
    if (!saved.ok) {
      await recordByoOauthError(raw, saved.message);
      redirect(`${dest}?notice=oauth-wall&provider=${raw}#${raw}`);
    }
    refreshByoSurfaces();
    redirect(`${dest}?notice=credentials-saved&provider=${raw}#${raw}`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "Could not save credentials.";
    if (isByoOauthProviderId(raw)) {
      try {
        await recordByoOauthError(raw, message);
      } catch {
        /* still redirect */
      }
    }
    redirect(`${dest}?notice=oauth-wall&provider=${encodeURIComponent(raw || "gmail")}`);
  }
}

export async function startByoOauth(formData: FormData) {
  const raw = String(formData.get("provider") ?? "");
  const dest = byoOauthReturnPath(String(formData.get("next") ?? ""));
  if (!isByoOauthProviderId(raw)) redirect(`${dest}?notice=unknown-provider`);

  try {
    const session = await assertCanStartOauth(raw);

    // Connect must persist a freshly typed Client ID / Secret. Paste-without-Save
    // used to ignore the fields and keep the old invalid secret in the vault.
    const incomingId = String(formData.get("clientId") ?? "");
    const incomingSecret = String(formData.get("clientSecret") ?? "");
    const hasTypedSecret = Boolean(incomingSecret.trim()) && !isByoPlaceholderSecret(incomingSecret);
    if (incomingId.trim() || hasTypedSecret) {
      if (!canConnectByoIntegration(session)) {
        redirect(`${dest}?notice=admin-only`);
      }
      const existing = await loadStoredByoApp(raw);
      const idPlan = planByoClientId({ incoming: incomingId, existing: existing?.clientId });
      if (!idPlan.ok) {
        await recordByoOauthError(raw, idPlan.message);
        redirect(`${dest}?notice=oauth-wall&provider=${raw}#${raw}`);
      }
      const saved = await saveByoApp({
        provider: raw,
        clientId: idPlan.clientId,
        clientSecret: hasTypedSecret ? incomingSecret : "",
        accountLabel: null,
      });
      if (!saved.ok) {
        await recordByoOauthError(raw, saved.message);
        redirect(`${dest}?notice=oauth-wall&provider=${raw}#${raw}`);
      }
      refreshByoSurfaces();
    }

    const origin = await deskPublicOrigin();
    const prepared = await prepareByoAuthorize({
      provider: raw,
      origin,
      returnTo: dest,
      userId: session.userId,
      form: {
        clientId: incomingId,
        clientSecret: hasTypedSecret ? incomingSecret : "",
      },
    });
    if (!prepared.ok) {
      const notice = startByoOauthCredentialNotice(raw, null);
      redirect(`${dest}?notice=${notice}&provider=${raw}`);
    }
    const jar = await cookies();
    jar.set(BYO_OAUTH_COOKIE, prepared.state, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 10 * 60,
    });
    redirect(prepared.url);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "Google Connect failed unexpectedly.";
    if (isByoOauthProviderId(raw)) {
      try {
        await recordByoOauthError(raw, message);
      } catch {
        /* still redirect */
      }
    }
    redirect(`${dest}?notice=oauth-wall&provider=${encodeURIComponent(raw || "gmail")}`);
  }
}


export async function clearByoOauthCredentials(formData: FormData) {
  await assertCanConnect();
  const raw = String(formData.get("provider") ?? "");
  const dest = byoOauthReturnPath(String(formData.get("next") ?? ""));
  if (!isByoOauthProviderId(raw)) redirect(`${dest}?notice=unknown-provider`);
  await clearByoApp(raw);
  refreshByoSurfaces();
  redirect(`${dest}?notice=credentials-cleared&provider=${raw}#${raw}`);
}

export async function disconnectByoOauth(formData: FormData) {
  await assertCanConnect();
  const raw = String(formData.get("provider") ?? "");
  const dest = byoOauthReturnPath(String(formData.get("next") ?? ""));
  if (!isByoOauthProviderId(raw)) redirect(`${dest}?notice=unknown-provider`);
  await disconnectByo(raw);
  if (raw === "gmail") {
    try {
      await markSendAccountConnected("google", null, { connected: false });
    } catch {
      /* catalog row is enough */
    }
  }
  if (raw === "yahoo") {
    try {
      await markSendAccountConnected("yahoo", null, { connected: false });
    } catch {
      /* ignore */
    }
  }
  if (raw === "google_calendar") {
    try {
      const { clearBusyFor } = await import("@/lib/integrations/calendar-busy");
      const { clearSyncedFor } = await import("@/lib/integrations/calendar-event-store");
      await clearBusyFor("google_calendar");
      await clearSyncedFor("google_calendar");
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
          .set({ connected: false, lastSyncStatus: null, updatedAt: new Date() })
          .where(eq(calendarConnections.id, existing.id));
      }
    } catch {
      /* ignore */
    }
  }
  if (raw === "outlook_calendar") {
    try {
      const { clearBusyFor } = await import("@/lib/integrations/calendar-busy");
      const { clearSyncedFor } = await import("@/lib/integrations/calendar-event-store");
      await clearBusyFor("outlook_calendar");
      await clearSyncedFor("outlook_calendar");
    } catch {
      /* ignore */
    }
  }
  if (raw === "docusign") {
    const { clearEsignSettingsIfDocuSign } = await import("@/lib/integrations/docusign-sandbox");
    await clearEsignSettingsIfDocuSign();
  }
  refreshByoSurfaces();
  redirect(`${dest}?notice=disconnected&provider=${raw}`);
}

export async function smokeTestByoProvider(formData: FormData) {
  await assertCanConnect();
  const raw = String(formData.get("provider") ?? "");
  const dest = byoOauthReturnPath(String(formData.get("next") ?? ""));
  const kind = String(formData.get("kind") ?? "ping");
  if (!isByoOauthProviderId(raw)) redirect(`${dest}?notice=unknown-provider`);
  try {
    if (raw === "gmail" && kind === "read") {
      await listRecentGmail(3);
      refreshByoSurfaces();
      await flashSettings(dest, "gmail-read");
    }
    if (raw === "gmail" && kind === "send") {
      const to = String(formData.get("to") ?? "").trim();
      if (!to) redirect(`${dest}?notice=gmail-need-to&provider=gmail`);
      await sendGmailMessage({
        to,
        subject: "FitFirst Gmail smoke test",
        body: "Desk Gmail OAuth is connected. This message left your BYO mailbox.",
      });
      refreshByoSurfaces();
      await flashSettings(dest, "gmail-sent");
    }
    if (raw === "yahoo") {
      await yahooMailboxPing();
      refreshByoSurfaces();
      await flashSettings(dest, "yahoo-ping");
    }
    if (raw === "google_calendar") {
      const { syncConnectedCalendars } = await import("@/lib/integrations/calendar-event-sync");
      await syncConnectedCalendars();
      refreshByoSurfaces();
      await flashSettings(dest, "busy-synced");
    }
    if (raw === "outlook_calendar") {
      const { syncConnectedCalendars } = await import("@/lib/integrations/calendar-event-sync");
      await syncConnectedCalendars();
      refreshByoSurfaces();
      await flashSettings(dest, "busy-synced");
    }
    if (raw === "docusign") {
      await pingDocuSignSandbox();
      refreshByoSurfaces();
      await flashSettings(dest, "docusign-ping");
    }
    if (raw === "google_meet") {
      redirect(`${dest}?notice=meet-helper&provider=google_meet`);
    }
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "Smoke test failed.";
    const { recordByoOauthError } = await import("@/lib/integrations/oauth-store");
    await recordByoOauthError(raw, message);
    redirect(`${dest}?notice=oauth-wall&provider=${raw}`);
  }
  redirect(`${dest}?notice=byo-connected&provider=${raw}`);
}

export async function soloDeskFlag() {
  return tenantLooksSolo();
}
