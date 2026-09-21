/**
 * Apply drizzle/0147_calendar_event_sync.sql only (not a full db:migrate).
 *
 *   DATABASE_URL=postgres://... npx tsx scripts/apply-0147-calendar-event-sync.ts
 *
 * Refuses the local docker default unless ALLOW_DEFAULT_DB=1.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

const LOCAL_DEFAULT = "postgres://fitfirst:fitfirst_dev@127.0.0.1:5432/fitfirst";

async function tableExists(client: postgres.Sql, table: string) {
  const rows = await client<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ${table}
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  if (url === LOCAL_DEFAULT && process.env.ALLOW_DEFAULT_DB !== "1") {
    throw new Error(
      "DATABASE_URL is the local docker default. Refusing to run. Set ALLOW_DEFAULT_DB=1 only for a local desk.",
    );
  }

  const client = postgres(url, { max: 1 });
  try {
    if (await tableExists(client, "calendar_synced_events")) {
      console.log("0147 already applied (calendar_synced_events exists).");
      return;
    }
    const sql = readFileSync(resolve("drizzle/0147_calendar_event_sync.sql"), "utf8")
      .split("--> statement-breakpoint")
      .map((part) => part.trim())
      .filter(Boolean);
    for (const part of sql) {
      await client.unsafe(part);
    }
    if (!(await tableExists(client, "calendar_synced_events"))) {
      throw new Error("0147 did not create calendar_synced_events.");
    }
    console.log("Applied 0147_calendar_event_sync.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
