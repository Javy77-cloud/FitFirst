import type { SheetProduct } from "./products";

export type QuoteFieldDef = {
  key: string;
  label: string;
  group: string;
  input?: "text" | "number" | "textarea";
  /** Maps an extraction fieldKey onto this sheet key. */
  extractKey?: string;
  /** When set, the field only shows for these products. */
  products?: SheetProduct[];
};

/** Shared applicant block on every master sheet. One deal, one product. */
export const APPLICANT_CORE_FIELDS: QuoteFieldDef[] = [
  { key: "applicant_name", label: "Applicant name", group: "Applicant", extractKey: "named_insured" },
  { key: "applicant_address", label: "Applicant address", group: "Applicant", extractKey: "mailing_address" },
  { key: "applicant_phone", label: "Phone", group: "Applicant", extractKey: "phone" },
  { key: "applicant_email", label: "Email", group: "Applicant", extractKey: "email" },
  { key: "applicant_dob", label: "Date of birth", group: "Applicant", extractKey: "dob" },
  { key: "entity_type", label: "Entity type", group: "Applicant", extractKey: "entity_type" },
];
