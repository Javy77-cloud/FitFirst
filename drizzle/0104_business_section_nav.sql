-- Agency-wide business detail chip-nav order (max 12 section ids).
--> statement-breakpoint
ALTER TABLE "agency_settings" ADD COLUMN IF NOT EXISTS "business_section_nav" jsonb;
