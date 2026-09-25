-- One result set for the flag CSV. Rolls back. Does not write.
--
--   psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 --csv \
--     -f scripts/backfill/pc-policy-from-party/03-flag-export.sql \
--     > pc-policy-flags.csv
--
-- Columns: policy_number, party_name, field, reason.
-- party_name is First Last for a person and the account name for a business.
-- Commission blanks are not included.

\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '10min';
SET LOCAL client_min_messages = warning;
\ir 00-resolve.sql

SELECT policy_number, party_name, field, reason
FROM ff_pc_flags
ORDER BY policy_number, field, reason;

ROLLBACK;
