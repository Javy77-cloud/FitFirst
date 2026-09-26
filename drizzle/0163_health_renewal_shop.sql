-- Health renewal pipeline, shopping branch, and health policy merge audit.
-- Agent status is source of truth. No webhook auto-advance. No bind sync.
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "renewal_shop" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "renewal_policy_id" uuid;
--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "quoting_review_required" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deals_renewal_shop_idx" ON "deals" ("tenant_id", "renewal_shop");
--> statement-breakpoint
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "intake_source" text;
--> statement-breakpoint
ALTER TABLE "renewal_queue" ADD COLUMN IF NOT EXISTS "health_pipeline_status" text;
--> statement-breakpoint
ALTER TABLE "renewal_queue" ADD COLUMN IF NOT EXISTS "health_pipeline_notes" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "renewal_queue" ADD COLUMN IF NOT EXISTS "shopping_deal_id" uuid;
--> statement-breakpoint
ALTER TABLE "renewal_queue" ADD COLUMN IF NOT EXISTS "shopping_status" text;
--> statement-breakpoint
ALTER TABLE "renewal_queue" ADD COLUMN IF NOT EXISTS "pre_shopping_stage" text;
--> statement-breakpoint
ALTER TABLE "renewal_queue" ADD COLUMN IF NOT EXISTS "shopping_snapshot" jsonb;
--> statement-breakpoint
ALTER TABLE "renewal_queue" ADD COLUMN IF NOT EXISTS "client_requested_shop" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "renewal_queue" ADD COLUMN IF NOT EXISTS "beats_suppressed" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "renewal_queue" ADD COLUMN IF NOT EXISTS "cancellation_required" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "renewal_queue" ADD COLUMN IF NOT EXISTS "cancel_effective" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "renewal_queue" ADD COLUMN IF NOT EXISTS "shopping_product_key" text;
--> statement-breakpoint
ALTER TABLE "renewal_queue" ADD COLUMN IF NOT EXISTS "replacement_policy_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "renewal_queue"
    ADD CONSTRAINT "renewal_queue_shopping_deal_id_deals_id_fk"
    FOREIGN KEY ("shopping_deal_id") REFERENCES "deals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "renewal_queue"
    ADD CONSTRAINT "renewal_queue_replacement_policy_id_policies_id_fk"
    FOREIGN KEY ("replacement_policy_id") REFERENCES "policies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "renewal_queue_shopping_deal_idx" ON "renewal_queue" ("tenant_id", "shopping_deal_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "health_policy_merge_audit" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "policy_id" uuid NOT NULL REFERENCES "policies"("id"),
  "contact_id" uuid REFERENCES "contacts"("id"),
  "source" text NOT NULL,
  "match_reason" text NOT NULL,
  "product_type" text NOT NULL,
  "filled_gaps" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "set_bound" boolean DEFAULT false NOT NULL,
  "actor_id" uuid,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "health_policy_merge_audit_policy_idx"
  ON "health_policy_merge_audit" ("tenant_id", "policy_id", "created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "renewal_shopping_resolutions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "renewal_queue_id" uuid NOT NULL REFERENCES "renewal_queue"("id"),
  "shopping_deal_id" uuid REFERENCES "deals"("id"),
  "policy_id" uuid NOT NULL REFERENCES "policies"("id"),
  "resolution" text NOT NULL,
  "source" text DEFAULT 'shopping' NOT NULL,
  "client_requested_shop" boolean DEFAULT false NOT NULL,
  "old_policy_id" uuid,
  "new_policy_id" uuid,
  "cancel_effective" timestamptz,
  "product_key" text,
  "actor_id" uuid,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "renewal_shopping_resolutions_queue_idx"
  ON "renewal_shopping_resolutions" ("tenant_id", "renewal_queue_id", "created_at");
