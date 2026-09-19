-- Agent 1–5 experience reviews that feed policy / client health.
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "experience_reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "reviewer_user_id" uuid,
  "moment" text NOT NULL,
  "prompt_id" text NOT NULL,
  "stars" integer,
  "note" text,
  "skipped" boolean DEFAULT false NOT NULL,
  "contact_id" uuid,
  "account_id" uuid,
  "policy_id" uuid,
  "deal_id" uuid,
  "activity_id" uuid,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "experience_reviews" ADD CONSTRAINT "experience_reviews_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "experience_reviews" ADD CONSTRAINT "experience_reviews_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "experience_reviews" ADD CONSTRAINT "experience_reviews_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "experience_reviews" ADD CONSTRAINT "experience_reviews_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "experience_reviews" ADD CONSTRAINT "experience_reviews_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "experience_reviews" ADD CONSTRAINT "experience_reviews_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "experience_reviews_tenant_idx" ON "experience_reviews" ("tenant_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "experience_reviews_reviewer_idx" ON "experience_reviews" ("tenant_id", "reviewer_user_id", "moment");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "experience_reviews_contact_idx" ON "experience_reviews" ("tenant_id", "contact_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "experience_reviews_policy_idx" ON "experience_reviews" ("tenant_id", "policy_id");
