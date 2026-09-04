ALTER TABLE "integration_connections" ADD COLUMN IF NOT EXISTS "account_label" text;
ALTER TABLE "integration_connections" ADD COLUMN IF NOT EXISTS "last_connect_status" text;
