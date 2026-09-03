import { AGENCY_BRAND, formatDay } from "@/lib/domain";

export type TemplateMergeValues = {
  contactFirstName: string;
  agencyName?: string;
  policyType: string;
  wonDate: Date | string | null;
  reviewLink?: string;
  agentPhone?: string;
  signature?: string;
};

const KEY_ALIASES: Record<string, keyof TemplateMergeValues | "wonDateFormatted"> = {
  contact_first_name: "contactFirstName",
  first_name: "contactFirstName",
  "contact.first_name": "contactFirstName",
  agency_name: "agencyName",
  policy_type: "policyType",
  won_date: "wonDateFormatted",
  review_link: "reviewLink",
  agent_phone: "agentPhone",
  signature: "signature",
};

export function mergeTemplate(text: string, values: TemplateMergeValues): string {
  const wonDateFormatted = formatDay(values.wonDate);
  const resolved: Record<string, string> = {
    contactFirstName: values.contactFirstName || "there",
    agencyName: values.agencyName || AGENCY_BRAND.name,
    policyType: values.policyType || "policy",
    wonDateFormatted: wonDateFormatted === "—" ? "" : wonDateFormatted,
    reviewLink: values.reviewLink || AGENCY_BRAND.reviewLinkPlaceholder,
    agentPhone: values.agentPhone || AGENCY_BRAND.phone,
    signature: values.signature || "",
  };

  return text.replace(/\{\{\s*([a-z0-9_.]+)\s*\}\}/gi, (_full, key: string) => {
    const mapped = KEY_ALIASES[key.toLowerCase()];
    if (!mapped) return _full;
    if (mapped === "wonDateFormatted") return resolved.wonDateFormatted;
    return resolved[mapped] ?? _full;
  });
}
