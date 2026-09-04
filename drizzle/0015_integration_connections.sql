CREATE TABLE IF NOT EXISTS "integration_connections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "category" text NOT NULL,
  "provider" text NOT NULL,
  "connected" boolean DEFAULT false NOT NULL,
  "account_label" text,
  "notes" text,
  "last_connect_status" text,
  "connected_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "integration_connections_tenant_provider_idx"
  ON "integration_connections" ("tenant_id", "provider");
