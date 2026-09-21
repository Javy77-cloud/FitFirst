import { and, eq, gt, lt, or, sql } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { ensureCalendarEventSyncTables } from "@/lib/db/ensure-calendar-event-sync";
import { calendarEventLinks, calendarSyncedEvents } from "@/lib/db/schema";
import type { CalendarProviderId, ProviderCalendarEvent } from "./calendar-event-map";
import { PRIMARY_CALENDAR_ID } from "./calendar-event-map";

export async function listSyncedEvents(from: Date, to: Date) {
  await ensureCalendarEventSyncTables();
  return db
    .select()
    .from(calendarSyncedEvents)
    .where(
      and(
        eq(calendarSyncedEvents.tenantId, DEFAULT_TENANT_ID),
        lt(calendarSyncedEvents.startsAt, to),
        gt(calendarSyncedEvents.endsAt, from),
      ),
    );
}

export async function hasSyncedEvents(): Promise<boolean> {
  await ensureCalendarEventSyncTables();
  const [row] = await db
    .select({ id: calendarSyncedEvents.id })
    .from(calendarSyncedEvents)
    .where(eq(calendarSyncedEvents.tenantId, DEFAULT_TENANT_ID))
    .limit(1);
  return Boolean(row);
}

export async function listEventLinks(provider?: CalendarProviderId) {
  await ensureCalendarEventSyncTables();
  return db
    .select()
    .from(calendarEventLinks)
    .where(
      and(
        eq(calendarEventLinks.tenantId, DEFAULT_TENANT_ID),
        provider ? eq(calendarEventLinks.provider, provider) : undefined,
      ),
    );
}

export async function getEventLink(activityId: string, provider: CalendarProviderId) {
  await ensureCalendarEventSyncTables();
  const [row] = await db
    .select()
    .from(calendarEventLinks)
    .where(
      and(
        eq(calendarEventLinks.tenantId, DEFAULT_TENANT_ID),
        eq(calendarEventLinks.activityId, activityId),
        eq(calendarEventLinks.provider, provider),
      ),
    );
  return row ?? null;
}

export async function saveEventLink(input: {
  activityId: string;
  provider: CalendarProviderId;
  externalId: string;
  calendarId?: string;
}) {
  await ensureCalendarEventSyncTables();
  const now = new Date();
  const calendarId = input.calendarId || PRIMARY_CALENDAR_ID;
  await db
    .insert(calendarEventLinks)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      activityId: input.activityId,
      provider: input.provider,
      calendarId,
      externalId: input.externalId,
      syncedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [calendarEventLinks.activityId, calendarEventLinks.provider],
      set: {
        externalId: input.externalId,
        calendarId,
        syncedAt: now,
        updatedAt: now,
      },
    });
}

export async function deleteEventLinksForActivity(activityId: string) {
  await ensureCalendarEventSyncTables();
  const rows = await db
    .select()
    .from(calendarEventLinks)
    .where(
      and(eq(calendarEventLinks.tenantId, DEFAULT_TENANT_ID), eq(calendarEventLinks.activityId, activityId)),
    );
  if (rows.length) {
    await db.delete(calendarEventLinks).where(eq(calendarEventLinks.activityId, activityId));
  }
  return rows;
}

export async function replaceSyncedEvents(
  provider: CalendarProviderId,
  range: { from: Date; to: Date },
  events: ProviderCalendarEvent[],
) {
  await ensureCalendarEventSyncTables();
  const now = new Date();
  const incomingIds = new Set(events.map((event) => event.externalId));
  const existing = await db
    .select()
    .from(calendarSyncedEvents)
    .where(
      and(
        eq(calendarSyncedEvents.tenantId, DEFAULT_TENANT_ID),
        eq(calendarSyncedEvents.provider, provider),
        lt(calendarSyncedEvents.startsAt, range.to),
        gt(calendarSyncedEvents.endsAt, range.from),
      ),
    );
  const stale = existing.filter((row) => !incomingIds.has(row.externalId));
  if (stale.length) {
    await db.delete(calendarSyncedEvents).where(
      or(...stale.map((row) => eq(calendarSyncedEvents.id, row.id))),
    );
  }
  if (!events.length) return 0;
  await db
    .insert(calendarSyncedEvents)
    .values(
      events.map((event) => ({
        tenantId: DEFAULT_TENANT_ID,
        provider: event.provider,
        calendarId: event.calendarId || PRIMARY_CALENDAR_ID,
        externalId: event.externalId,
        title: event.title,
        startsAt: event.startAt,
        endsAt: event.endAt,
        allDay: event.allDay,
        visibility: event.visibility,
        transparency: event.busy ? "opaque" : "transparent",
        htmlLink: event.htmlLink,
        etag: event.etag,
        syncedAt: now,
        updatedAt: now,
      })),
    )
    .onConflictDoUpdate({
      target: [
        calendarSyncedEvents.tenantId,
        calendarSyncedEvents.provider,
        calendarSyncedEvents.calendarId,
        calendarSyncedEvents.externalId,
      ],
      set: {
        title: sql`excluded.title`,
        startsAt: sql`excluded.starts_at`,
        endsAt: sql`excluded.ends_at`,
        allDay: sql`excluded.all_day`,
        visibility: sql`excluded.visibility`,
        transparency: sql`excluded.transparency`,
        htmlLink: sql`excluded.html_link`,
        etag: sql`excluded.etag`,
        syncedAt: now,
        updatedAt: now,
      },
    });
  return events.length;
}

export async function clearSyncedFor(provider: CalendarProviderId) {
  await ensureCalendarEventSyncTables();
  await db
    .delete(calendarSyncedEvents)
    .where(
      and(eq(calendarSyncedEvents.tenantId, DEFAULT_TENANT_ID), eq(calendarSyncedEvents.provider, provider)),
    );
  await db
    .delete(calendarEventLinks)
    .where(
      and(eq(calendarEventLinks.tenantId, DEFAULT_TENANT_ID), eq(calendarEventLinks.provider, provider)),
    );
}
