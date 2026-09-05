ALTER TABLE "guided_automations"
  ADD COLUMN IF NOT EXISTS "visibility" text DEFAULT 'both' NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "automation_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "automation_id" uuid NOT NULL REFERENCES "guided_automations"("id"),
  "fired_at" timestamptz DEFAULT now() NOT NULL,
  "trigger_kind" text NOT NULL,
  "action_kind" text NOT NULL,
  "created_task" boolean DEFAULT false NOT NULL,
  "created_alert" boolean DEFAULT false NOT NULL,
  "activity_id" uuid,
  "alert_id" uuid,
  "entity_type" text,
  "entity_id" uuid,
  "audience" text DEFAULT 'both' NOT NULL,
  "summary" text DEFAULT '' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "automation_runs_tenant_idx" ON "automation_runs" ("tenant_id", "fired_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "automation_runs_playbook_idx" ON "automation_runs" ("tenant_id", "automation_id");
