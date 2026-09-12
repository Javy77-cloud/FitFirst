-- Agency pref: admins may override auto-generated policy labels (default off — rename stays off the record).
--> statement-breakpoint
ALTER TABLE "agency_settings" ADD COLUMN IF NOT EXISTS "allow_policy_label_override" boolean DEFAULT false NOT NULL;
