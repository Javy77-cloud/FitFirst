"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentDeskSession } from "@/lib/auth/session";
import { syncConnectedBusy } from "@/lib/integrations/calendar-busy";

function refreshCalendar() {
  revalidatePath("/calendar");
  revalidatePath("/settings/integrations");
}

export async function syncDeskBusyNow() {
  const session = await currentDeskSession();
  if (!session.signedIn) return;
  try {
    await syncConnectedBusy();
    refreshCalendar();
    redirect("/calendar?notice=busy-synced");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Busy sync failed.";
    const { recordByoOauthError } = await import("@/lib/integrations/oauth-store");
    await recordByoOauthError("google_calendar", message).catch(() => undefined);
    redirect("/calendar?notice=busy-sync-failed");
  }
}
