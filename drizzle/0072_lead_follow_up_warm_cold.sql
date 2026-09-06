UPDATE "lead_follow_up_templates"
SET "name" = 'Hot', "updated_at" = now()
WHERE "id" = 'a0710001-a071-4111-8111-a07100000001' AND "name" = 'Hot Lead';
--> statement-breakpoint
UPDATE "lead_follow_up_templates"
SET "name" = 'Cold (not interested)', "trigger_status" = 'cold', "updated_at" = now()
WHERE "id" = 'a0710001-a071-4111-8111-a07100000002';
--> statement-breakpoint
INSERT INTO "lead_follow_up_templates" ("id", "tenant_id", "name", "trigger_status", "enabled")
SELECT 'a0710001-a071-4111-8111-a07100000003', '11111111-1111-4111-8111-111111111111', 'Warm', 'warm', true
WHERE EXISTS (SELECT 1 FROM "tenants" WHERE "id" = '11111111-1111-4111-8111-111111111111')
	AND NOT EXISTS (SELECT 1 FROM "lead_follow_up_templates" WHERE "id" = 'a0710001-a071-4111-8111-a07100000003');
--> statement-breakpoint
INSERT INTO "lead_follow_up_steps" ("id", "tenant_id", "template_id", "sort_order", "method", "delay_amount", "delay_unit", "message")
SELECT 'a0710001-a071-4111-8111-a07100000021', '11111111-1111-4111-8111-111111111111', 'a0710001-a071-4111-8111-a07100000003', 0, 'call', 1, 'days', 'Warm follow-up call.'
WHERE EXISTS (SELECT 1 FROM "lead_follow_up_templates" WHERE "id" = 'a0710001-a071-4111-8111-a07100000003')
	AND NOT EXISTS (SELECT 1 FROM "lead_follow_up_steps" WHERE "id" = 'a0710001-a071-4111-8111-a07100000021');
--> statement-breakpoint
INSERT INTO "lead_follow_up_steps" ("id", "tenant_id", "template_id", "sort_order", "method", "delay_amount", "delay_unit", "message")
SELECT 'a0710001-a071-4111-8111-a07100000022', '11111111-1111-4111-8111-111111111111', 'a0710001-a071-4111-8111-a07100000003', 1, 'text', 3, 'days', 'Warm check-in text.'
WHERE EXISTS (SELECT 1 FROM "lead_follow_up_templates" WHERE "id" = 'a0710001-a071-4111-8111-a07100000003')
	AND NOT EXISTS (SELECT 1 FROM "lead_follow_up_steps" WHERE "id" = 'a0710001-a071-4111-8111-a07100000022');
--> statement-breakpoint
INSERT INTO "lead_follow_up_steps" ("id", "tenant_id", "template_id", "sort_order", "method", "delay_amount", "delay_unit", "message")
SELECT 'a0710001-a071-4111-8111-a07100000023', '11111111-1111-4111-8111-111111111111', 'a0710001-a071-4111-8111-a07100000003', 2, 'email', 7, 'days', 'Warm check-in email.'
WHERE EXISTS (SELECT 1 FROM "lead_follow_up_templates" WHERE "id" = 'a0710001-a071-4111-8111-a07100000003')
	AND NOT EXISTS (SELECT 1 FROM "lead_follow_up_steps" WHERE "id" = 'a0710001-a071-4111-8111-a07100000023');
--> statement-breakpoint
INSERT INTO "lead_follow_up_steps" ("id", "tenant_id", "template_id", "sort_order", "method", "delay_amount", "delay_unit", "message")
SELECT 'a0710001-a071-4111-8111-a07100000024', '11111111-1111-4111-8111-111111111111', 'a0710001-a071-4111-8111-a07100000003', 3, 'call', 14, 'days', 'Second warm call.'
WHERE EXISTS (SELECT 1 FROM "lead_follow_up_templates" WHERE "id" = 'a0710001-a071-4111-8111-a07100000003')
	AND NOT EXISTS (SELECT 1 FROM "lead_follow_up_steps" WHERE "id" = 'a0710001-a071-4111-8111-a07100000024');
--> statement-breakpoint
UPDATE "lead_follow_up_queue" AS q
SET "status" = 'cancelled', "cancelled_at" = now(), "updated_at" = now()
FROM "leads" AS l
WHERE q.lead_id = l.id
	AND q.status = 'queued'
	AND l.first_contact_at IS NULL
	AND lower(l.status) = 'new';
--> statement-breakpoint
UPDATE "activities" AS a
SET "status" = 'cancelled', "updated_at" = now()
FROM "lead_follow_up_queue" AS q
JOIN "leads" AS l ON l.id = q.lead_id
WHERE a.id = q.activity_id
	AND q.status = 'cancelled'
	AND l.first_contact_at IS NULL
	AND lower(l.status) = 'new'
	AND a.kind = 'task'
	AND a.status = 'open';
