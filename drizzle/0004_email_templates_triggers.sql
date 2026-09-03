ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "preferred_language" text;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "won_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "archived_at" timestamp with time zone;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'custom' NOT NULL,
	"subject_en" text NOT NULL,
	"body_en" text NOT NULL,
	"subject_es" text NOT NULL,
	"body_es" text NOT NULL,
	"is_seeded" boolean DEFAULT false NOT NULL,
	"is_example_copy" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_send_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"account_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_triggers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"event_kind" text NOT NULL,
	"delay_amount" integer NOT NULL,
	"delay_unit" text DEFAULT 'days' NOT NULL,
	"template_id" uuid NOT NULL,
	"send_from_provider" text DEFAULT 'google' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"email_client" boolean DEFAULT true NOT NULL,
	"create_broker_task" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_send_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"trigger_id" uuid,
	"template_id" uuid,
	"contact_id" uuid NOT NULL,
	"deal_id" uuid,
	"policy_id" uuid,
	"to_email" text,
	"locale" text DEFAULT 'en' NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"send_from_provider" text DEFAULT 'google' NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"hold_reason" text,
	"scheduled_for" timestamp with time zone NOT NULL,
	"anchor_kind" text NOT NULL,
	"anchor_at" timestamp with time zone NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email_send_accounts" ADD CONSTRAINT "email_send_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email_triggers" ADD CONSTRAINT "email_triggers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email_triggers" ADD CONSTRAINT "email_triggers_template_id_email_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email_send_jobs" ADD CONSTRAINT "email_send_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email_send_jobs" ADD CONSTRAINT "email_send_jobs_trigger_id_email_triggers_id_fk" FOREIGN KEY ("trigger_id") REFERENCES "public"."email_triggers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email_send_jobs" ADD CONSTRAINT "email_send_jobs_template_id_email_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email_send_jobs" ADD CONSTRAINT "email_send_jobs_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email_send_jobs" ADD CONSTRAINT "email_send_jobs_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email_send_jobs" ADD CONSTRAINT "email_send_jobs_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_templates_tenant_idx" ON "email_templates" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_templates_slug_idx" ON "email_templates" USING btree ("tenant_id","slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_send_accounts_tenant_idx" ON "email_send_accounts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_send_accounts_provider_idx" ON "email_send_accounts" USING btree ("tenant_id","provider");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_triggers_tenant_idx" ON "email_triggers" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_triggers_event_idx" ON "email_triggers" USING btree ("tenant_id","event_kind");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_send_jobs_tenant_idx" ON "email_send_jobs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_send_jobs_due_idx" ON "email_send_jobs" USING btree ("tenant_id","status","scheduled_for");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_send_jobs_contact_idx" ON "email_send_jobs" USING btree ("tenant_id","contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_send_jobs_deal_idx" ON "email_send_jobs" USING btree ("tenant_id","deal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_send_jobs_policy_idx" ON "email_send_jobs" USING btree ("tenant_id","policy_id");
