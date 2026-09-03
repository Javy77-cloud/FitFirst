CREATE TABLE "desk_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"role" text DEFAULT 'agent' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "column_layouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"agent_id" uuid,
	"table_id" text NOT NULL,
	"column_ids" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "desk_agents" ADD CONSTRAINT "desk_agents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "column_layouts" ADD CONSTRAINT "column_layouts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "column_layouts" ADD CONSTRAINT "column_layouts_agent_id_desk_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."desk_agents"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "desk_agents_tenant_idx" ON "desk_agents" USING btree ("tenant_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "desk_agents_slug_uidx" ON "desk_agents" USING btree ("tenant_id","slug");
--> statement-breakpoint
CREATE INDEX "column_layouts_lookup_idx" ON "column_layouts" USING btree ("tenant_id","table_id","agent_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "column_layouts_agency_uidx" ON "column_layouts" ("tenant_id","table_id") WHERE "agent_id" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "column_layouts_agent_uidx" ON "column_layouts" ("tenant_id","table_id","agent_id") WHERE "agent_id" IS NOT NULL;
--> statement-breakpoint
INSERT INTO "desk_agents" ("id", "tenant_id", "slug", "display_name", "role") VALUES
	('44444444-4444-4444-8444-444444444401', '11111111-1111-4111-8111-111111111111', 'admin', 'Agency admin', 'admin'),
	('44444444-4444-4444-8444-444444444402', '11111111-1111-4111-8111-111111111111', 'javy', 'Javy Garcia', 'agent'),
	('44444444-4444-4444-8444-444444444403', '11111111-1111-4111-8111-111111111111', 'producer', 'Desk producer', 'agent');
