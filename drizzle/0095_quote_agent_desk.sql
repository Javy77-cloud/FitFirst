-- sep7dk: agent Quotes desk — rating, status, reason-for-no, notes thread, bind requirements.
-- Additive only. Does not wipe or reseed. No Policies. Appetite log unchanged.
-- Also re-asserts prior Quotes outcome cols (IF NOT EXISTS) so Quotes can load even if 0093/0094 lagged.
--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "risk_outcome" text;
--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "next_step" text;
--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "carrier_open_url" text;
--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "agent_rating" integer;
--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "agent_status" text DEFAULT 'new';
--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "reason_for_no" text;
--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "bind_requirements" jsonb;
--> statement-breakpoint
UPDATE "quotes" SET "agent_status" = 'new' WHERE "agent_status" IS NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quote_notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "quote_id" uuid NOT NULL REFERENCES "quotes"("id") ON DELETE CASCADE,
  "body" text NOT NULL,
  "created_by" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quote_notes_quote_idx" ON "quote_notes" ("tenant_id", "quote_id");
