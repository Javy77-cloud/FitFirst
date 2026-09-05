CREATE TABLE IF NOT EXISTS "policy_servicing_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"policy_id" uuid NOT NULL,
	"item_key" text NOT NULL,
	"status" text DEFAULT 'incomplete' NOT NULL,
	"notes" text,
	"task_id" uuid,
	"completed_at" timestamptz,
	"completed_by" uuid,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "policy_service_request_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"policy_id" uuid NOT NULL,
	"action" text NOT NULL,
	"body" text NOT NULL,
	"actor_id" uuid,
	"actor_name" text,
	"occurred_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "policy_servicing_checks" ADD CONSTRAINT "policy_servicing_checks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "policy_servicing_checks" ADD CONSTRAINT "policy_servicing_checks_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "policy_service_request_events" ADD CONSTRAINT "policy_service_request_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "policy_service_request_events" ADD CONSTRAINT "policy_service_request_events_request_id_policy_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."policy_service_requests"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "policy_service_request_events" ADD CONSTRAINT "policy_service_request_events_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "policy_servicing_checks_uidx" ON "policy_servicing_checks" USING btree ("tenant_id","policy_id","item_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "policy_servicing_checks_policy_idx" ON "policy_servicing_checks" USING btree ("tenant_id","policy_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "policy_service_request_events_request_idx" ON "policy_service_request_events" USING btree ("tenant_id","request_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "policy_service_request_events_policy_idx" ON "policy_service_request_events" USING btree ("tenant_id","policy_id");
