-- Bind layout picklist/multi-select fields to a Settings → Global list
-- (policy_status, selling_agency, …) without copying options into the field.
-- Additive only. Does not rewrite existing picklist_id bindings.
--> statement-breakpoint
ALTER TABLE "desk_custom_fields" ADD COLUMN IF NOT EXISTS "global_list_key" text;
