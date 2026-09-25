import { policyFormProductLabel } from "@/lib/policy/form-label";

export function formatPolicyDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

/** Zoho policy name: {Contact} / {Sub-Type} / {Carrier} / {MM/DD/YYYY} */
export function policyRecordName(input: {
  contactName?: string | null;
  businessName?: string | null;
  subType?: string | null;
  lineOfBusiness?: string | null;
  formType?: string | null;
  carrierName?: string | null;
  effectiveDate?: Date | string | null;
}): string {
  const party = input.contactName?.trim() || input.businessName?.trim() || "Unnamed";
  const sub =
    policyFormProductLabel({
      policySubType: input.subType,
      formType: input.formType,
      lineOfBusiness: input.lineOfBusiness,
    }) || "Policy";
  const carrier = input.carrierName?.trim() || "Carrier TBD";
  return `${party} / ${sub} / ${carrier} / ${formatPolicyDate(input.effectiveDate)}`;
}

export function partyLabel(contact?: { firstName: string; lastName: string } | null, account?: { name: string } | null) {
  if (contact) return `${contact.firstName} ${contact.lastName}`.trim();
  if (account) return account.name;
  return "";
}
