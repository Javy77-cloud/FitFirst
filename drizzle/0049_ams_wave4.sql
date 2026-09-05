CREATE TABLE IF NOT EXISTS "policy_additional_interests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"policy_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"city" text,
	"state" text,
	"zip" text,
	"loan_number" text,
	"clause" text,
	"notes" text,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "policy_additional_interests" ADD CONSTRAINT "policy_additional_interests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "policy_additional_interests" ADD CONSTRAINT "policy_additional_interests_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "policy_additional_interests_tenant_idx" ON "policy_additional_interests" USING btree ("tenant_id","policy_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "policy_additional_interests_kind_idx" ON "policy_additional_interests" USING btree ("tenant_id","kind");
