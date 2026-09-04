"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { calendarConnections } from "@/lib/db/schema";
import { requireAdminAction } from "@/lib/auth/guards";
import {
  completeGoogleOAuthStub,
  syncGoogleCalendarIn,
  syncGoogleCalendarOut,
} from "@/lib/integrations/google-calendar";

async function loadConnection() {
  const [row] = await db
    .select()
    .from(calendarConnections)
    .where(
      and(eq(calendarConnections.tenantId, DEFAULT_TENANT_ID), eq(calendarConnections.provider, "google")),
    );
  return row ?? null;
}

export async function connectGoogleCalendar(formData: FormData) {
  await requireAdminAction("Only an admin can connect the agency Google Calendar.");
  const stub = completeGoogleOAuthStub(String(formData.get("displayEmail") ?? ""));
  const existing = await loadConnection();
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
  revalidatePath("/calendar");
  redirect("/calendar?notice=google-connected");
}

export async function disconnectGoogleCalendar() {
  await requireAdminAction("Only an admin can disconnect the agency Google Calendar.");
  const existing = await loadConnection();
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
  revalidatePath("/calendar");
  redirect("/calendar?notice=google-disconnected");
}

export async function syncGoogleCalendar(formData: FormData) {
  await requireAdminAction("Only an admin can sync the agency Google Calendar.");
  const direction = String(formData.get("direction") ?? "in") === "out" ? "out" : "in";
  const result = direction === "out" ? syncGoogleCalendarOut() : syncGoogleCalendarIn();
  const existing = await loadConnection();
  if (existing) {
    await db
      .update(calendarConnections)
      .set({
        lastSyncAt: new Date(),
        lastSyncDirection: direction,
        lastSyncStatus: result.status,
        updatedAt: new Date(),
      })
      .where(eq(calendarConnections.id, existing.id));
  }
  revalidatePath("/calendar");
  redirect(`/calendar?notice=google-sync-${result.status}`);
}
