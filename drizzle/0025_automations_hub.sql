ALTER TABLE "email_signatures" ADD COLUMN IF NOT EXISTS "owner_user_id" uuid REFERENCES "users"("id");
--> statement-breakpoint
ALTER TABLE "email_signatures" ADD COLUMN IF NOT EXISTS "approval_status" text DEFAULT 'live' NOT NULL;
--> statement-breakpoint
ALTER TABLE "email_signatures" ADD COLUMN IF NOT EXISTS "submitted_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "email_signatures" ADD COLUMN IF NOT EXISTS "reviewed_by" uuid REFERENCES "users"("id");
--> statement-breakpoint
ALTER TABLE "email_signatures" ADD COLUMN IF NOT EXISTS "reviewed_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "email_signatures" ADD COLUMN IF NOT EXISTS "review_note" text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "guided_automations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "name" text NOT NULL,
  "trigger_kind" text NOT NULL,
  "trigger_value" text,
  "condition_kind" text DEFAULT 'always' NOT NULL,
  "condition_value" text,
  "action_kind" text NOT NULL,
  "action_value" text,
  "enabled" boolean DEFAULT true NOT NULL,
  "is_example" boolean DEFAULT false NOT NULL,
  "created_by" uuid REFERENCES "users"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guided_automations_tenant_idx" ON "guided_automations" ("tenant_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bulk_sms_drafts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "name" text NOT NULL,
  "body" text NOT NULL,
  "audience_label" text,
  "status" text DEFAULT 'draft' NOT NULL,
  "created_by" uuid REFERENCES "users"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bulk_sms_drafts_tenant_idx" ON "bulk_sms_drafts" ("tenant_id");
