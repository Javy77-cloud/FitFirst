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
import { deskPublicOrigin } from "@/lib/social/origin";
import { planByoClientId } from "@/lib/integrations/byo-credentials";
import { canConnectByoIntegration, canStartByoOauth, tenantLooksSolo } from "@/lib/integrations/connect-policy";
import { getAgentFeatureToggles } from "@/lib/settings/agent-feature-toggles-prefs";
import { listRecentGmail, sendGmailMessage } from "@/lib/integrations/gmail";
import { yahooMailboxPing } from "@/lib/integrations/yahoo-mail";
import { pingDocuSignSandbox } from "@/lib/integrations/docusign-sandbox";
import { syncGoogleBusy, syncOutlookBusy } from "@/lib/integrations/calendar-busy";
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

export async function saveByoOauthCredentials(formData: FormData): Promise<{
  ok: boolean;
  message: string;
}> {
  try {
    await assertCanConnect();
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Agency Admin only.",
    };
  }
  const raw = String(formData.get("provider") ?? "");
  if (!isByoOauthProviderId(raw)) return { ok: false, message: "Unknown provider." };
  const incomingId = String(formData.get("clientId") ?? "");
  const incomingSecret = String(formData.get("clientSecret") ?? "");
  const accountLabel = String(formData.get("accountLabel") ?? "").trim();
  const existing = await loadStoredByoApp(raw);
  const idPlan = planByoClientId({ incoming: incomingId, existing: existing?.clientId });
  if (!idPlan.ok) return idPlan;
  const saved = await saveByoApp({
    provider: raw,
    clientId: idPlan.clientId,
    clientSecret: incomingSecret,
    accountLabel: accountLabel || null,
  });
  if (!saved.ok) return saved;
  refreshByoSurfaces();
  return { ok: true, message: "credentials-saved" };
}

export async function startByoOauth(formData: FormData) {
  const raw = String(formData.get("provider") ?? "");
  const dest = byoOauthReturnPath(String(formData.get("next") ?? ""));
  if (!isByoOauthProviderId(raw)) redirect(`${dest}?notice=unknown-provider`);
  const session = await assertCanStartOauth(raw);
  const origin = await deskPublicOrigin();
  const prepared = await prepareByoAuthorize({
    provider: raw,
    origin,
    returnTo: dest,
    userId: session.userId,
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
      await clearBusyFor("google_calendar");
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
      await clearBusyFor("outlook_calendar");
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
      await syncGoogleBusy();
      refreshByoSurfaces();
      await flashSettings(dest, "busy-synced");
    }
    if (raw === "outlook_calendar") {
      await syncOutlookBusy();
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
