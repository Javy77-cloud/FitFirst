-- Two-way titled calendar events. Provider-agnostic store (Google first; Outlook same tables).
-- Primary calendar only this wave. No secrets.
--> statement-breakpoint
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
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "calendar_synced_events_ext_uidx"
  ON "calendar_synced_events" ("tenant_id", "provider", "calendar_id", "external_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calendar_synced_events_when_idx"
  ON "calendar_synced_events" ("tenant_id", "starts_at", "ends_at");
--> statement-breakpoint
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
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "calendar_event_links_activity_uidx"
  ON "calendar_event_links" ("activity_id", "provider");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "calendar_event_links_ext_uidx"
  ON "calendar_event_links" ("tenant_id", "provider", "calendar_id", "external_id");
