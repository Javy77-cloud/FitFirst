-- Optional. One completed note per P&C policy that still has flags.
-- Re-running updates that note in place (source_id pc-party-blank-fields:<policy id>).
-- Writes activities + activity_logs only, which is how desk notes show on the policy timeline.
-- Does not insert alerts, review tasks, work items, or desk messages.
-- Open tasks are what the notification board reads. This note is kind = note and status = completed.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/backfill/pc-policy-from-party/04-notes.sql

\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '10min';
SET LOCAL client_min_messages = warning;
\ir 00-resolve.sql

CREATE TEMP TABLE ff_pc_note_body AS
SELECT
  r.policy_id,
  r.tenant_id,
  r.policy_number,
  r.resolved_contact_id,
  r.resolved_account_id,
  r.deal_id,
  NULLIF(btrim(p.producer), '') AS producer_name,
  CASE
    WHEN lines.body IS NULL THEN
      'No blank P&C fields remain from the party backfill. Commission was left blank on purpose.'
    ELSE
      'Missing fields to fill by hand. Commission was left blank on purpose.' || E'\n\n' || lines.body
  END AS notes,
  (lines.body IS NOT NULL) AS has_flags
FROM ff_pc_resolved r
JOIN policies p ON p.id = r.policy_id
LEFT JOIN LATERAL (
  SELECT string_agg(line, E'\n' ORDER BY line) AS body
  FROM (
    SELECT DISTINCT '- ' || f.field || COALESCE(' — ' || NULLIF(btrim(f.reason), ''), '') AS line
    FROM ff_pc_flags f
    WHERE f.policy_id = r.policy_id
  ) items
) lines ON true;

\echo '=== notes inserted ==='
WITH inserted AS (
  INSERT INTO activities (
    tenant_id, kind, title, notes, status, outcome, direction,
    contact_id, account_id, policy_id, deal_id, source_id
  )
  SELECT
    n.tenant_id,
    'note',
    'Missing P&C fields',
    n.notes,
    'completed',
    'pc_party_backfill',
    'internal',
    n.resolved_contact_id,
    n.resolved_account_id,
    n.policy_id,
    n.deal_id,
    'pc-party-blank-fields:' || n.policy_id::text
  FROM ff_pc_note_body n
  WHERE n.has_flags
    AND NOT EXISTS (
      SELECT 1
      FROM activities a
      WHERE a.tenant_id = n.tenant_id
        AND a.source_id = 'pc-party-blank-fields:' || n.policy_id::text
        AND a.kind = 'note'
    )
  RETURNING id, tenant_id, policy_id, title, notes, contact_id, account_id, deal_id
),
logged AS (
  INSERT INTO activity_logs (
    tenant_id, activity_id, kind, event_type, body, occurred_at,
    contact_id, account_id, policy_id, deal_id, direction, subject, producer_name
  )
  SELECT
    i.tenant_id,
    i.id,
    'note',
    'created',
    'Task created: ' || i.title || E'\n\n' || i.notes,
    now(),
    i.contact_id,
    i.account_id,
    i.policy_id,
    i.deal_id,
    'internal',
    i.title,
    n.producer_name
  FROM inserted i
  JOIN ff_pc_note_body n ON n.policy_id = i.policy_id
  RETURNING id
)
SELECT count(*)::bigint AS notes_inserted FROM inserted;

\echo '=== notes updated ==='
WITH updated AS (
  UPDATE activities a
  SET notes = n.notes,
      updated_at = now(),
      contact_id = COALESCE(a.contact_id, n.resolved_contact_id),
      account_id = COALESCE(a.account_id, n.resolved_account_id),
      deal_id = COALESCE(a.deal_id, n.deal_id),
      policy_id = COALESCE(a.policy_id, n.policy_id)
  FROM ff_pc_note_body n
  WHERE a.tenant_id = n.tenant_id
    AND a.kind = 'note'
    AND a.source_id = 'pc-party-blank-fields:' || n.policy_id::text
    AND a.notes IS DISTINCT FROM n.notes
  RETURNING a.id
)
SELECT count(*)::bigint AS notes_updated FROM updated;

\echo '=== activity logs refreshed ==='
WITH refreshed AS (
  UPDATE activity_logs l
  SET body = 'Task created: Missing P&C fields' || E'\n\n' || a.notes,
      producer_name = COALESCE(l.producer_name, n.producer_name)
  FROM activities a
  JOIN ff_pc_note_body n
    ON a.source_id = 'pc-party-blank-fields:' || n.policy_id::text
   AND a.tenant_id = n.tenant_id
  WHERE l.activity_id = a.id
    AND l.body IS DISTINCT FROM ('Task created: Missing P&C fields' || E'\n\n' || a.notes)
  RETURNING l.id
)
SELECT count(*)::bigint AS logs_updated FROM refreshed;

INSERT INTO activity_logs (
  tenant_id, activity_id, kind, event_type, body, occurred_at,
  contact_id, account_id, policy_id, deal_id, direction, subject, producer_name
)
SELECT
  a.tenant_id,
  a.id,
  'note',
  'created',
  'Task created: Missing P&C fields' || E'\n\n' || a.notes,
  COALESCE(a.created_at, now()),
  a.contact_id,
  a.account_id,
  a.policy_id,
  a.deal_id,
  'internal',
  a.title,
  n.producer_name
FROM activities a
JOIN ff_pc_note_body n
  ON a.source_id = 'pc-party-blank-fields:' || n.policy_id::text
 AND a.tenant_id = n.tenant_id
WHERE a.kind = 'note'
  AND NOT EXISTS (
    SELECT 1 FROM activity_logs l WHERE l.activity_id = a.id
  );

COMMIT;
