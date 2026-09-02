CREATE TABLE "document_folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'custom' NOT NULL,
	"slug" text,
	"description" text,
	"parent_id" uuid,
	"contact_id" uuid,
	"deal_id" uuid,
	"policy_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "folder_id" uuid;--> statement-breakpoint
ALTER TABLE "document_folders" ADD CONSTRAINT "document_folders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_folders" ADD CONSTRAINT "document_folders_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_folders" ADD CONSTRAINT "document_folders_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_folders" ADD CONSTRAINT "document_folders_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_folders_tenant_idx" ON "document_folders" USING btree ("tenant_id","kind");--> statement-breakpoint
CREATE INDEX "document_folders_parent_idx" ON "document_folders" USING btree ("tenant_id","parent_id");--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_folder_id_document_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."document_folders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "documents_tenant_folder_idx" ON "documents" USING btree ("tenant_id","folder_id");