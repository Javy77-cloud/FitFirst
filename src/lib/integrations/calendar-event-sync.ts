import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { activities, integrationConnections, type CalendarSyncedEvent } from "@/lib/db/schema";
import { and, eq, isNotNull } from "drizzle-orm";
import { syncConnectedBusy } from "./calendar-busy";
import type { CalendarActivity } from "@/lib/ops/calendar";
import {
  eventSyncWindow,
  shouldImportAsOverlay,
  shouldPushDeskActivity,
  type CalendarEventDraft,
  type CalendarProviderId,
} from "./calendar-event-map";
import { listConnectedCalendarProviders } from "./calendar-provider";
import {
  deleteEventLinksForActivity,
  getEventLink,
  listEventLinks,
  replaceSyncedEvents,
  saveEventLink,
} from "./calendar-event-store";
import { loadByoConnection, recordByoOauthError } from "./oauth-store";

async function stampCalendarSync(provider: CalendarProviderId) {
  const row = await loadByoConnection(provider);
  if (!row) return;
  await db
    .update(integrationConnections)
    .set({ lastBusySyncAt: new Date(), lastOauthError: null, updatedAt: new Date() })
    .where(eq(integrationConnections.id, row.id));
}

export type CalendarEventSyncResult = {
  imported: number;
  pushed: number;
  providers: CalendarProviderId[];
};

function draftFromActivity(activity: {
  id: string;
  title: string;
  notes?: string | null;
  meetingLocation?: string | null;
  startAt: Date | string | null;
  endAt: Date | string | null;
}): CalendarEventDraft | null {
  if (!shouldPushDeskActivity(activity)) return null;
  return {
    activityId: activity.id,
    title: activity.title,
    startAt: new Date(activity.startAt!),
    endAt: new Date(activity.endAt!),
    notes: activity.notes ?? null,
    location: activity.meetingLocation ?? null,
  };
}

export async function importConnectedEvents(range: { from: Date; to: Date }): Promise<number> {
  const providers = await listConnectedCalendarProviders();
  let imported = 0;
  for (const provider of providers) {
    const remote = await provider.listEvents(range);
    const links = await listEventLinks(provider.id);
    const linked = new Set(links.map((row) => row.externalId));
    const overlays = remote.filter((event) => shouldImportAsOverlay(event, linked));
    imported += await replaceSyncedEvents(provider.id, range, overlays);
    await stampCalendarSync(provider.id);
  }
  return imported;
}

export async function pushUnlinkedDeskEvents(range: { from: Date; to: Date }): Promise<number> {
  const providers = await listConnectedCalendarProviders();
  if (!providers.length) return 0;
  const rows = await db
    .select()
    .from(activities)
    .where(and(eq(activities.tenantId, DEFAULT_TENANT_ID), isNotNull(activities.startAt), isNotNull(activities.endAt)));
  let pushed = 0;
  for (const row of rows) {
    if (!shouldPushDeskActivity(row)) continue;
    const start = row.startAt ? new Date(row.startAt) : null;
    const end = row.endAt ? new Date(row.endAt) : null;
    if (!start || !end || end.getTime() < range.from.getTime() || start.getTime() > range.to.getTime()) {
      continue;
    }
    const result = await pushDeskActivityToCalendars(row);
    if (result.pushed) pushed += 1;
  }
  return pushed;
}

export async function pushDeskActivityToCalendars(
  activity: {
    id: string;
    title: string;
    notes?: string | null;
    meetingLocation?: string | null;
    startAt: Date | string | null;
    endAt: Date | string | null;
  },
  opts?: { existingExternalId?: { provider: CalendarProviderId; externalId: string } },
): Promise<{ pushed: boolean }> {
  const draft = draftFromActivity(activity);
  if (!draft) return { pushed: false };
  const providers = await listConnectedCalendarProviders();
  if (!providers.length) return { pushed: false };
  let pushed = false;
  for (const provider of providers) {
    try {
      if (opts?.existingExternalId?.provider === provider.id) {
        await saveEventLink({
          activityId: activity.id,
          provider: provider.id,
          externalId: opts.existingExternalId.externalId,
        });
        pushed = true;
        continue;
      }
      const existing = await getEventLink(activity.id, provider.id);
      if (existing) {
        try {
          await provider.updateEvent(existing.externalId, draft);
          await saveEventLink({
            activityId: activity.id,
            provider: provider.id,
            externalId: existing.externalId,
          });
          pushed = true;
          continue;
        } catch (error) {
          if (!(error instanceof Error) || !/EVENT_GONE/.test(error.message)) throw error;
        }
      }
      const created = await provider.createEvent(draft);
      await saveEventLink({
        activityId: activity.id,
        provider: provider.id,
        externalId: created.externalId,
      });
      pushed = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Calendar event push failed.";
      await recordByoOauthError(provider.id, message).catch(() => undefined);
    }
  }
  return { pushed };
}

export async function deleteDeskActivityFromCalendars(activityId: string) {
  const links = await deleteEventLinksForActivity(activityId);
  const providers = await listConnectedCalendarProviders();
  for (const link of links) {
    const provider = providers.find((row) => row.id === link.provider);
    if (!provider) continue;
    try {
      await provider.deleteEvent(link.externalId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Calendar event delete failed.";
      await recordByoOauthError(provider.id, message).catch(() => undefined);
    }
  }
}

export async function syncConnectedCalendars(range?: { from: Date; to: Date }): Promise<CalendarEventSyncResult> {
  const window = range ?? eventSyncWindow(new Date(), new Date());
  const providers = await listConnectedCalendarProviders();
  const imported = await importConnectedEvents(window);
  await syncConnectedBusy();
  return {
    imported,
    pushed: 0,
    providers: providers.map((row) => row.id),
  };
}

export function syncedEventToDeskActivity(row: CalendarSyncedEvent): CalendarActivity {
  return {
    id: row.id,
    kind: "meeting",
    title: row.title,
    status: "open",
    dueAt: row.startsAt,
    startAt: row.startsAt,
    endAt: row.endsAt,
    assignee: null,
    contactId: null,
    dealId: null,
    policyId: null,
    notes: null,
    origin: "external",
    calendarProvider: row.provider,
    calendarHtmlLink: row.htmlLink,
    calendarVisibility: row.visibility,
  };
}

export async function syncConnectedCalendarsBothWays(
  range?: { from: Date; to: Date },
): Promise<CalendarEventSyncResult> {
  const window = range ?? eventSyncWindow(new Date(), new Date());
  const imported = await importConnectedEvents(window);
  const pushed = await pushUnlinkedDeskEvents(window);
  await syncConnectedBusy();
  const providers = await listConnectedCalendarProviders();
  return { imported, pushed, providers: providers.map((row) => row.id) };
}
