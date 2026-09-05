CREATE TABLE IF NOT EXISTS "developer_functions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"api_name" text NOT NULL,
	"description" text,
	"language" text DEFAULT 'typescript' NOT NULL,
	"category" text DEFAULT 'standalone' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"expose_as_rest" boolean DEFAULT false NOT NULL,
	"expose_as_oauth" boolean DEFAULT false NOT NULL,
	"connection_link_name" text,
	"created_by" uuid,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "developer_function_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"function_id" uuid NOT NULL,
	"source" text DEFAULT 'test' NOT NULL,
	"status" text DEFAULT 'ok' NOT NULL,
	"input" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"output" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error" text,
	"created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "developer_org_api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"prefix" text NOT NULL,
	"secret_hash" text NOT NULL,
	"last_used_at" timestamptz,
	"revoked_at" timestamptz,
	"created_by" uuid,
	"created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "developer_webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"event" text NOT NULL,
	"target_url" text NOT NULL,
	"secret" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "developer_webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"webhook_id" uuid NOT NULL,
	"event" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"attempted_at" timestamptz
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "developer_inbound_hooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "developer_inbound_payloads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"hook_id" uuid,
	"slug" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "developer_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"link_name" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'needs_credentials' NOT NULL,
	"client_id" text,
	"client_secret_enc" text,
	"client_secret_iv" text,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "desk_macros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"module" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"actions" jsonb NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "desk_macro_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"macro_id" uuid NOT NULL,
	"module" text NOT NULL,
	"record_ids" jsonb NOT NULL,
	"summary" text NOT NULL,
	"ran_by" uuid,
	"ran_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "desk_custom_buttons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"module" text NOT NULL,
	"placement" text NOT NULL,
	"label" text NOT NULL,
	"visibility_profiles" jsonb DEFAULT '["admin","agent"]'::jsonb NOT NULL,
	"action_kind" text NOT NULL,
	"function_api_name" text,
	"url_template" text,
	"widget_id" uuid,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "desk_client_scripts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"module" text NOT NULL,
	"page" text NOT NULL,
	"event" text NOT NULL,
	"field_name" text,
	"name" text NOT NULL,
	"body" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "desk_widgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"hosting" text NOT NULL,
	"external_url" text,
	"zip_meta" jsonb,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "developer_functions" ADD CONSTRAINT "developer_functions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "developer_function_executions" ADD CONSTRAINT "developer_function_executions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "developer_function_executions" ADD CONSTRAINT "developer_function_executions_function_id_developer_functions_id_fk" FOREIGN KEY ("function_id") REFERENCES "public"."developer_functions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "developer_org_api_keys" ADD CONSTRAINT "developer_org_api_keys_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "developer_webhooks" ADD CONSTRAINT "developer_webhooks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "developer_webhook_deliveries" ADD CONSTRAINT "developer_webhook_deliveries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "developer_webhook_deliveries" ADD CONSTRAINT "developer_webhook_deliveries_webhook_id_developer_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."developer_webhooks"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "developer_inbound_hooks" ADD CONSTRAINT "developer_inbound_hooks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "developer_inbound_payloads" ADD CONSTRAINT "developer_inbound_payloads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "developer_inbound_payloads" ADD CONSTRAINT "developer_inbound_payloads_hook_id_developer_inbound_hooks_id_fk" FOREIGN KEY ("hook_id") REFERENCES "public"."developer_inbound_hooks"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "developer_connections" ADD CONSTRAINT "developer_connections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "desk_macros" ADD CONSTRAINT "desk_macros_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "desk_macro_runs" ADD CONSTRAINT "desk_macro_runs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "desk_macro_runs" ADD CONSTRAINT "desk_macro_runs_macro_id_desk_macros_id_fk" FOREIGN KEY ("macro_id") REFERENCES "public"."desk_macros"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "desk_custom_buttons" ADD CONSTRAINT "desk_custom_buttons_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "desk_client_scripts" ADD CONSTRAINT "desk_client_scripts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "desk_widgets" ADD CONSTRAINT "desk_widgets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "developer_functions_tenant_idx" ON "developer_functions" USING btree ("tenant_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "developer_functions_api_name_uidx" ON "developer_functions" USING btree ("tenant_id", "api_name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "developer_function_executions_fn_idx" ON "developer_function_executions" USING btree ("tenant_id", "function_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "developer_org_api_keys_tenant_idx" ON "developer_org_api_keys" USING btree ("tenant_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "developer_org_api_keys_hash_uidx" ON "developer_org_api_keys" USING btree ("secret_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "developer_webhooks_tenant_idx" ON "developer_webhooks" USING btree ("tenant_id", "event");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "developer_webhook_deliveries_hook_idx" ON "developer_webhook_deliveries" USING btree ("tenant_id", "webhook_id", "created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "developer_inbound_hooks_slug_uidx" ON "developer_inbound_hooks" USING btree ("tenant_id", "slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "developer_inbound_payloads_slug_idx" ON "developer_inbound_payloads" USING btree ("tenant_id", "slug", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "developer_connections_tenant_idx" ON "developer_connections" USING btree ("tenant_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "developer_connections_link_uidx" ON "developer_connections" USING btree ("tenant_id", "link_name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "desk_macros_module_idx" ON "desk_macros" USING btree ("tenant_id", "module");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "desk_macro_runs_macro_idx" ON "desk_macro_runs" USING btree ("tenant_id", "macro_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "desk_custom_buttons_module_idx" ON "desk_custom_buttons" USING btree ("tenant_id", "module", "placement");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "desk_client_scripts_page_idx" ON "desk_client_scripts" USING btree ("tenant_id", "module", "page");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "desk_widgets_type_idx" ON "desk_widgets" USING btree ("tenant_id", "type");
