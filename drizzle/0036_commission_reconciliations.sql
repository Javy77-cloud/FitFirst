CREATE TABLE IF NOT EXISTS "commission_reconciliations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"commission_id" uuid NOT NULL,
	"policy_id" uuid,
	"agent_id" uuid,
	"expected_amount" numeric(12, 2) NOT NULL,
	"received_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"variance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"note" text,
	"marked_by" uuid,
	"marked_at" timestamptz,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "commission_reconciliations" ADD CONSTRAINT "commission_reconciliations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "commission_reconciliations" ADD CONSTRAINT "commission_reconciliations_commission_id_commissions_id_fk" FOREIGN KEY ("commission_id") REFERENCES "public"."commissions"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "commission_reconciliations" ADD CONSTRAINT "commission_reconciliations_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "commission_recon_commission_uidx" ON "commission_reconciliations" USING btree ("tenant_id","commission_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "commission_recon_tenant_idx" ON "commission_reconciliations" USING btree ("tenant_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "commission_recon_agent_idx" ON "commission_reconciliations" USING btree ("tenant_id","agent_id");
