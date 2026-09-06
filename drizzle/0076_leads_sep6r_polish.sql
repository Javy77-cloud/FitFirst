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
--> statement-breakpoint
INSERT INTO "lead_follow_up_templates" ("id", "tenant_id", "name", "trigger_status", "enabled")
SELECT 'a0710001-a071-4111-8111-a07100000001', '11111111-1111-4111-8111-111111111111', 'Aggressive', 'new', true
WHERE EXISTS (SELECT 1 FROM "tenants" WHERE "id" = '11111111-1111-4111-8111-111111111111')
	AND NOT EXISTS (SELECT 1 FROM "lead_follow_up_templates" WHERE "id" = 'a0710001-a071-4111-8111-a07100000001');
--> statement-breakpoint
INSERT INTO "lead_follow_up_templates" ("id", "tenant_id", "name", "trigger_status", "enabled")
SELECT 'a0710001-a071-4111-8111-a07100000003', '11111111-1111-4111-8111-111111111111', 'Steady', 'warm', true
WHERE EXISTS (SELECT 1 FROM "tenants" WHERE "id" = '11111111-1111-4111-8111-111111111111')
	AND NOT EXISTS (SELECT 1 FROM "lead_follow_up_templates" WHERE "id" = 'a0710001-a071-4111-8111-a07100000003');
--> statement-breakpoint
INSERT INTO "lead_follow_up_templates" ("id", "tenant_id", "name", "trigger_status", "enabled")
SELECT 'a0710001-a071-4111-8111-a07100000002', '11111111-1111-4111-8111-111111111111', 'Drip', 'cold', true
WHERE EXISTS (SELECT 1 FROM "tenants" WHERE "id" = '11111111-1111-4111-8111-111111111111')
	AND NOT EXISTS (SELECT 1 FROM "lead_follow_up_templates" WHERE "id" = 'a0710001-a071-4111-8111-a07100000002');
--> statement-breakpoint
INSERT INTO "lead_follow_up_templates" ("id", "tenant_id", "name", "trigger_status", "enabled")
SELECT 'a0710001-a071-4111-8111-a07100000004', '11111111-1111-4111-8111-111111111111', 'Default', 'default', true
WHERE EXISTS (SELECT 1 FROM "tenants" WHERE "id" = '11111111-1111-4111-8111-111111111111')
	AND NOT EXISTS (SELECT 1 FROM "lead_follow_up_templates" WHERE "id" = 'a0710001-a071-4111-8111-a07100000004');

