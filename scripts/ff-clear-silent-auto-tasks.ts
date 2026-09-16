/**
 * One-shot: cancel open silent auto-tasks (stage / quote-sent / review / mint
 * confirm / Collect ID cards / Collect AOR). Tenant-scoped. Idempotent.
 *
 * Does NOT touch notice / mortgagee / agent-created work_reminder tasks.
 *
 *   DATABASE_URL=postgres://... tsx --env-file=.env scripts/ff-clear-silent-auto-tasks.ts
 *   DRY_RUN=1 DATABASE_URL=... tsx --env-file=.env scripts/ff-clear-silent-auto-tasks.ts
 *
 * Captain / Neon (same SQL):
 *   See scripts/ff-clear-silent-auto-tasks.sql — bind tenant_id once.
 */
import postgres from "postgres";
import { DEFAULT_TENANT_ID } from "../src/lib/domain";
import { isOpenSilentAutoTask } from "../src/lib/tasks/silent-auto";

const DRY_RUN = process.env.DRY_RUN === "1" || process.argv.includes("--dry-run");
const TENANT = process.env.TENANT_ID ?? DEFAULT_TENANT_ID;

async function main() {
  const url = process.env.DATABASE_URL ?? "postgres://fitfirst:fitfirst_dev@127.0.0.1:5432/fitfirst";
  const sql = postgres(url, { max: 1 });
  try {
    const open = await sql<
      { id: string; kind: string; title: string; status: string }[]
    >`
      SELECT id, kind, title, status
      FROM review_tasks
      WHERE tenant_id = ${TENANT}
        AND status = 'open'
    `;
    const junk = open.filter((row) => isOpenSilentAutoTask(row));
    console.log(JSON.stringify({ tenant: TENANT, open: open.length, junk: junk.length, dryRun: DRY_RUN }, null, 2));
    for (const row of junk) {
      console.log(`${DRY_RUN ? "DRY" : "CANCEL"}`, row.kind, row.title);
    }
    if (DRY_RUN || junk.length === 0) {
      return;
    }
    const ids = junk.map((row) => row.id);
    const updated = await sql`
      UPDATE review_tasks
      SET status = 'cancelled', completed_at = NOW()
      WHERE tenant_id = ${TENANT}
        AND status = 'open'
        AND id = ANY(${ids})
      RETURNING id
    `;
    console.log(JSON.stringify({ cancelled: updated.length }));
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
