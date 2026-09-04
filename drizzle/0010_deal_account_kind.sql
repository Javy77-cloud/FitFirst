ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "account_kind" text DEFAULT 'personal' NOT NULL;

ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "tags" jsonb DEFAULT '[]'::jsonb NOT NULL;

CREATE TABLE IF NOT EXISTS "document_folders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "name" text NOT NULL,
  "kind" text DEFAULT 'custom' NOT NULL,
  "slug" text,
  "description" text,
  "parent_id" uuid,
  "contact_id" uuid REFERENCES "contacts"("id"),
  "deal_id" uuid REFERENCES "deals"("id"),
  "policy_id" uuid REFERENCES "policies"("id"),
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "document_folders_tenant_idx" ON "document_folders" ("tenant_id","kind");
CREATE INDEX IF NOT EXISTS "document_folders_parent_idx" ON "document_folders" ("tenant_id","parent_id");

CREATE TABLE IF NOT EXISTS "extraction_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "deal_id" uuid NOT NULL REFERENCES "deals"("id"),
  "document_id" uuid REFERENCES "documents"("id"),
  "quote_sheet_id" uuid REFERENCES "quote_sheets"("id"),
  "engine" text NOT NULL,
  "status" text NOT NULL,
  "filled_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "skipped_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "message" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "extraction_jobs_deal_idx" ON "extraction_jobs" ("tenant_id","deal_id");

CREATE INDEX IF NOT EXISTS "deals_owner_idx" ON "deals" ("tenant_id","owner_id");
