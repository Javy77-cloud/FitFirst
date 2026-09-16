/**
 * Silent pipeline / packet auto-tasks that flooded /tasks.
 * Notices, mortgagee reminders, and agent-created desk tasks are NOT matched.
 */

export const SILENT_AUTO_TASK_KINDS = [
  "stage_move",
  "mint_confirm",
  "servicing_aor",
  "servicing_id_card",
  "servicing_dec",
] as const;

const TITLE_PREFIXES = [
  "stage ·",
  "confirm declaration ·",
  "collect id cards",
  "collect aor packet",
  "collect aor package",
  "collect dec on file",
] as const;

export type SilentAutoTaskRow = {
  kind: string;
  title: string;
  status?: string | null;
};

function normalizeTitle(title: string) {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isSilentAutoTaskTitle(title: string) {
  const key = normalizeTitle(title);
  return TITLE_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export function isSilentAutoTaskKind(kind: string) {
  return (SILENT_AUTO_TASK_KINDS as readonly string[]).includes(kind);
}

/** Open junk only — never touch done / cancelled / agent notice kinds. */
export function isOpenSilentAutoTask(row: SilentAutoTaskRow) {
  const status = (row.status ?? "open").trim().toLowerCase();
  if (status !== "open") return false;
  return isSilentAutoTaskKind(row.kind) || isSilentAutoTaskTitle(row.title);
}

export const SILENT_AUTO_TASK_CLEANUP_SQL = `
UPDATE review_tasks
SET status = 'cancelled', completed_at = NOW()
WHERE tenant_id = $1
  AND status = 'open'
  AND (
    kind IN ('stage_move', 'mint_confirm', 'servicing_aor', 'servicing_id_card', 'servicing_dec')
    OR title ILIKE 'Stage · %'
    OR title ILIKE 'Confirm declaration · %'
    OR title ILIKE 'Collect ID cards%'
    OR title ILIKE 'Collect AOR packet%'
    OR title ILIKE 'Collect AOR package%'
    OR title ILIKE 'Collect Dec on file%'
  )
`.trim();
