CREATE TABLE IF NOT EXISTS "policy_change_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"policy_id" uuid NOT NULL,
	"changed_by" uuid,
	"changed_by_name" text NOT NULL,
	"changed_at" timestamptz DEFAULT now() NOT NULL,
	"field_key" text NOT NULL,
	"field_label" text NOT NULL,
	"before_value" text,
	"after_value" text,
	"source" text DEFAULT 'record_edit' NOT NULL,
	"event_id" uuid,
	"created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"storage_path" text NOT NULL,
	"doc_type" text DEFAULT 'other' NOT NULL,
	"uploaded_by" uuid,
	"uploaded_by_name" text,
	"note" text,
	"created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "policy_change_logs" ADD CONSTRAINT "policy_change_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "policy_change_logs" ADD CONSTRAINT "policy_change_logs_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "policy_change_logs" ADD CONSTRAINT "policy_change_logs_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "policy_change_logs_policy_idx" ON "policy_change_logs" USING btree ("tenant_id","policy_id","changed_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "policy_change_logs_field_idx" ON "policy_change_logs" USING btree ("tenant_id","policy_id","field_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_versions_doc_idx" ON "document_versions" USING btree ("tenant_id","document_id","version_number");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "document_versions_doc_ver_uidx" ON "document_versions" USING btree ("tenant_id","document_id","version_number");
