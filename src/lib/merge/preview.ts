import { MATCH_REASON_LABELS, type MatchReason } from "@/lib/domain";
import { CONTACT_COPY_FIELDS, copyMissingFields, LEAD_COPY_FIELDS } from "./copy-fields";
import { blank } from "./normalize";

export type PreviewRow = {
  field: string;
  keeper: string;
  duplicate: string;
  action: "keep" | "copy" | "append";
};

const LABELS: Record<string, string> = {
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  phone: "Phone",
  mailingAddress: "Mailing address",
  city: "City",
  state: "State",
  zip: "ZIP",
  dateOfBirth: "Date of birth",
  tenureStart: "Tenure start",
  policyCount: "Policy count",
  notes: "Notes",
  lifeNotes: "Life notes",
  healthNotes: "Health notes",
  source: "Source",
  status: "Status",
};

function display(value: unknown): string {
  if (blank(value)) return "—";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

export function reasonLabels(reasons: string[]): string[] {
  return reasons.map((r) => MATCH_REASON_LABELS[r as MatchReason] ?? r);
}

export function fieldPreview(
  entityType: "contact" | "lead",
  keeper: Record<string, unknown>,
  duplicate: Record<string, unknown>,
): PreviewRow[] {
  const fields = entityType === "contact" ? CONTACT_COPY_FIELDS : LEAD_COPY_FIELDS;
  const { copiedFields } = copyMissingFields(keeper, duplicate, fields);
  const keys = [
    "firstName",
    "lastName",
    ...fields,
    "notes",
    ...(entityType === "contact" ? (["policyCount"] as const) : []),
  ];
  const seen = new Set<string>();
  const rows: PreviewRow[] = [];
  for (const field of keys) {
    if (seen.has(field)) continue;
    seen.add(field);
    const action = copiedFields.includes(field)
      ? field === "notes" || field === "lifeNotes" || field === "healthNotes"
        ? blank(keeper[field])
          ? "copy"
          : "append"
        : "copy"
      : "keep";
    rows.push({
      field: LABELS[field] ?? field,
      keeper: display(keeper[field]),
      duplicate: display(duplicate[field]),
      action,
    });
  }
  return rows;
}
