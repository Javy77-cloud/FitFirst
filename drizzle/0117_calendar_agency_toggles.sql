-- Agency calendar prefs: Sunday non-working tint + US federal holiday labels. Additive only.
--> statement-breakpoint
ALTER TABLE "agency_settings" ADD COLUMN IF NOT EXISTS "calendar_mark_sunday_non_working" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "agency_settings" ADD COLUMN IF NOT EXISTS "calendar_show_us_federal_holidays" boolean DEFAULT true NOT NULL;
