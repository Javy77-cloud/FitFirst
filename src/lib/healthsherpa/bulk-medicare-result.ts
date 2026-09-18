import { HEALTHSHERPA_MEDICARE_BULK_AUTH_BANNER } from "./copy";

/** First failed-row messages kept on the oneshot lastRun payload so refresh still shows them. */
export const MEDICARE_BULK_ONESHOT_ERROR_LIMIT = 20;

export type MedicareBulkRowStatus = "synced" | "skipped" | "failed";

export type MedicareBulkRow = {
  contactId: string;
  name: string;
  status: MedicareBulkRowStatus;
  code?: string;
  message?: string;
};

export type MedicareBulkErrorRow = {
  contactId: string;
  name: string;
  code?: string;
  message: string;
};

export type MedicareBulkTally = {
  synced: number;
  skipped: number;
  failed: number;
  errors: MedicareBulkErrorRow[];
};

export type MedicareBulkRunResult = MedicareBulkTally & {
  ok: boolean;
  code: string;
  message: string;
  candidateCount: number;
  rows: MedicareBulkRow[];
  configured: boolean;
};

export type MedicareBulkOneshotLastRun = Pick<
  MedicareBulkRunResult,
  "synced" | "skipped" | "failed" | "code" | "message" | "candidateCount"
> & {
  errors: MedicareBulkErrorRow[];
};

export type MedicareBulkOneshotState = {
  hidden: boolean;
  lastRunAt: string | null;
  lastRun: MedicareBulkOneshotLastRun | null;
};

export function failedMedicareBulkMessages(
  input: Pick<MedicareBulkRunResult, "errors" | "rows"> | Pick<MedicareBulkOneshotLastRun, "errors">,
): MedicareBulkErrorRow[] {
  const errors = "errors" in input && Array.isArray(input.errors) ? input.errors : [];
  if (errors.length) {
    return errors.map((error) => ({
      contactId: error.contactId,
      name: error.name,
      code: error.code,
      message: error.message?.trim() || "HealthSherpa sync failed.",
    }));
  }
  const rows = "rows" in input && Array.isArray(input.rows) ? input.rows : [];
  return rows
    .filter((row) => row.status === "failed")
    .map((row) => ({
      contactId: row.contactId,
      name: row.name,
      code: row.code,
      message: row.message?.trim() || "HealthSherpa sync failed.",
    }));
}

export function medicareBulkAuthKind(input: { code?: string; message?: string }): "401" | "403" | "agent_email" | null {
  const hay = `${input.code ?? ""} ${input.message ?? ""}`.toLowerCase();
  if (/agent[_\s-]?email/.test(hay)) return "agent_email";
  if (/http_403|\b403\b|forbidden/.test(hay)) return "403";
  if (/http_401|\b401\b|unauthor|invalid (api )?key|api key|not_configured|access denied/.test(hay)) {
    return "401";
  }
  return null;
}

/** One banner when every failed row is the same 401 / 403 / agent-email error. */
export function medicareBulkAuthBanner(input: {
  synced: number;
  failed: number;
  errors?: MedicareBulkErrorRow[];
  rows?: MedicareBulkRow[];
}): string | null {
  if (input.synced > 0 || input.failed <= 0) return null;
  const samples = failedMedicareBulkMessages(input);
  if (!samples.length) return null;
  const kinds = samples.map((sample) => medicareBulkAuthKind(sample));
  if (kinds.some((kind) => kind == null)) return null;
  if (new Set(kinds).size !== 1) return null;
  return HEALTHSHERPA_MEDICARE_BULK_AUTH_BANNER;
}

export function persistableMedicareBulkLastRun(result: MedicareBulkRunResult): MedicareBulkOneshotLastRun {
  return {
    synced: result.synced,
    skipped: result.skipped,
    failed: result.failed,
    code: result.code,
    message: result.message,
    candidateCount: result.candidateCount,
    errors: failedMedicareBulkMessages(result).slice(0, MEDICARE_BULK_ONESHOT_ERROR_LIMIT),
  };
}

export function parsePersistedMedicareBulkErrors(raw: unknown): MedicareBulkErrorRow[] {
  if (!Array.isArray(raw)) return [];
  const errors: MedicareBulkErrorRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const contactId = typeof row.contactId === "string" ? row.contactId : "";
    const name = typeof row.name === "string" && row.name.trim() ? row.name : "Unnamed contact";
    const message = typeof row.message === "string" && row.message.trim() ? row.message : "";
    if (!contactId && !message) continue;
    errors.push({
      contactId,
      name,
      code: typeof row.code === "string" ? row.code : undefined,
      message: message || "HealthSherpa sync failed.",
    });
    if (errors.length >= MEDICARE_BULK_ONESHOT_ERROR_LIMIT) break;
  }
  return errors;
}

export function parseMedicareBulkOneshotState(
  raw: Record<string, unknown> | null | undefined,
): MedicareBulkOneshotState {
  const hidden = raw?.hidden === true;
  const lastRunAt = typeof raw?.lastRunAt === "string" ? raw.lastRunAt : null;
  const last = raw?.lastRun && typeof raw.lastRun === "object" ? (raw.lastRun as Record<string, unknown>) : null;
  return {
    hidden,
    lastRunAt,
    lastRun: last
      ? {
          synced: Number(last.synced) || 0,
          skipped: Number(last.skipped) || 0,
          failed: Number(last.failed) || 0,
          code: typeof last.code === "string" ? last.code : "ok",
          message: typeof last.message === "string" ? last.message : "",
          candidateCount: Number(last.candidateCount) || 0,
          errors: parsePersistedMedicareBulkErrors(last.errors),
        }
      : null,
  };
}
