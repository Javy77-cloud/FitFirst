"use server";

import { revalidatePath } from "next/cache";
import { flashAction } from "@/lib/flash-action";
import { currentDeskSession } from "@/lib/auth/session";
import { eventSyncWindow } from "@/lib/integrations/calendar-event-map";
import { syncConnectedCalendarsBothWays } from "@/lib/integrations/calendar-event-sync";
import { isRedirectError } from "@/lib/lifecycle/shop";

function refreshCalendar() {
  revalidatePath("/calendar");
  revalidatePath("/settings/integrations");
}

export async function syncDeskBusyNow() {
  const session = await currentDeskSession();
  if (!session.signedIn) return;
  try {
    await syncConnectedCalendarsBothWays(eventSyncWindow(new Date(), new Date()));
    refreshCalendar();
    flashAction("/calendar", "busy-synced");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "Busy sync failed.";
    const { recordByoOauthError } = await import("@/lib/integrations/oauth-store");
    await recordByoOauthError("google_calendar", message).catch(() => undefined);
    flashAction("/calendar", "busy-sync-failed", "error");
  }
}
