import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { calendarConnections } from "@/lib/db/schema";
import { syncEsignSettingsFromDocuSign } from "./docusign-sandbox";
import { syncGoogleBusy, syncOutlookBusy } from "./calendar-busy";
import type { ByoOauthProviderId } from "./oauth-specs";
import { markSendAccountConnected } from "@/lib/templates/connectors";

export async function applyByoConnectSideEffects(input: {
  provider: ByoOauthProviderId;
  accountLabel: string;
  accountEmail: string | null;
}) {
  if (input.provider === "gmail") {
    await markSendAccountConnected("google", input.accountEmail);
  }
  if (input.provider === "yahoo") {
    await markSendAccountConnected("yahoo", input.accountEmail);
  }
  if (input.provider === "google_calendar" || input.provider === "google_meet") {
    const [existing] = await db
      .select()
      .from(calendarConnections)
      .where(
        and(
          eq(calendarConnections.tenantId, DEFAULT_TENANT_ID),
          eq(calendarConnections.provider, "google"),
        ),
      );
    const patch = {
      connected: true,
      displayEmail: input.accountEmail ?? input.accountLabel,
      connectedAt: new Date(),
      lastSyncStatus: "byo_oauth",
      lastSyncAt: new Date(),
      updatedAt: new Date(),
    };
    if (existing) {
      await db.update(calendarConnections).set(patch).where(eq(calendarConnections.id, existing.id));
    } else {
      await db.insert(calendarConnections).values({
        tenantId: DEFAULT_TENANT_ID,
        provider: "google",
        ...patch,
      });
    }
    if (input.provider === "google_calendar") {
      // Never await on the OAuth callback path — Google's consent screen
      // spins until our redirect returns. Busy sync runs on Calendar load.
      void syncGoogleBusy().catch(() => null);
    }
  }
  if (input.provider === "outlook_calendar") {
    void syncOutlookBusy().catch(() => null);
  }
  if (input.provider === "docusign") {
    await syncEsignSettingsFromDocuSign(input.accountLabel);
  }
}
