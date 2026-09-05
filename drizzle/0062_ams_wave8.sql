CREATE TABLE IF NOT EXISTS "certificate_holder_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"account_id" uuid,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"city" text,
	"state" text,
	"zip" text,
	"notes" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "renewal_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"policy_id" uuid NOT NULL,
	"stage" text DEFAULT 'upcoming' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "certificate_requests" ADD COLUMN IF NOT EXISTS "holder_contact_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "certificate_holder_contacts" ADD CONSTRAINT "certificate_holder_contacts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "certificate_holder_contacts" ADD CONSTRAINT "certificate_holder_contacts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "renewal_queue" ADD CONSTRAINT "renewal_queue_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "renewal_queue" ADD CONSTRAINT "renewal_queue_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "certificate_requests" ADD CONSTRAINT "certificate_requests_holder_contact_id_certificate_holder_contacts_id_fk" FOREIGN KEY ("holder_contact_id") REFERENCES "public"."certificate_holder_contacts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "certificate_holder_contacts_tenant_idx" ON "certificate_holder_contacts" USING btree ("tenant_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "certificate_holder_contacts_account_idx" ON "certificate_holder_contacts" USING btree ("tenant_id","account_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "certificate_holder_contacts_name_idx" ON "certificate_holder_contacts" USING btree ("tenant_id","name");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "renewal_queue_policy_uidx" ON "renewal_queue" USING btree ("tenant_id","policy_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "renewal_queue_tenant_idx" ON "renewal_queue" USING btree ("tenant_id","stage");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "renewal_queue_policy_idx" ON "renewal_queue" USING btree ("tenant_id","policy_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "certificate_requests_holder_contact_idx" ON "certificate_requests" USING btree ("tenant_id","holder_contact_id");
