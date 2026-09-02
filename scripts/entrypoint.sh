#!/usr/bin/env bash
set -euo pipefail

echo "Waiting for Postgres..."
for i in $(seq 1 40); do
  if npx tsx -e "import postgres from 'postgres'; const sql = postgres(process.env.DATABASE_URL, {max:1}); await sql\`select 1\`; await sql.end();" 2>/dev/null; then
    break
  fi
  sleep 1
  if [ "$i" -eq 40 ]; then
    echo "Postgres did not become ready."
    exit 1
  fi
done

npx drizzle-kit migrate
npx tsx scripts/seed.ts
npx tsx scripts/generate-pdfs.ts || true

PORT="${PORT:-43147}"
HOST="${HOST:-0.0.0.0}"

if [ "${NODE_ENV:-production}" = "development" ]; then
  exec npx next dev --port "$PORT" --hostname "$HOST"
fi

exec npx next start --port "$PORT" --hostname "$HOST"
