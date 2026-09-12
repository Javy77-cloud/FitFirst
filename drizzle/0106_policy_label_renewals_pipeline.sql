-- Policy auto-label template (agency-wide) + renewals board stage remap.
--> statement-breakpoint
ALTER TABLE "agency_settings" ADD COLUMN IF NOT EXISTS "policy_label_template" jsonb;
--> statement-breakpoint
UPDATE "renewal_queue" SET "stage" = 'contacted' WHERE "stage" = 'quoting';
--> statement-breakpoint
UPDATE "renewal_queue" SET "stage" = 'quoted' WHERE "stage" = 'offered';
--> statement-breakpoint
UPDATE "renewal_queue" SET "stage" = 'bound' WHERE "stage" = 'accepted';
