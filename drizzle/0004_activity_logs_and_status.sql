CREATE TABLE "activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"body" text NOT NULL,
	"duration_seconds" integer,
	"from_status" text,
	"to_status" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ALTER COLUMN "status" SET DEFAULT 'incomplete';--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_logs_tenant_idx" ON "activity_logs" USING btree ("tenant_id","activity_id");--> statement-breakpoint
CREATE INDEX "activity_logs_occurred_idx" ON "activity_logs" USING btree ("tenant_id","occurred_at");--> statement-breakpoint
UPDATE "activities" SET "status" = 'incomplete' WHERE "status" IN ('open', 'cancelled');