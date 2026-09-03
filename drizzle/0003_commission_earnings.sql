ALTER TABLE "commissions" ADD COLUMN "agency_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "commissions" ADD COLUMN "producer_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "commissions" ADD COLUMN "selling_agency" text DEFAULT 'afa' NOT NULL;--> statement-breakpoint
ALTER TABLE "commissions" ADD COLUMN "paid_by_user_id" uuid;--> statement-breakpoint
UPDATE "commissions" SET "agency_amount" = "amount", "producer_amount" = "amount" WHERE "agency_amount" IS NULL;--> statement-breakpoint
CREATE TABLE "commission_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"commission_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carrier_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"carrier_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"premium_goal" numeric(12, 2) NOT NULL,
	"policy_goal" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_paid_by_user_id_users_id_fk" FOREIGN KEY ("paid_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_events" ADD CONSTRAINT "commission_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_events" ADD CONSTRAINT "commission_events_commission_id_commissions_id_fk" FOREIGN KEY ("commission_id") REFERENCES "public"."commissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_events" ADD CONSTRAINT "commission_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carrier_goals" ADD CONSTRAINT "carrier_goals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carrier_goals" ADD CONSTRAINT "carrier_goals_carrier_id_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."carriers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "commissions_selling_idx" ON "commissions" USING btree ("tenant_id","selling_agency");--> statement-breakpoint
CREATE INDEX "commission_events_tenant_idx" ON "commission_events" USING btree ("tenant_id","commission_id");--> statement-breakpoint
CREATE INDEX "carrier_goals_tenant_idx" ON "carrier_goals" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "carrier_goals_year_uidx" ON "carrier_goals" USING btree ("tenant_id","carrier_id","year");
