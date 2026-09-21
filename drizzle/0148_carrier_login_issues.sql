-- Quote-bot carrier LOGIN failures. Not missing-question gaps.
-- Day-one rows are the NDJSON seed (data/carrier-login-issues.ndjson), not this file.
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "carrier_login_issues" (
  "id" uuid PRIMARY KEY NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "carrier_id" uuid,
  "carrier_name" text NOT NULL,
  "lob" text,
  "error_message" text NOT NULL,
  "error_category" text NOT NULL,
  "occurred_at" timestamp with time zone NOT NULL,
  "source" text,
  "deal_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "carrier_login_issues_tenant_carrier_idx"
  ON "carrier_login_issues" ("tenant_id", "carrier_id", "error_category");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "carrier_login_issues_occurred_idx"
  ON "carrier_login_issues" ("tenant_id", "occurred_at");
