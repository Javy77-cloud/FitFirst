/** Agency-configurable policy display-name template. Empty fields are skipped — no double separators. */

export const POLICY_LABEL_FIELD_IDS = [
  "ownerName",
  "carrier",
  "policyType",
  "policyNumber",
  "lineOfBusiness",
  "formType",
  "policySubType",
  "status",
  "effectiveDate",
  "expirationDate",
] as const;

export type PolicyLabelFieldId = (typeof POLICY_LABEL_FIELD_IDS)[number];

export type PolicyLabelFieldDef = {
  id: PolicyLabelFieldId;
  label: string;
  hint: string;
};

export const POLICY_LABEL_FIELDS: PolicyLabelFieldDef[] = [
  { id: "ownerName", label: "Owner / insured name", hint: "Contact or business on the policy" },
  { id: "carrier", label: "Carrier", hint: "Writing carrier name" },
  { id: "policyType", label: "Policy type", hint: "policyType, else formType / line" },
  { id: "policyNumber", label: "Policy number", hint: "Carrier policy #" },
  { id: "lineOfBusiness", label: "Line of business", hint: "HO / Auto / Flood…" },
  { id: "formType", label: "Form type", hint: "HO3, PA, …" },
  { id: "policySubType", label: "Policy sub-type", hint: "Sub-type when set" },
  { id: "status", label: "Status", hint: "In force, bound, …" },
  { id: "effectiveDate", label: "Effective date", hint: "MM/DD/YYYY" },
  { id: "expirationDate", label: "Expiration date", hint: "MM/DD/YYYY" },
];

export type PolicyLabelTemplate = {
  fields: PolicyLabelFieldId[];
  separator: string;
};

/** Default: owner / carrier / policy type / policy number */
export const DEFAULT_POLICY_LABEL_TEMPLATE: PolicyLabelTemplate = {
  fields: ["ownerName", "carrier", "policyType", "policyNumber"],
  separator: " / ",
};

export function isPolicyLabelFieldId(value: string): value is PolicyLabelFieldId {
  return (POLICY_LABEL_FIELD_IDS as readonly string[]).includes(value);
}

export function normalizePolicyLabelTemplate(
  raw: unknown,
): PolicyLabelTemplate {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_POLICY_LABEL_TEMPLATE, fields: [...DEFAULT_POLICY_LABEL_TEMPLATE.fields] };
  const obj = raw as { fields?: unknown; separator?: unknown };
  const fields = Array.isArray(obj.fields)
    ? obj.fields.filter((id): id is PolicyLabelFieldId => typeof id === "string" && isPolicyLabelFieldId(id))
    : [...DEFAULT_POLICY_LABEL_TEMPLATE.fields];
  const unique: PolicyLabelFieldId[] = [];
  for (const id of fields) {
    if (!unique.includes(id)) unique.push(id);
  }
  const separator =
    typeof obj.separator === "string" && obj.separator.length > 0
      ? obj.separator.slice(0, 8)
      : DEFAULT_POLICY_LABEL_TEMPLATE.separator;
  if (unique.length === 0) {
    return { fields: [...DEFAULT_POLICY_LABEL_TEMPLATE.fields], separator };
  }
  return { fields: unique, separator };
}

function formatLabelDate(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

export type PolicyLabelValues = {
  ownerName?: string | null;
  carrier?: string | null;
  policyType?: string | null;
  policyNumber?: string | null;
  lineOfBusiness?: string | null;
  formType?: string | null;
  policySubType?: string | null;
  status?: string | null;
  effectiveDate?: Date | string | null;
  expirationDate?: Date | string | null;
};

function resolveFieldValue(id: PolicyLabelFieldId, values: PolicyLabelValues): string {
  switch (id) {
    case "ownerName":
      return (values.ownerName ?? "").trim();
    case "carrier":
      return (values.carrier ?? "").trim();
    case "policyType":
      return (
        (values.policyType ?? "").trim() ||
        (values.formType ?? "").trim() ||
        (values.lineOfBusiness ?? "").trim()
      );
    case "policyNumber":
      return (values.policyNumber ?? "").trim();
    case "lineOfBusiness":
      return (values.lineOfBusiness ?? "").trim();
    case "formType":
      return (values.formType ?? "").trim();
    case "policySubType":
      return (values.policySubType ?? "").trim();
    case "status":
      return (values.status ?? "").trim().replaceAll("_", " ");
    case "effectiveDate":
      return formatLabelDate(values.effectiveDate);
    case "expirationDate":
      return formatLabelDate(values.expirationDate);
    default:
      return "";
  }
}

/** Join non-empty parts with separator — never doubles separators for blanks. */
export function buildPolicyLabel(
  template: PolicyLabelTemplate | null | undefined,
  values: PolicyLabelValues,
): string {
  const tpl = normalizePolicyLabelTemplate(template ?? DEFAULT_POLICY_LABEL_TEMPLATE);
  const parts = tpl.fields
    .map((id) => resolveFieldValue(id, values))
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return (values.policyNumber ?? "").trim() || "Policy";
  }
  return parts.join(tpl.separator);
}

export function policyLabelPreviewSample(template: PolicyLabelTemplate): string {
  return buildPolicyLabel(template, {
    ownerName: "Elena Hale",
    carrier: "Citizens",
    policyType: "HO3",
    policyNumber: "HP-FL-88421",
    lineOfBusiness: "HO",
    formType: "HO3",
    policySubType: "Homeowners",
    status: "in_force",
    effectiveDate: "2025-10-01T12:00:00.000Z",
    expirationDate: "2026-10-01T12:00:00.000Z",
  });
}
