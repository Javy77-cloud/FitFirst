-- Agency-wide contact detail left-nav order (max 8 section ids).
--> statement-breakpoint
ALTER TABLE "agency_settings" ADD COLUMN IF NOT EXISTS "contact_section_nav" jsonb;
