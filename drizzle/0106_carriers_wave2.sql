-- Carriers Wave 2: last contacted, AM Best history timeline, activity events.
-- Additive only. No Zoho writes.
--> statement-breakpoint
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "last_contacted_at" timestamp with time zone;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "carrier_am_best_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "carrier_id" uuid NOT NULL REFERENCES "carriers"("id") ON DELETE cascade,
  "rating" text,
  "outlook" text,
  "rated_at" timestamp with time zone,
  "actor_id" uuid,
  "actor_name" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "carrier_am_best_history_carrier_idx"
  ON "carrier_am_best_history" ("tenant_id", "carrier_id", "created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "carrier_activity_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "carrier_id" uuid NOT NULL REFERENCES "carriers"("id") ON DELETE cascade,
  "kind" text NOT NULL,
  "title" text NOT NULL,
  "detail" text,
  "actor_id" uuid,
  "actor_name" text,
  "occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "carrier_activity_events_carrier_idx"
  ON "carrier_activity_events" ("tenant_id", "carrier_id", "occurred_at");
