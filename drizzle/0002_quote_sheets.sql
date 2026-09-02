ALTER TABLE "contacts" ADD COLUMN "date_of_birth" text;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "shop_lines" jsonb DEFAULT '["home"]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "coverage_amount" integer;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "property_oneliner" text;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "current_carrier" text;--> statement-breakpoint
CREATE TABLE "quote_sheets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"line" text NOT NULL,
	"values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extraction_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"document_id" uuid,
	"quote_sheet_id" uuid,
	"engine" text NOT NULL,
	"status" text NOT NULL,
	"filled_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"skipped_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quote_sheets" ADD CONSTRAINT "quote_sheets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_sheets" ADD CONSTRAINT "quote_sheets_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_jobs" ADD CONSTRAINT "extraction_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_jobs" ADD CONSTRAINT "extraction_jobs_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_jobs" ADD CONSTRAINT "extraction_jobs_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_jobs" ADD CONSTRAINT "extraction_jobs_quote_sheet_id_quote_sheets_id_fk" FOREIGN KEY ("quote_sheet_id") REFERENCES "public"."quote_sheets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quote_sheets_tenant_idx" ON "quote_sheets" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quote_sheets_deal_line_uidx" ON "quote_sheets" USING btree ("tenant_id","deal_id","line");--> statement-breakpoint
CREATE INDEX "extraction_jobs_deal_idx" ON "extraction_jobs" USING btree ("tenant_id","deal_id");
