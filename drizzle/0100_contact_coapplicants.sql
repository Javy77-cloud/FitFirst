-- Contact ↔ contact co-applicant M2M. Own policies/deals stay on each contact row.
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contact_coapplicants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "contact_id" uuid NOT NULL,
  "linked_contact_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "contact_coapplicants" ADD CONSTRAINT "contact_coapplicants_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "contact_coapplicants" ADD CONSTRAINT "contact_coapplicants_linked_contact_id_contacts_id_fk" FOREIGN KEY ("linked_contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contact_coapplicants_tenant_idx" ON "contact_coapplicants" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contact_coapplicants_contact_idx" ON "contact_coapplicants" USING btree ("tenant_id","contact_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contact_coapplicants_linked_idx" ON "contact_coapplicants" USING btree ("tenant_id","linked_contact_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "contact_coapplicants_pair_uidx" ON "contact_coapplicants" USING btree ("tenant_id","contact_id","linked_contact_id");
