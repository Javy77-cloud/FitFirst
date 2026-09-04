CREATE TABLE IF NOT EXISTS "campaign_sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"summary" text NOT NULL,
	"audience" text NOT NULL,
	"anchor" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"steps" jsonb NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_sequences" ADD CONSTRAINT "campaign_sequences_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "campaign_sequences_slug_uidx" ON "campaign_sequences" USING btree ("tenant_id","slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "campaign_sequences_tenant_idx" ON "campaign_sequences" USING btree ("tenant_id");
