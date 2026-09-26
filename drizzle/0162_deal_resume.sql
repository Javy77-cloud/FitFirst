-- Per-agent deal resume: last deal, product form, and screen.
-- Survives refresh and leaving the deal. Not shared across agents.
ALTER TABLE "agent_ui_prefs" ADD COLUMN IF NOT EXISTS "deal_resume" jsonb;
