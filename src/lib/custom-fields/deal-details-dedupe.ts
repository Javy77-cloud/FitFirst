/**
 * Deal Details personal form: one instance per fact.
 * Prefer existing applicant_* / contact keys over contact-module aliases.
 */
export const DEAL_DETAILS_ALIAS_CANONICAL: Record<string, string> = {
  selling_agency: "picklist_yp0c",
  sellingAgency: "picklist_yp0c",
  marital_status: "applicant_marital_status",
  gender: "applicant_gender",
  occupation: "applicant_occupation",
  employment_status: "applicant_employment",
  education_level: "applicant_education_level",
  industry: "applicant_industry",
  applicant_phone: "phone",
  applicant_email: "email",
  applicant_dob: "date_of_birth",
};

export function isDuplicateDealDetailsField(
  key: string,
  layoutKeys: ReadonlySet<string>,
  seen: ReadonlySet<string>,
): boolean {
  if (seen.has(key)) return true;
  const canonical = DEAL_DETAILS_ALIAS_CANONICAL[key];
  return Boolean(canonical && layoutKeys.has(canonical));
}
