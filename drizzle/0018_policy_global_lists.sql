ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "insurance_type" text;
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "policy_type" text;
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "policy_term" text;
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "face_amount" numeric(14, 2);
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "insured_same_as_mailing" boolean DEFAULT false NOT NULL;

CREATE TABLE IF NOT EXISTS "global_lists" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "list_key" text NOT NULL,
  "family" text,
  "parent_slug" text,
  "slug" text NOT NULL,
  "label" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "color" text,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "global_lists_tenant_idx" ON "global_lists" ("tenant_id", "list_key");
CREATE UNIQUE INDEX IF NOT EXISTS "global_lists_key_slug_uidx" ON "global_lists" ("tenant_id", "list_key", "slug");
