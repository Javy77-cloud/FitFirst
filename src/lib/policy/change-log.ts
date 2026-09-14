export type PolicyChangeSource =
  | "record_edit"
  | "endorsement"
  | "cancellation"
  | "non_renewal"
  | "bind"
  | "seed";

export type PolicyFieldChange = {
  fieldKey: string;
  fieldLabel: string;
  beforeValue: string;
  afterValue: string;
};

export type PolicyChangeLogRow = {
  id: string;
  changedByName: string;
  changedAt: Date | string;
  fieldKey: string;
  fieldLabel: string;
  beforeValue: string | null;
  afterValue: string | null;
  source: string;
};

export type PolicyChangeGroup = {
  key: string;
  changedByName: string;
  changedAt: Date;
  source: string;
  fields: PolicyFieldChange[];
};

export const POLICY_HISTORY_FIELDS = [
  { key: "status", label: "Status" },
  { key: "policyNumber", label: "Policy number" },
  { key: "lineOfBusiness", label: "Line" },
  { key: "insuranceType", label: "Insurance family" },
  { key: "policyType", label: "Policy type" },
  { key: "policySubType", label: "Sub-type" },
  { key: "policyTerm", label: "Term" },
  { key: "premium", label: "Premium" },
  { key: "faceAmount", label: "Face amount" },
  { key: "billingFrequency", label: "Billing" },
  { key: "effectiveDate", label: "Effective" },
  { key: "expirationDate", label: "Expiration" },
  { key: "renewalDate", label: "Renewal" },
  { key: "oepStart", label: "OEP start" },
  { key: "commissionFamily", label: "Commission family" },
  { key: "commission4Pct", label: "Commission %" },
  { key: "sellingAgency", label: "Selling agency" },
  { key: "producer", label: "Producer" },
  { key: "insuredCount", label: "Insured count" },
  { key: "insuredSameAsMailing", label: "Same as mailing" },
  { key: "formType", label: "Form" },
  { key: "coverageA", label: "Coverage A" },
  { key: "endedAt", label: "Ended" },
  { key: "endReason", label: "End reason" },
  { key: "premisesAddress", label: "Premises street" },
  { key: "premisesCity", label: "Premises city" },
  { key: "premisesState", label: "Premises state" },
  { key: "premisesZip", label: "Premises ZIP" },
  { key: "labelOverride", label: "Display name" },
] as const;

const FIELD_LABELS = Object.fromEntries(
  POLICY_HISTORY_FIELDS.map((field) => [field.key, field.label]),
) as Record<string, string>;

const EMPTY = "—";

export function policyFieldLabel(fieldKey: string): string {
  return FIELD_LABELS[fieldKey] ?? fieldKey.replaceAll("_", " ");
}

export function formatHistoryValue(value: unknown): string {
  if (value == null || value === "") return EMPTY;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return EMPTY;
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return EMPTY;
    return String(value);
  }
  const text = String(value).trim();
  if (!text) return EMPTY;
  const asDate = /^\d{4}-\d{2}-\d{2}/.test(text) ? new Date(text) : null;
  if (asDate && !Number.isNaN(asDate.getTime()) && (text.includes("T") || text.length === 10)) {
    return asDate.toISOString().slice(0, 10);
  }
  return text;
}

export function valuesEqual(before: unknown, after: unknown): boolean {
  return formatHistoryValue(before) === formatHistoryValue(after);
}

/** Fill blank stored fields with the same defaults the Policy form shows, so a save does not log phantom first-fills. */
export function withHistoryDefaults(
  row: Record<string, unknown>,
  defaults: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...row };
  for (const [key, fallback] of Object.entries(defaults)) {
    if (formatHistoryValue(next[key]) === EMPTY) next[key] = fallback;
  }
  return next;
}

export function diffPolicyFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  keys: readonly string[] = POLICY_HISTORY_FIELDS.map((field) => field.key),
): PolicyFieldChange[] {
  const changes: PolicyFieldChange[] = [];
  for (const key of keys) {
    if (valuesEqual(before[key], after[key])) continue;
    changes.push({
      fieldKey: key,
      fieldLabel: policyFieldLabel(key),
      beforeValue: formatHistoryValue(before[key]),
      afterValue: formatHistoryValue(after[key]),
    });
  }
  return changes;
}

export function sourceLabel(source: string): string {
  if (source === "record_edit") return "Record edit";
  if (source === "endorsement") return "Endorsement";
  if (source === "cancellation") return "Cancellation";
  if (source === "non_renewal") return "Non-renewal";
  if (source === "bind") return "Bind";
  if (source === "seed") return "Seeded";
  return source.replaceAll("_", " ");
}

function groupKey(row: PolicyChangeLogRow): string {
  const when = row.changedAt instanceof Date ? row.changedAt.toISOString() : String(row.changedAt);
  return `${when}|${row.changedByName}|${row.source}`;
}

export function groupPolicyChangeLogs(rows: PolicyChangeLogRow[]): PolicyChangeGroup[] {
  const groups = new Map<string, PolicyChangeGroup>();
  for (const row of rows) {
    const key = groupKey(row);
    const existing = groups.get(key);
    const field: PolicyFieldChange = {
      fieldKey: row.fieldKey,
      fieldLabel: row.fieldLabel,
      beforeValue: row.beforeValue ?? EMPTY,
      afterValue: row.afterValue ?? EMPTY,
    };
    if (existing) {
      existing.fields.push(field);
      continue;
    }
    const changedAt = row.changedAt instanceof Date ? row.changedAt : new Date(row.changedAt);
    groups.set(key, {
      key,
      changedByName: row.changedByName,
      changedAt,
      source: row.source,
      fields: [field],
    });
  }
  return [...groups.values()].sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime());
}
