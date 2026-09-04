CREATE TABLE IF NOT EXISTS "eo_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"occurred_at" timestamptz DEFAULT now() NOT NULL,
	"actor_id" uuid,
	"actor_name" text DEFAULT 'Desk' NOT NULL,
	"action" text NOT NULL,
	"summary" text NOT NULL,
	"entity_type" text,
	"entity_id" uuid,
	"contact_id" uuid,
	"account_id" uuid,
	"policy_id" uuid,
	"deal_id" uuid,
	"lead_id" uuid,
	"document_id" uuid,
	"activity_id" uuid,
	"meta" jsonb,
	"created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "eo_audit_logs" ADD CONSTRAINT "eo_audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "eo_audit_logs_when_idx" ON "eo_audit_logs" USING btree ("tenant_id","occurred_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "eo_audit_logs_action_idx" ON "eo_audit_logs" USING btree ("tenant_id","action");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "eo_audit_logs_contact_idx" ON "eo_audit_logs" USING btree ("tenant_id","contact_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "eo_audit_logs_policy_idx" ON "eo_audit_logs" USING btree ("tenant_id","policy_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "eo_audit_logs_deal_idx" ON "eo_audit_logs" USING btree ("tenant_id","deal_id");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION eo_audit_logs_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('fitfirst.allow_eo_audit_mutate', true) = 'on' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'eo_audit_logs is append-only';
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS eo_audit_logs_no_mutate ON "eo_audit_logs";
--> statement-breakpoint
CREATE TRIGGER eo_audit_logs_no_mutate
BEFORE UPDATE OR DELETE ON "eo_audit_logs"
FOR EACH ROW
EXECUTE FUNCTION eo_audit_logs_append_only();
