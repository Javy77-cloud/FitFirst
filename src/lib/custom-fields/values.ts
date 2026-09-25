import type { CustomFieldDef } from "./types";
import { ERRORS_OMISSIONS_LABEL, isErrorsOmissionsProduct } from "@/lib/policy/eo";
import { coerceQuotingFormId, quotingFormLabel } from "@/lib/quoting/forms";

function insuranceSubtypeField(fields: readonly CustomFieldDef[] | undefined) {
  if (!fields?.length) return null;
  return (
    fields.find((field) => field.systemKey === "quotingForm") ??
    fields.find((field) => field.key === "insurance_subtype") ??
    fields.find((field) => /^insurance subtype$/i.test(field.label)) ??
    null
  );
}

export function mergeDealSystemValues(
  deal: {
    primaryNamedInsured?: string | null;
    notes?: string | null;
    state?: string | null;
    quotingForm?: string | null;
  },
  lead:
    | {
        firstName?: string | null;
        middleName?: string | null;
        lastName?: string | null;
        email?: string | null;
        phone?: string | null;
        dateOfBirth?: string | null;
        mailingAddress?: string | null;
        city?: string | null;
        state?: string | null;
        zip?: string | null;
        notes?: string | null;
      }
    | null
    | undefined,
  stored: Record<string, string>,
  fields?: readonly CustomFieldDef[],
): Record<string, string> {
  const fromLead: Record<string, string> = {
    first_name: lead?.firstName ?? "",
    middle_name: lead?.middleName ?? "",
    last_name: lead?.lastName ?? "",
    email: lead?.email ?? "",
    phone: lead?.phone ?? "",
    date_of_birth: lead?.dateOfBirth ?? "",
    mailing_address: lead?.mailingAddress ?? "",
    city: lead?.city ?? "",
    state: lead?.state ?? deal.state ?? "",
    zip: lead?.zip ?? "",
    notes: stored.notes || deal.notes || lead?.notes || "",
    named_insured: stored.named_insured || deal.primaryNamedInsured || "",
  };
  const merged = { ...fromLead, ...stored };
  const subtype = insuranceSubtypeField(fields);
  if (!subtype) return merged;
  const fromDeal = quotingFormLabel(deal.quotingForm ?? "");
  if (fromDeal) {
    merged[subtype.key] =
      isErrorsOmissionsProduct(fromDeal) || isErrorsOmissionsProduct(deal.quotingForm)
        ? ERRORS_OMISSIONS_LABEL
        : fromDeal;
    return merged;
  }
  const coerced = coerceQuotingFormId(merged[subtype.key]);
  if (coerced) {
    const label = quotingFormLabel(coerced);
    merged[subtype.key] = isErrorsOmissionsProduct(label) ? ERRORS_OMISSIONS_LABEL : label;
  }
  return merged;
}
