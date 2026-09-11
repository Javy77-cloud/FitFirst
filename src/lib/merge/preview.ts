import { MATCH_REASON_LABELS, type MatchReason } from "@/lib/domain";
import {
  ACCOUNT_COPY_FIELDS,
  CONTACT_COPY_FIELDS,
  copyMissingFields,
  LEAD_COPY_FIELDS,
} from "./copy-fields";
import { blank } from "./normalize";

export type PreviewRow = {
  field: string;
  keeper: string;
  duplicate: string;
  action: "keep" | "copy" | "append";
};

const LABELS: Record<string, string> = {
  firstName: "First Name",
  lastName: "Last Name",
  name: "Name",
  legalName: "Legal Name",
  dba: "DBA",
  email: "Email",
  phone: "Phone",
  mailingAddress: "Mailing Address",
  city: "City",
  state: "State",
  zip: "ZIP",
  website: "Website",
  entityType: "Entity Type",
  industry: "Industry",
  naics: "NAICS",
  employeeCount: "Employee Count",
  annualSales: "Annual Sales",
  payrollW2: "Payroll",
  yearsInBusiness: "Years In Business",
  dateOfBirth: "Date Of Birth",
  tenureStart: "Tenure Start",
  policyCount: "Policy Count",
  notes: "Notes",
  lifeNotes: "Life Notes",
  healthNotes: "Health Notes",
  pcNotes: "P&C Notes",
  source: "Source",
  referral: "Referral",
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
  entityType: "contact" | "lead" | "account",
  keeper: Record<string, unknown>,
  duplicate: Record<string, unknown>,
): PreviewRow[] {
  const fields =
    entityType === "contact"
      ? CONTACT_COPY_FIELDS
      : entityType === "account"
        ? ACCOUNT_COPY_FIELDS
        : LEAD_COPY_FIELDS;
  const { copiedFields } = copyMissingFields(keeper, duplicate, fields);
  const keys =
    entityType === "account"
      ? [
          "name",
          "legalName",
          "dba",
          "email",
          "phone",
          "mailingAddress",
          "city",
          "state",
          "zip",
          "website",
          "entityType",
          "industry",
          "naics",
          "employeeCount",
          "annualSales",
          "payrollW2",
          "yearsInBusiness",
          "source",
          "referral",
          "notes",
          "lifeNotes",
          "healthNotes",
          "pcNotes",
          "policyCount",
        ]
      : [
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
