/** Safe, public reason strings for HealthSherpa webhook failures. Never include stacks or secrets. */

const PG_CODE = /^[0-9A-Z]{5}$/;

function postgresErrorCode(error: unknown): string | null {
  let current: unknown = error;
  for (let i = 0; i < 4 && current && typeof current === "object"; i++) {
    const row = current as { code?: unknown; cause?: unknown };
    if (typeof row.code === "string" && PG_CODE.test(row.code)) return row.code;
    current = row.cause;
  }
  return null;
}

export function publicHealthSherpaIngestError(error: unknown): {
  status: 422 | 500;
  reason: string;
} {
  const code = postgresErrorCode(error);
  if (code === "22P02") {
    return {
      status: 422,
      reason:
        "A HealthSherpa field could not be stored as a FitFirst id. contact.external_id is only used to match a contact or deal when it is a UUID.",
    };
  }
  if (code === "23505") {
    return {
      status: 500,
      reason: "Enrollment conflicted with an existing FitFirst record.",
    };
  }
  if (code === "23503") {
    return {
      status: 500,
      reason: "Enrollment referenced a missing FitFirst record.",
    };
  }
  return {
    status: 500,
    reason: "HealthSherpa webhook ingest failed.",
  };
}

export function logHealthSherpaIngestError(error: unknown): void {
  const code = postgresErrorCode(error);
  const name = error instanceof Error ? error.name : "Error";
  console.error("healthsherpa webhook ingest failed", name, code ?? "unknown");
}
