import { and, eq, gt, lt } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { calendarBusyBlocks } from "@/lib/db/schema";
import { liveAccessToken } from "./oauth-exchange";
import { loadByoConnection } from "./oauth-store";
import type { ByoOauthProviderId } from "./oauth-specs";

export type BusyWindow = {
  id: string;
  provider: string;
  startAt: Date;
  endAt: Date;
  title: string;
};

export type SerializedBusyBlock = {
  id: string;
  provider: string;
  startAt: string;
  endAt: string;
  title: string;
};

export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime();
}

export function serializeBusyBlock(row: BusyWindow): SerializedBusyBlock {
  return {
    id: row.id,
    provider: row.provider,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    title: row.title,
  };
}

export async function listBusyWindows(from: Date, to: Date): Promise<BusyWindow[]> {
  const rows = await db
    .select()
    .from(calendarBusyBlocks)
    .where(
      and(
        eq(calendarBusyBlocks.tenantId, DEFAULT_TENANT_ID),
        lt(calendarBusyBlocks.startsAt, to),
        gt(calendarBusyBlocks.endsAt, from),
      ),
    );
  return rows.map((row) => ({
    id: row.id,
    provider: row.provider,
    startAt: row.startsAt,
    endAt: row.endsAt,
    title: row.title || "Busy",
  }));
}

export async function findBusyConflicts(start: Date, end: Date): Promise<BusyWindow[]> {
  if (end.getTime() <= start.getTime()) return [];
  const windows = await listBusyWindows(start, end);
  return windows.filter((row) => rangesOverlap(start, end, row.startAt, row.endAt));
}

export function busyConflictMessage(conflicts: BusyWindow[]): string {
  const first = conflicts[0];
  if (!first) return "That slot is busy on a connected calendar.";
  const when = first.startAt.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const vendor = first.provider === "outlook_calendar" ? "Outlook" : "Google";
  return `That slot overlaps ${vendor} busy (${when}). Pick another time or force the booking.`;
}

async function replaceBusy(provider: ByoOauthProviderId, blocks: { id: string; start: Date; end: Date; title: string }[]) {
  await db
    .delete(calendarBusyBlocks)
    .where(
      and(eq(calendarBusyBlocks.tenantId, DEFAULT_TENANT_ID), eq(calendarBusyBlocks.provider, provider)),
    );
  if (!blocks.length) return 0;
  const now = new Date();
  await db.insert(calendarBusyBlocks).values(
    blocks.map((block) => ({
      tenantId: DEFAULT_TENANT_ID,
      provider,
      externalId: block.id,
      startsAt: block.start,
      endsAt: block.end,
      title: block.title,
      syncedAt: now,
    })),
  );
  return blocks.length;
}

export async function syncGoogleBusy(): Promise<number> {
  const token = await liveAccessToken("google_calendar");
  if (!token) throw new Error("Google Calendar is not connected.");
  const timeMin = new Date();
  const timeMax = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
  const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: "primary" }],
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const data = (await res.json()) as {
    error?: { message?: string };
    calendars?: { primary?: { busy?: { start?: string; end?: string }[] } };
  };
  if (!res.ok) throw new Error(data.error?.message || `Google FreeBusy failed (${res.status}).`);
  const busy = data.calendars?.primary?.busy ?? [];
  const blocks = busy
    .map((row, index) => {
      const start = row.start ? new Date(row.start) : null;
      const end = row.end ? new Date(row.end) : null;
      if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
      return { id: `gcal-${start.getTime()}-${end.getTime()}-${index}`, start, end, title: "Busy" };
    })
    .filter((row): row is { id: string; start: Date; end: Date; title: string } => Boolean(row));
  const count = await replaceBusy("google_calendar", blocks);
  await stampBusySync("google_calendar");
  return count;
}

export async function syncOutlookBusy(): Promise<number> {
  const token = await liveAccessToken("outlook_calendar");
  if (!token) throw new Error("Outlook Calendar is not connected.");
  const start = new Date();
  const end = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
  const url = new URL("https://graph.microsoft.com/v1.0/me/calendarView");
  url.searchParams.set("startDateTime", start.toISOString());
  url.searchParams.set("endDateTime", end.toISOString());
  url.searchParams.set("$select", "id,subject,showAs,start,end");
  url.searchParams.set("$top", "200");
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.timezone="UTC"' },
    signal: AbortSignal.timeout(10_000),
  });
  const data = (await res.json()) as {
    error?: { message?: string };
    value?: {
      id?: string;
      subject?: string;
      showAs?: string;
      start?: { dateTime?: string };
      end?: { dateTime?: string };
    }[];
  };
  if (!res.ok) throw new Error(data.error?.message || `Outlook calendarView failed (${res.status}).`);
  const busyShow = new Set(["busy", "oof", "workingelsewhere", "tentative"]);
  const blocks = (data.value ?? [])
    .filter((row) => busyShow.has((row.showAs ?? "").toLowerCase()))
    .map((row, index) => {
      const startAt = row.start?.dateTime ? new Date(`${row.start.dateTime}Z`.replace(/ZZ$/, "Z")) : null;
      const endAt = row.end?.dateTime ? new Date(`${row.end.dateTime}Z`.replace(/ZZ$/, "Z")) : null;
      if (!startAt || !endAt || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
        return null;
      }
      return {
        id: row.id || `outlook-${startAt.getTime()}-${index}`,
        start: startAt,
        end: endAt,
        title: "Busy",
      };
    })
    .filter((row): row is { id: string; start: Date; end: Date; title: string } => Boolean(row));
  const count = await replaceBusy("outlook_calendar", blocks);
  await stampBusySync("outlook_calendar");
  return count;
}

async function stampBusySync(provider: "google_calendar" | "outlook_calendar") {
  const row = await loadByoConnection(provider);
  if (!row) return;
  const { integrationConnections } = await import("@/lib/db/schema");
  const { eq } = await import("drizzle-orm");
  await db
    .update(integrationConnections)
    .set({ lastBusySyncAt: new Date(), updatedAt: new Date() })
    .where(eq(integrationConnections.id, row.id));
}

export async function syncConnectedBusy(): Promise<{ google: number | null; outlook: number | null }> {
  const [googleRow, outlookRow] = await Promise.all([
    loadByoConnection("google_calendar"),
    loadByoConnection("outlook_calendar"),
  ]);
  let google: number | null = null;
  let outlook: number | null = null;
  if (googleRow?.connected) google = await syncGoogleBusy();
  if (outlookRow?.connected) outlook = await syncOutlookBusy();
  return { google, outlook };
}

export async function clearBusyFor(provider: "google_calendar" | "outlook_calendar") {
  await db
    .delete(calendarBusyBlocks)
    .where(
      and(eq(calendarBusyBlocks.tenantId, DEFAULT_TENANT_ID), eq(calendarBusyBlocks.provider, provider)),
    );
}

export async function meetHelperAvailable(): Promise<boolean> {
  const [calendar, meet] = await Promise.all([
    loadByoConnection("google_calendar"),
    loadByoConnection("google_meet"),
  ]);
  return Boolean((calendar?.connected && calendar.connectMode === "byo") || (meet?.connected && meet.connectMode === "byo"));
}
