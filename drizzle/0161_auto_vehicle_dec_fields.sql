-- Personal auto DEC Fill: vehicle use already lived on vehicles.usage.
-- Annual miles, lienholder, per-vehicle premium, and per-vehicle physical-damage
-- deductibles are printed on a PAP declarations page and had no column.
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "annual_miles" text;
--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "lienholder" text;
--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "premium" text;
--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "comprehensive_deductible" text;
--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "collision_deductible" text;
