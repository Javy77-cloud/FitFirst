CREATE TABLE IF NOT EXISTS "agency_brand" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"agency_name" text NOT NULL,
	"logo_storage_path" text,
	"logo_mime" text,
	"default_color_preset" text DEFAULT 'agency' NOT NULL,
	"default_font_preset" text DEFAULT 'plex' NOT NULL,
	"default_density" text DEFAULT 'comfortable' NOT NULL,
	"default_column_layout" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_signatures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"body_en" text NOT NULL,
	"body_es" text NOT NULL,
	"is_default" boolean DEFAULT true NOT NULL,
	"is_example_copy" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_ui_prefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"actor_key" text NOT NULL,
	"color_preset" text,
	"font_preset" text,
	"density" text,
	"column_layout" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agency_brand" ADD CONSTRAINT "agency_brand_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email_signatures" ADD CONSTRAINT "email_signatures_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_ui_prefs" ADD CONSTRAINT "agent_ui_prefs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agency_brand_tenant_idx" ON "agency_brand" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_signatures_tenant_idx" ON "email_signatures" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_ui_prefs_tenant_idx" ON "agent_ui_prefs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_ui_prefs_actor_idx" ON "agent_ui_prefs" USING btree ("tenant_id","actor_key");
