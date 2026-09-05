CREATE TABLE IF NOT EXISTS "policy_service_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"policy_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"reason" text NOT NULL,
	"summary" text,
	"effective_date" timestamptz NOT NULL,
	"coverage_a" integer,
	"premium" numeric(12, 2),
	"requested_by" uuid,
	"requested_by_name" text,
	"filed_event_id" uuid,
	"filed_at" timestamptz,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "certificate_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"policy_id" uuid,
	"holder_name" text NOT NULL,
	"holder_address" text NOT NULL,
	"job_location" text,
	"status" text DEFAULT 'requested' NOT NULL,
	"notes" text,
	"issued_certificate_id" uuid,
	"requested_by" uuid,
	"requested_by_name" text,
	"issued_at" timestamptz,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "carrier_download_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"status" text DEFAULT 'not_connected' NOT NULL,
	"last_attempt_at" timestamptz,
	"last_error" text,
	"notes" text,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "policy_service_requests" ADD CONSTRAINT "policy_service_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "policy_service_requests" ADD CONSTRAINT "policy_service_requests_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "certificate_requests" ADD CONSTRAINT "certificate_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "certificate_requests" ADD CONSTRAINT "certificate_requests_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "certificate_requests" ADD CONSTRAINT "certificate_requests_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "carrier_download_connections" ADD CONSTRAINT "carrier_download_connections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "policy_service_requests_tenant_idx" ON "policy_service_requests" USING btree ("tenant_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "policy_service_requests_policy_idx" ON "policy_service_requests" USING btree ("tenant_id","policy_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "certificate_requests_tenant_idx" ON "certificate_requests" USING btree ("tenant_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "certificate_requests_account_idx" ON "certificate_requests" USING btree ("tenant_id","account_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "carrier_download_connections_uidx" ON "carrier_download_connections" USING btree ("tenant_id","provider");
