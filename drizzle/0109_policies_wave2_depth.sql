-- Policies WAVE 2 depth: doc expiry, access log, endorsement premium impact, inspection result.
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "expires_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "endorsement_drafts" ADD COLUMN IF NOT EXISTS "premium_impact" numeric(12, 2);
--> statement-breakpoint
ALTER TABLE "policy_inspections" ADD COLUMN IF NOT EXISTS "result" text;
--> statement-breakpoint
ALTER TABLE "policy_inspections" ADD COLUMN IF NOT EXISTS "inspector_user_id" uuid;
--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN IF NOT EXISTS "severity" text DEFAULT 'moderate';
--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN IF NOT EXISTS "carrier_notified_at" timestamp with time zone;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document_access_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "document_id" uuid NOT NULL,
  "policy_id" uuid,
  "actor_id" uuid,
  "actor_name" text NOT NULL,
  "action" text NOT NULL DEFAULT 'view',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_access_logs_doc_idx" ON "document_access_logs" ("tenant_id","document_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_access_logs_policy_idx" ON "document_access_logs" ("tenant_id","policy_id","created_at");
