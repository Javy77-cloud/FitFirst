/** Agency correction of book term dates (effective / expiration / renewal). */

export type TermDateKey = "effectiveDate" | "expirationDate" | "renewalDate";

export type TermDateSnapshot = {
  effectiveDate: Date | string | null | undefined;
  expirationDate: Date | string | null | undefined;
  renewalDate?: Date | string | null | undefined;
};

export type TermOverrideInput = {
  effectiveDate: string;
  expirationDate: string;
  renewalDate: string;
  reason: string;
};

export type TermOverridePatch = {
  effectiveDate: Date;
  expirationDate: Date;
  renewalDate: Date | null;
};

export type TermOverrideAuditMeta = {
  kind: "term_override";
  reason: string;
  effectiveDate: { from: string; to: string };
  expirationDate: { from: string; to: string };
  renewalDate: { from: string; to: string };
};

const EMPTY = "—";

export function parseTermDateInput(raw: string): Date | null {
  const t = raw.trim();
  if (!t) return null;
  const d = new Date(`${t}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatTermDateIso(value: Date | string | null | undefined): string {
  if (value == null || value === "") return EMPTY;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return EMPTY;
    return value.toISOString().slice(0, 10);
  }
  const text = String(value).trim();
  if (!text) return EMPTY;
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const d = new Date(text);
  if (Number.isNaN(d.getTime())) return EMPTY;
  return d.toISOString().slice(0, 10);
}

/** Validate agency Correct term dates payload. Reason is always required. */
export function buildTermOverridePatch(
  input: TermOverrideInput,
  existing: TermDateSnapshot,
):
  | { ok: true; patch: TermOverridePatch; meta: TermOverrideAuditMeta; changed: boolean }
  | { ok: false; error: string } {
  const reason = (input.reason ?? "").trim();
  if (!reason) {
    return { ok: false, error: "A reason is required to correct term dates." };
  }
  if (reason.length > 500) {
    return { ok: false, error: "Reason must be 500 characters or fewer." };
  }

  const effectiveDate = parseTermDateInput(input.effectiveDate);
  const expirationDate = parseTermDateInput(input.expirationDate);
  if (!effectiveDate) {
    return { ok: false, error: "Enter a valid effective date (YYYY-MM-DD)." };
  }
  if (!expirationDate) {
    return { ok: false, error: "Enter a valid expiration date (YYYY-MM-DD)." };
  }
  if (expirationDate.getTime() < effectiveDate.getTime()) {
    return { ok: false, error: "Expiration must be on or after the effective date." };
  }

  const renewalRaw = (input.renewalDate ?? "").trim();
  let renewalDate: Date | null = null;
  if (renewalRaw) {
    renewalDate = parseTermDateInput(renewalRaw);
    if (!renewalDate) {
      return { ok: false, error: "Enter a valid renewal date (YYYY-MM-DD), or leave it blank." };
    }
  }

  const patch: TermOverridePatch = { effectiveDate, expirationDate, renewalDate };
  const fromEffective = formatTermDateIso(existing.effectiveDate);
  const fromExpiration = formatTermDateIso(existing.expirationDate);
  const fromRenewal = formatTermDateIso(existing.renewalDate ?? null);
  const toEffective = formatTermDateIso(effectiveDate);
  const toExpiration = formatTermDateIso(expirationDate);
  const toRenewal = formatTermDateIso(renewalDate);

  const changed =
    fromEffective !== toEffective || fromExpiration !== toExpiration || fromRenewal !== toRenewal;

  return {
    ok: true,
    patch,
    changed,
    meta: {
      kind: "term_override",
      reason,
      effectiveDate: { from: fromEffective, to: toEffective },
      expirationDate: { from: fromExpiration, to: toExpiration },
      renewalDate: { from: fromRenewal, to: toRenewal },
    },
  };
}

export function termOverrideSummary(meta: TermOverrideAuditMeta, policyNumber?: string | null): string {
  const label = (policyNumber ?? "").trim() || "policy";
  const bits: string[] = [];
  if (meta.effectiveDate.from !== meta.effectiveDate.to) {
    bits.push(`effective ${meta.effectiveDate.from}→${meta.effectiveDate.to}`);
  }
  if (meta.expirationDate.from !== meta.expirationDate.to) {
    bits.push(`expiration ${meta.expirationDate.from}→${meta.expirationDate.to}`);
  }
  if (meta.renewalDate.from !== meta.renewalDate.to) {
    bits.push(`renewal ${meta.renewalDate.from}→${meta.renewalDate.to}`);
  }
  const deltas = bits.length > 0 ? bits.join("; ") : "no date change";
  return `Corrected term dates on ${label} (${deltas}). Reason: ${meta.reason}`;
}
