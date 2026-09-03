ALTER TABLE "contacts" ADD COLUMN "active_policy_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "account_id" uuid;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "bind_target" text DEFAULT 'contact' NOT NULL;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "quote_results_note" text;--> statement-breakpoint
ALTER TABLE "policies" ALTER COLUMN "contact_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "policies" ADD COLUMN "account_id" uuid;--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "risk_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "deal_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "policy_id" uuid;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "contact_id" uuid;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "account_id" uuid;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "slot" text DEFAULT 'source_doc' NOT NULL;--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"mailing_address" text,
	"city" text,
	"state" text,
	"zip" text,
	"notes" text,
	"tenure_start" timestamp with time zone,
	"policy_count" integer DEFAULT 0 NOT NULL,
	"active_policy_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"role" text DEFAULT 'principal' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_sheets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"line" text NOT NULL,
	"values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_accounts" ADD CONSTRAINT "contact_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_accounts" ADD CONSTRAINT "contact_accounts_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_accounts" ADD CONSTRAINT "contact_accounts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_sheets" ADD CONSTRAINT "quote_sheets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_sheets" ADD CONSTRAINT "quote_sheets_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_tenant_idx" ON "accounts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "contact_accounts_tenant_idx" ON "contact_accounts" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_accounts_pair_uidx" ON "contact_accounts" USING btree ("tenant_id","contact_id","account_id");--> statement-breakpoint
CREATE INDEX "quote_sheets_tenant_idx" ON "quote_sheets" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quote_sheets_deal_line_uidx" ON "quote_sheets" USING btree ("tenant_id","deal_id","line");--> statement-breakpoint
CREATE INDEX "documents_tenant_deal_slot_idx" ON "documents" USING btree ("tenant_id","deal_id","slot");--> statement-breakpoint
CREATE INDEX "documents_tenant_policy_idx" ON "documents" USING btree ("tenant_id","policy_id");