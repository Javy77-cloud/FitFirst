ALTER TABLE "certificate_requests" ADD COLUMN IF NOT EXISTS "waiver_of_subrogation" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "certificate_requests" ADD COLUMN IF NOT EXISTS "primary_noncontributory" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "issued_certificates" ADD COLUMN IF NOT EXISTS "waiver_of_subrogation" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "issued_certificates" ADD COLUMN IF NOT EXISTS "primary_noncontributory" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "policy_notices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"policy_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'drafted' NOT NULL,
	"reason" text NOT NULL,
	"mailed_at" timestamp with time zone,
	"effective_on" timestamp with time zone NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "policy_notices" ADD CONSTRAINT "policy_notices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "policy_notices" ADD CONSTRAINT "policy_notices_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "policy_notices_tenant_idx" ON "policy_notices" USING btree ("tenant_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "policy_notices_policy_idx" ON "policy_notices" USING btree ("tenant_id","policy_id");
