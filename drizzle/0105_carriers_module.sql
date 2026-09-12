-- Agency-first carriers module: identity/contact/AM Best/commission schedule columns.
-- Additive only. Prefer existing columns (active, claims_phone, NB/renewal %) when present.
--> statement-breakpoint
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "phone" text;
--> statement-breakpoint
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "email" text;
--> statement-breakpoint
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "mailing_address" text;
--> statement-breakpoint
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "claims_contact_name" text;
--> statement-breakpoint
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "claims_contact_email" text;
--> statement-breakpoint
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "marketing_contact_name" text;
--> statement-breakpoint
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "marketing_contact_phone" text;
--> statement-breakpoint
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "marketing_contact_email" text;
--> statement-breakpoint
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "am_best_outlook" text;
--> statement-breakpoint
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "am_best_date" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "commission_schedule" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
-- Desk status: active | pending | inactive (header dot). Falls back to boolean `active` when null.
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "desk_status" text;
