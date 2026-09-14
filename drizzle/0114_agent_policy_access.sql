-- Agency pref: agent policy module Read/Write gates (portal, commission, lifecycle, renewal drag).
--> statement-breakpoint
ALTER TABLE "agency_settings" ADD COLUMN IF NOT EXISTS "agent_policy_access" jsonb;
