ALTER TABLE "contacts" ADD COLUMN "active_policy_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "account_kind" text DEFAULT 'personal' NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "legal_name" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "quote_id" uuid;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE no action ON UPDATE no action;