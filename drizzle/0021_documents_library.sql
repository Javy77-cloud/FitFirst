ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "folder_id" uuid;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "library" text DEFAULT 'shared' NOT NULL;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "fillable" boolean DEFAULT false NOT NULL;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "form_template_id" uuid;

ALTER TABLE "document_folders" ADD COLUMN IF NOT EXISTS "library" text DEFAULT 'shared' NOT NULL;

ALTER TABLE "form_templates" ADD COLUMN IF NOT EXISTS "fillable" boolean DEFAULT true NOT NULL;
ALTER TABLE "form_templates" ADD COLUMN IF NOT EXISTS "folder_id" uuid;

CREATE TABLE IF NOT EXISTS "form_fills" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "form_template_id" uuid NOT NULL REFERENCES "form_templates"("id"),
  "source_document_id" uuid REFERENCES "documents"("id"),
  "folder_id" uuid,
  "values" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "source_text" text,
  "status" text DEFAULT 'draft' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "documents_tenant_folder_idx" ON "documents" ("tenant_id","folder_id");
CREATE INDEX IF NOT EXISTS "documents_tenant_library_idx" ON "documents" ("tenant_id","library");
CREATE INDEX IF NOT EXISTS "document_folders_library_idx" ON "document_folders" ("tenant_id","library");
CREATE INDEX IF NOT EXISTS "form_fills_tenant_template_idx" ON "form_fills" ("tenant_id","form_template_id");
