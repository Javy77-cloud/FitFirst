ALTER TABLE "integration_connections" ADD COLUMN IF NOT EXISTS "client_id" text;
ALTER TABLE "integration_connections" ADD COLUMN IF NOT EXISTS "client_secret_enc" text;
ALTER TABLE "integration_connections" ADD COLUMN IF NOT EXISTS "client_secret_iv" text;
ALTER TABLE "integration_connections" ADD COLUMN IF NOT EXISTS "oauth_state" text;
ALTER TABLE "integration_connections" ADD COLUMN IF NOT EXISTS "connect_mode" text;
ALTER TABLE "integration_connections" ADD COLUMN IF NOT EXISTS "last_oauth_error" text;
ALTER TABLE "integration_connections" ADD COLUMN IF NOT EXISTS "access_token_enc" text;
ALTER TABLE "integration_connections" ADD COLUMN IF NOT EXISTS "access_token_iv" text;
