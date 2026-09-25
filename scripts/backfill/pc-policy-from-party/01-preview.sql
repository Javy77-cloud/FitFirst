-- Read-only preview. Builds session temp tables, prints the scan, the fills, and the flags, then rolls back.
-- Does not update policies, custom values, drivers, notes, or alerts.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/backfill/pc-policy-from-party/01-preview.sql
--
-- Counts below are whatever the connected database returns. This file does not embed a count.

\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '10min';
SET LOCAL client_min_messages = warning;
\ir 00-resolve.sql

\echo '=== SCAN COUNT (P&C policies in scope) ==='
SELECT count(*)::bigint AS pc_policy_count
FROM ff_pc_resolved;

\echo '=== SCAN BREAKDOWN ==='
SELECT party_kind, line_class, link_status, count(*)::bigint AS policies
FROM ff_pc_resolved
GROUP BY 1, 2, 3
ORDER BY 1, 2, 3;

\echo '=== FILL PREVIEW TOTALS ==='
SELECT field_key, field_label, count(*)::bigint AS fields_to_fill
FROM ff_pc_fills
GROUP BY 1, 2
ORDER BY 1, 2;

\echo '=== FILL PREVIEW ==='
SELECT policy_number, party_name, field_key, field_label, new_value
FROM ff_pc_fills
ORDER BY policy_number, field_key, target_id NULLS FIRST;

\echo '=== FLAG LIST ==='
SELECT policy_number, party_name, field, reason
FROM ff_pc_flags
ORDER BY policy_number, field, reason;

ROLLBACK;
