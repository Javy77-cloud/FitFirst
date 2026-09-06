ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "temperature" text;
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "first_contact_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "follow_up_template_id" uuid;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lead_follow_up_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
	"name" text NOT NULL,
	"trigger_status" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lead_follow_up_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
	"template_id" uuid NOT NULL REFERENCES "lead_follow_up_templates"("id") ON DELETE CASCADE,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"method" text NOT NULL,
	"delay_amount" integer NOT NULL,
	"delay_unit" text NOT NULL,
	"message" text,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lead_follow_up_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
	"lead_id" uuid NOT NULL REFERENCES "leads"("id") ON DELETE CASCADE,
	"template_id" uuid REFERENCES "lead_follow_up_templates"("id") ON DELETE SET NULL,
	"step_id" uuid REFERENCES "lead_follow_up_steps"("id") ON DELETE SET NULL,
	"method" text NOT NULL,
	"message" text,
	"due_at" timestamptz NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"activity_id" uuid,
	"alert_id" uuid,
	"outbound_job_id" uuid,
	"released_at" timestamptz,
	"cancelled_at" timestamptz,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_follow_up_templates_tenant_idx" ON "lead_follow_up_templates" ("tenant_id", "trigger_status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_follow_up_steps_template_idx" ON "lead_follow_up_steps" ("template_id", "sort_order");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_follow_up_queue_due_idx" ON "lead_follow_up_queue" ("tenant_id", "status", "due_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_follow_up_queue_lead_idx" ON "lead_follow_up_queue" ("lead_id", "status");
--> statement-breakpoint
UPDATE "leads" SET "temperature" = 'hot'
WHERE "temperature" IS NULL AND lower("status") IN ('new', 'contacted', 'qualified', 'in_progress', 'in-progress');
--> statement-breakpoint
UPDATE "leads" SET "temperature" = 'cold'
WHERE "temperature" IS NULL AND lower("status") IN ('lost', 'recycled');
--> statement-breakpoint
UPDATE "leads" AS l
SET "first_contact_at" = first.occurred
FROM (
	SELECT a.lead_id AS lead_id, MIN(COALESCE(al.occurred_at, a.created_at)) AS occurred
	FROM "activities" a
	LEFT JOIN "activity_logs" al ON al.activity_id = a.id
	WHERE a.lead_id IS NOT NULL
		AND a.kind IN ('call', 'email', 'sms')
	GROUP BY a.lead_id
) first
WHERE l.id = first.lead_id AND l.first_contact_at IS NULL;
--> statement-breakpoint
INSERT INTO "lead_follow_up_templates" ("id", "tenant_id", "name", "trigger_status", "enabled")
SELECT 'a0710001-a071-4111-8111-a07100000001', '11111111-1111-4111-8111-111111111111', 'Hot Lead', 'new', true
WHERE EXISTS (SELECT 1 FROM "tenants" WHERE "id" = '11111111-1111-4111-8111-111111111111')
	AND NOT EXISTS (SELECT 1 FROM "lead_follow_up_templates" WHERE "id" = 'a0710001-a071-4111-8111-a07100000001');
--> statement-breakpoint
INSERT INTO "lead_follow_up_templates" ("id", "tenant_id", "name", "trigger_status", "enabled")
SELECT 'a0710001-a071-4111-8111-a07100000002', '11111111-1111-4111-8111-111111111111', 'Not Interested', 'lost', true
WHERE EXISTS (SELECT 1 FROM "tenants" WHERE "id" = '11111111-1111-4111-8111-111111111111')
	AND NOT EXISTS (SELECT 1 FROM "lead_follow_up_templates" WHERE "id" = 'a0710001-a071-4111-8111-a07100000002');
--> statement-breakpoint
INSERT INTO "lead_follow_up_steps" ("id", "tenant_id", "template_id", "sort_order", "method", "delay_amount", "delay_unit", "message")
SELECT 'a0710001-a071-4111-8111-a07100000011', '11111111-1111-4111-8111-111111111111', 'a0710001-a071-4111-8111-a07100000001', 0, 'call', 5, 'minutes', 'Call this hot lead now.'
WHERE EXISTS (SELECT 1 FROM "lead_follow_up_templates" WHERE "id" = 'a0710001-a071-4111-8111-a07100000001')
	AND NOT EXISTS (SELECT 1 FROM "lead_follow_up_steps" WHERE "id" = 'a0710001-a071-4111-8111-a07100000011');
--> statement-breakpoint
INSERT INTO "lead_follow_up_steps" ("id", "tenant_id", "template_id", "sort_order", "method", "delay_amount", "delay_unit", "message")
SELECT 'a0710001-a071-4111-8111-a07100000012', '11111111-1111-4111-8111-111111111111', 'a0710001-a071-4111-8111-a07100000001', 1, 'text', 30, 'minutes', 'Text if the first call missed.'
WHERE EXISTS (SELECT 1 FROM "lead_follow_up_templates" WHERE "id" = 'a0710001-a071-4111-8111-a07100000001')
	AND NOT EXISTS (SELECT 1 FROM "lead_follow_up_steps" WHERE "id" = 'a0710001-a071-4111-8111-a07100000012');
--> statement-breakpoint
INSERT INTO "lead_follow_up_steps" ("id", "tenant_id", "template_id", "sort_order", "method", "delay_amount", "delay_unit", "message")
SELECT 'a0710001-a071-4111-8111-a07100000013', '11111111-1111-4111-8111-111111111111', 'a0710001-a071-4111-8111-a07100000001', 2, 'email', 2, 'hours', 'Email a same-day intro if we have not connected.'
WHERE EXISTS (SELECT 1 FROM "lead_follow_up_templates" WHERE "id" = 'a0710001-a071-4111-8111-a07100000001')
	AND NOT EXISTS (SELECT 1 FROM "lead_follow_up_steps" WHERE "id" = 'a0710001-a071-4111-8111-a07100000013');
--> statement-breakpoint
INSERT INTO "lead_follow_up_steps" ("id", "tenant_id", "template_id", "sort_order", "method", "delay_amount", "delay_unit", "message")
SELECT 'a0710001-a071-4111-8111-a07100000014', '11111111-1111-4111-8111-111111111111', 'a0710001-a071-4111-8111-a07100000001', 3, 'call', 1, 'days', 'Second call the next day.'
WHERE EXISTS (SELECT 1 FROM "lead_follow_up_templates" WHERE "id" = 'a0710001-a071-4111-8111-a07100000001')
	AND NOT EXISTS (SELECT 1 FROM "lead_follow_up_steps" WHERE "id" = 'a0710001-a071-4111-8111-a07100000014');
--> statement-breakpoint
INSERT INTO "lead_follow_up_steps" ("id", "tenant_id", "template_id", "sort_order", "method", "delay_amount", "delay_unit", "message")
SELECT 'a0710001-a071-4111-8111-a07100000015', '11111111-1111-4111-8111-111111111111', 'a0710001-a071-4111-8111-a07100000002', 0, 'email', 30, 'days', 'Not-interested check-in at 30 days.'
WHERE EXISTS (SELECT 1 FROM "lead_follow_up_templates" WHERE "id" = 'a0710001-a071-4111-8111-a07100000002')
	AND NOT EXISTS (SELECT 1 FROM "lead_follow_up_steps" WHERE "id" = 'a0710001-a071-4111-8111-a07100000015');
--> statement-breakpoint
INSERT INTO "lead_follow_up_steps" ("id", "tenant_id", "template_id", "sort_order", "method", "delay_amount", "delay_unit", "message")
SELECT 'a0710001-a071-4111-8111-a07100000016', '11111111-1111-4111-8111-111111111111', 'a0710001-a071-4111-8111-a07100000002', 1, 'email', 60, 'days', 'Not-interested check-in at 60 days.'
WHERE EXISTS (SELECT 1 FROM "lead_follow_up_templates" WHERE "id" = 'a0710001-a071-4111-8111-a07100000002')
	AND NOT EXISTS (SELECT 1 FROM "lead_follow_up_steps" WHERE "id" = 'a0710001-a071-4111-8111-a07100000016');
--> statement-breakpoint
INSERT INTO "lead_follow_up_steps" ("id", "tenant_id", "template_id", "sort_order", "method", "delay_amount", "delay_unit", "message")
SELECT 'a0710001-a071-4111-8111-a07100000017', '11111111-1111-4111-8111-111111111111', 'a0710001-a071-4111-8111-a07100000002', 2, 'email', 90, 'days', 'Not-interested check-in at 90 days.'
WHERE EXISTS (SELECT 1 FROM "lead_follow_up_templates" WHERE "id" = 'a0710001-a071-4111-8111-a07100000002')
	AND NOT EXISTS (SELECT 1 FROM "lead_follow_up_steps" WHERE "id" = 'a0710001-a071-4111-8111-a07100000017');
