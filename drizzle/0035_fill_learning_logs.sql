CREATE TABLE IF NOT EXISTS "fill_learning_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"logged_at" timestamptz DEFAULT now() NOT NULL,
	"deal_id" uuid,
	"document_id" uuid,
	"doc_type" text NOT NULL,
	"field_key" text NOT NULL,
	"extracted_value" text DEFAULT '' NOT NULL,
	"corrected_value" text NOT NULL,
	"corrected_by" text NOT NULL,
	"corrected_by_user_id" uuid,
	"note" text,
	"carrier_id" uuid,
	"shop_line" text DEFAULT 'home' NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fill_learning_logs" ADD CONSTRAINT "fill_learning_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fill_learning_logs" ADD CONSTRAINT "fill_learning_logs_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fill_learning_logs" ADD CONSTRAINT "fill_learning_logs_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fill_learning_logs" ADD CONSTRAINT "fill_learning_logs_corrected_by_user_id_users_id_fk" FOREIGN KEY ("corrected_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fill_learning_logs" ADD CONSTRAINT "fill_learning_logs_carrier_id_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."carriers"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fill_learning_tenant_idx" ON "fill_learning_logs" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fill_learning_lookup_idx" ON "fill_learning_logs" USING btree ("tenant_id","doc_type","field_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fill_learning_deal_idx" ON "fill_learning_logs" USING btree ("tenant_id","deal_id");
