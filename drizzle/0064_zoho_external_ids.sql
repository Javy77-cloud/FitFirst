ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "zoho_id" text;
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "source_id" text;
--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "zoho_id" text;
--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "source_id" text;
--> statement-breakpoint
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "zoho_id" text;
--> statement-breakpoint
ALTER TABLE "carriers" ADD COLUMN IF NOT EXISTS "source_id" text;
--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "zoho_id" text;
--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "source_id" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_zoho_idx" ON "leads" ("tenant_id","zoho_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deals_zoho_idx" ON "deals" ("tenant_id","zoho_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "carriers_zoho_idx" ON "carriers" ("tenant_id","zoho_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activities_zoho_idx" ON "activities" ("tenant_id","zoho_id");
