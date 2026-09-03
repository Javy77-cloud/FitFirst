CREATE TABLE "pipeline_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"locked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "pipeline_stages_tenant_idx" ON "pipeline_stages" USING btree ("tenant_id","sort_order");
--> statement-breakpoint
INSERT INTO "pipeline_stages" ("tenant_id", "slug", "label", "sort_order", "locked") VALUES
	('11111111-1111-4111-8111-111111111111', 'shopping', 'Shopping', 0, false),
	('11111111-1111-4111-8111-111111111111', 'quoting', 'Quoting', 1, false),
	('11111111-1111-4111-8111-111111111111', 'comparing', 'Comparing', 2, false),
	('11111111-1111-4111-8111-111111111111', 'bound', 'Bound', 3, true),
	('11111111-1111-4111-8111-111111111111', 'lost', 'Lost', 4, false);