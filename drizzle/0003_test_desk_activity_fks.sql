ALTER TABLE "client_history" ALTER COLUMN "contact_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "client_history" ADD COLUMN "account_id" uuid;--> statement-breakpoint
ALTER TABLE "review_tasks" ADD COLUMN "account_id" uuid;--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"status" text DEFAULT 'open' NOT NULL,
	"due_at" timestamp with time zone,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"assignee" text,
	"contact_id" uuid,
	"account_id" uuid,
	"deal_id" uuid,
	"policy_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"event_type" text NOT NULL,
	"body" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"contact_id" uuid,
	"account_id" uuid,
	"policy_id" uuid,
	"deal_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_history" ADD CONSTRAINT "client_history_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_tasks" ADD CONSTRAINT "review_tasks_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_tenant_idx" ON "activities" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "activities_when_idx" ON "activities" USING btree ("tenant_id","start_at","due_at");--> statement-breakpoint
CREATE INDEX "activities_status_idx" ON "activities" USING btree ("tenant_id","status","kind");--> statement-breakpoint
CREATE INDEX "activities_account_idx" ON "activities" USING btree ("tenant_id","account_id");--> statement-breakpoint
CREATE INDEX "activity_logs_activity_idx" ON "activity_logs" USING btree ("tenant_id","activity_id");--> statement-breakpoint
CREATE INDEX "activity_logs_contact_idx" ON "activity_logs" USING btree ("tenant_id","contact_id");--> statement-breakpoint
CREATE INDEX "activity_logs_account_idx" ON "activity_logs" USING btree ("tenant_id","account_id");--> statement-breakpoint
CREATE INDEX "activity_logs_policy_idx" ON "activity_logs" USING btree ("tenant_id","policy_id");