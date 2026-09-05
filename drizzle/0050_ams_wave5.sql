ALTER TABLE "certificate_requests" ADD COLUMN IF NOT EXISTS "interest_id" uuid;
--> statement-breakpoint
ALTER TABLE "certificate_requests" ADD COLUMN IF NOT EXISTS "additional_insured" text;
--> statement-breakpoint
ALTER TABLE "certificate_requests" ADD COLUMN IF NOT EXISTS "special_wording" text;
--> statement-breakpoint
ALTER TABLE "issued_certificates" ADD COLUMN IF NOT EXISTS "additional_insured" text;
--> statement-breakpoint
ALTER TABLE "issued_certificates" ADD COLUMN IF NOT EXISTS "special_wording" text;
--> statement-breakpoint
ALTER TABLE "issued_certificates" ADD COLUMN IF NOT EXISTS "interest_id" uuid;
--> statement-breakpoint
ALTER TABLE "policy_service_requests" ADD COLUMN IF NOT EXISTS "work_desk" text DEFAULT 'csr' NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "certificate_requests_interest_idx" ON "certificate_requests" USING btree ("tenant_id","interest_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "policy_service_requests_work_desk_idx" ON "policy_service_requests" USING btree ("tenant_id","work_desk");
