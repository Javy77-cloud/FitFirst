CREATE TABLE "carrier_appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"carrier_id" uuid NOT NULL,
	"written_line" text NOT NULL,
	"appointed" boolean DEFAULT false NOT NULL,
	"selling_agency" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "carrier_appointments" ADD CONSTRAINT "carrier_appointments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carrier_appointments" ADD CONSTRAINT "carrier_appointments_carrier_id_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."carriers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "carrier_appointments_tenant_idx" ON "carrier_appointments" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "carrier_appointments_carrier_line_uidx" ON "carrier_appointments" USING btree ("tenant_id","carrier_id","written_line");