-- One-shot / idempotent: cancel silent auto-created Tasks for one tenant.
-- Bind :tenant_id (FitFirst default is 11111111-1111-4111-8111-111111111111).
-- Safe to re-run. Leaves notice / mortgagee / agent work_reminder tasks alone.
--
-- psql "$DATABASE_URL" -v tenant_id="'11111111-1111-4111-8111-111111111111'" -f scripts/ff-clear-silent-auto-tasks.sql

UPDATE review_tasks
SET status = 'cancelled', completed_at = NOW()
WHERE tenant_id = :tenant_id
  AND status = 'open'
  AND (
    kind IN ('stage_move', 'mint_confirm', 'servicing_aor', 'servicing_id_card', 'servicing_dec')
    OR title ILIKE 'Stage · %'
    OR title ILIKE 'Confirm declaration · %'
    OR title ILIKE 'Collect ID cards%'
    OR title ILIKE 'Collect AOR packet%'
    OR title ILIKE 'Collect AOR package%'
    OR title ILIKE 'Collect Dec on file%'
  );
