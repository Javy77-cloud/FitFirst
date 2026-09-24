-- Delivery audit for client quote sends: sent, delivered, bounce, complaint, open.
-- Apply on Neon before relying on the trail. Does not seed the book.
CREATE TABLE IF NOT EXISTS "quote_delivery_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "deal_id" uuid,
  "product" text,
  "quote_id" uuid,
  "message_id" text NOT NULL,
  "kind" text NOT NULL,
  "stage_slug" text,
  "detail" text,
  "token" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "quote_delivery_events"
    ADD CONSTRAINT "quote_delivery_events_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "quote_delivery_events"
    ADD CONSTRAINT "quote_delivery_events_deal_id_deals_id_fk"
    FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quote_delivery_events_message_idx" ON "quote_delivery_events" ("tenant_id","message_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quote_delivery_events_deal_idx" ON "quote_delivery_events" ("tenant_id","deal_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quote_delivery_events_token_idx" ON "quote_delivery_events" ("tenant_id","token");
