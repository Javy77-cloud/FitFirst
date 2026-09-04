CREATE TABLE IF NOT EXISTS "portal_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"token" text NOT NULL,
	"label" text NOT NULL,
	"kind" text DEFAULT 'personal' NOT NULL,
	"contact_id" uuid,
	"account_id" uuid,
	"expires_at" timestamptz,
	"last_used_at" timestamptz,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portal_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"token_id" uuid,
	"contact_id" uuid,
	"account_id" uuid,
	"policy_id" uuid,
	"kind" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"summary" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"work_item_id" uuid,
	"reused_certificate_id" uuid,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "portal_tokens" ADD CONSTRAINT "portal_tokens_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "portal_tokens" ADD CONSTRAINT "portal_tokens_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "portal_tokens" ADD CONSTRAINT "portal_tokens_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "portal_requests" ADD CONSTRAINT "portal_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "portal_requests" ADD CONSTRAINT "portal_requests_token_id_portal_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."portal_tokens"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "portal_requests" ADD CONSTRAINT "portal_requests_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "portal_requests" ADD CONSTRAINT "portal_requests_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "portal_requests" ADD CONSTRAINT "portal_requests_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "portal_tokens_token_uidx" ON "portal_tokens" USING btree ("tenant_id","token");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portal_tokens_contact_idx" ON "portal_tokens" USING btree ("tenant_id","contact_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portal_tokens_account_idx" ON "portal_tokens" USING btree ("tenant_id","account_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portal_requests_tenant_idx" ON "portal_requests" USING btree ("tenant_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portal_requests_policy_idx" ON "portal_requests" USING btree ("tenant_id","policy_id");
