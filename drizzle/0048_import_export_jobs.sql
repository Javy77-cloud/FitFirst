CREATE TABLE IF NOT EXISTS "import_export_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "actor_id" uuid,
  "actor_name" text NOT NULL,
  "actor_email" text,
  "entity" text NOT NULL,
  "action" text NOT NULL,
  "status" text NOT NULL DEFAULT 'ok',
  "filename" text,
  "rows_ok" integer NOT NULL DEFAULT 0,
  "rows_error" integer NOT NULL DEFAULT 0,
  "rows_create" integer NOT NULL DEFAULT 0,
  "rows_update" integer NOT NULL DEFAULT 0,
  "rows_skip" integer NOT NULL DEFAULT 0,
  "error_csv" text,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "import_export_jobs_tenant_idx" ON "import_export_jobs" ("tenant_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "import_export_jobs_entity_idx" ON "import_export_jobs" ("tenant_id", "entity", "created_at");
