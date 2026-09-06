-- sep6r: rename follow-up templates; reset leads-queue widths to platform defaults.
-- Additive only. Does not wipe or reseed the Zoho book.
--> statement-breakpoint
UPDATE "lead_follow_up_templates"
SET "name" = 'Aggressive', "updated_at" = now()
WHERE "name" IN ('Hot', 'Hot Lead');
--> statement-breakpoint
UPDATE "lead_follow_up_templates"
SET "name" = 'Steady', "updated_at" = now()
WHERE "name" = 'Warm';
--> statement-breakpoint
UPDATE "lead_follow_up_templates"
SET "name" = 'Drip', "updated_at" = now()
WHERE "name" IN ('Cold', 'Cold (not interested)');
--> statement-breakpoint
UPDATE "desk_column_prefs"
SET "widths" = '{}'::jsonb, "updated_at" = now()
WHERE "table_key" = 'leads-queue';
