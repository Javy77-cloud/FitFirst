ALTER TABLE "claims" ADD COLUMN IF NOT EXISTS "contact_id" uuid;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN IF NOT EXISTS "loss_location" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN IF NOT EXISTS "reporter_name" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN IF NOT EXISTS "reporter_phone" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN IF NOT EXISTS "producer_id" uuid;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN IF NOT EXISTS "producer_notified_at" timestamptz;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims" ADD CONSTRAINT "claims_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claims_contact_idx" ON "claims" USING btree ("tenant_id","contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claims_status_idx" ON "claims" USING btree ("tenant_id","status");
