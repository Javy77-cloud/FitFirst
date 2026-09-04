CREATE TABLE IF NOT EXISTS "lead_routing_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "name" text NOT NULL,
  "enabled" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 10,
  "territory_id" uuid,
  "written_line" text,
  "max_open_deals" integer NOT NULL DEFAULT 12,
  "producer_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_routing_rules_tenant_idx"
  ON "lead_routing_rules" ("tenant_id", "sort_order");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lead_routing_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "lead_id" uuid NOT NULL REFERENCES "leads"("id"),
  "rule_id" uuid,
  "producer_id" uuid,
  "outcome" text NOT NULL,
  "reason" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_routing_logs_lead_idx"
  ON "lead_routing_logs" ("tenant_id", "lead_id");
