import { sql } from "@/lib/db";

/** Exact DDL from drizzle/0147_calendar_event_sync.sql — IF NOT EXISTS safe. */
const CALENDAR_EVENT_SYNC_0147_SQL = `
CREATE TABLE IF NOT EXISTS "calendar_synced_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "provider" text NOT NULL,
  "calendar_id" text NOT NULL DEFAULT 'primary',
  "external_id" text NOT NULL,
  "title" text NOT NULL,
  "starts_at" timestamptz NOT NULL,
  "ends_at" timestamptz NOT NULL,
  "all_day" boolean DEFAULT false NOT NULL,
  "visibility" text,
  "transparency" text,
  "html_link" text,
  "etag" text,
  "synced_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "calendar_synced_events_ext_uidx"
  ON "calendar_synced_events" ("tenant_id", "provider", "calendar_id", "external_id");
CREATE INDEX IF NOT EXISTS "calendar_synced_events_when_idx"
  ON "calendar_synced_events" ("tenant_id", "starts_at", "ends_at");
CREATE TABLE IF NOT EXISTS "calendar_event_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "activity_id" uuid NOT NULL REFERENCES "activities"("id") ON DELETE CASCADE,
  "provider" text NOT NULL,
  "calendar_id" text NOT NULL DEFAULT 'primary',
  "external_id" text NOT NULL,
  "synced_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "calendar_event_links_activity_uidx"
  ON "calendar_event_links" ("activity_id", "provider");
CREATE UNIQUE INDEX IF NOT EXISTS "calendar_event_links_ext_uidx"
  ON "calendar_event_links" ("tenant_id", "provider", "calendar_id", "external_id");
`;

let ensured = false;

export async function calendarEventSyncTablesExist(): Promise<boolean> {
  const rows = await sql<[{ exists: boolean }]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'calendar_synced_events'
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

/** Apply drizzle/0147 on this connection if the event-sync tables are missing. Idempotent. */
export async function ensureCalendarEventSyncTables(): Promise<boolean> {
  if (ensured) return true;
  if (await calendarEventSyncTablesExist()) {
    ensured = true;
    return true;
  }
  await sql.unsafe(CALENDAR_EVENT_SYNC_0147_SQL);
  const ok = await calendarEventSyncTablesExist();
  if (ok) ensured = true;
  return ok;
}
