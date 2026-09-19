import type { FormFieldDef } from "@/lib/db/schema";

export type FormTemplateSeed = {
  slug: string;
  name: string;
  line: string;
  family: string;
  summary: string;
  fields: FormFieldDef[];
};

const propertyFields: FormFieldDef[] = [
  { key: "named_insured", label: "Named insured", group: "Applicant", contactKey: "name" },
  { key: "phone", label: "Phone", group: "Applicant", contactKey: "phone" },
  { key: "email", label: "Email", group: "Applicant", contactKey: "email" },
  { key: "mailing", label: "Mailing address", group: "Applicant", contactKey: "mailing" },
  { key: "address1", label: "Property address", group: "Property", sheetKey: "address1" },
  { key: "city", label: "City", group: "Property", sheetKey: "city" },
  { key: "county", label: "County", group: "Property", sheetKey: "county" },
  { key: "state", label: "State", group: "Property", sheetKey: "state" },
  { key: "zip", label: "ZIP", group: "Property", sheetKey: "zip" },
  { key: "year_built", label: "Year built", group: "Dwelling", sheetKey: "year_built" },
  { key: "construction", label: "Construction", group: "Dwelling", sheetKey: "construction" },
  { key: "occupancy", label: "Occupancy", group: "Dwelling", sheetKey: "occupancy" },
  { key: "roof_year", label: "Roof year", group: "Wind / roof", sheetKey: "roof_year" },
  { key: "roof_covering", label: "Roof covering", group: "Wind / roof", sheetKey: "roof_covering" },
  { key: "opening_protection", label: "Opening protection", group: "Wind / roof", sheetKey: "opening_protection" },
  { key: "coverage_a", label: "Coverage A", group: "Coverages", sheetKey: "coverage_a" },
  { key: "current_carrier", label: "Current carrier", group: "Prior", sheetKey: "current_carrier" },
];

const agencyFields: FormFieldDef[] = [
  { key: "named_insured", label: "Named insured", group: "Party", contactKey: "name" },
  { key: "phone", label: "Phone", group: "Party", contactKey: "phone" },
  { key: "email", label: "Email", group: "Party", contactKey: "email" },
  { key: "mailing", label: "Mailing address", group: "Party", contactKey: "mailing" },
  { key: "policy_number", label: "Policy number", group: "Policy" },
  { key: "current_carrier", label: "Current carrier", group: "Policy", sheetKey: "current_carrier" },
  { key: "effective_date", label: "Effective date", group: "Policy" },
];

export const FORM_TEMPLATE_SEEDS: FormTemplateSeed[] = [
  {
    slug: "fl-ho3",
    name: "Florida HO3 application (style label)",
    line: "HO",
    family: "ACORD-style 80",
    summary:
      "Not a licensed ACORD product. Fills from the Deal Quote Sheet record — never from raw PDFs.",
    fields: propertyFields,
  },
  {
    slug: "fl-home-packet",
    name: "Home shopping packet",
    line: "HO",
    family: "Desk packet",
    summary: "Printable preview of the same Quote Sheet cells used by Super-Copy and Send to Fill.",
    fields: propertyFields.filter((field) =>
      ["named_insured", "address1", "city", "state", "zip", "coverage_a", "current_carrier"].includes(
        field.key,
      ),
    ),
  },
  {
    slug: "agency-cancellation",
    name: "Cancellation request",
    line: "HO",
    family: "Agency form",
    summary: "Agency cancellation request. Prefill from a dec or deal, then send for signature. Not a carrier portal.",
    fields: [
      ...agencyFields,
      { key: "cancellation_date", label: "Cancellation date", group: "Request" },
      { key: "cancellation_reason", label: "Reason", group: "Request" },
    ],
  },
  {
    slug: "agency-aor",
    name: "Agent of record",
    line: "HO",
    family: "Agency form",
    summary: "Agency AOR letter. Map fields from an uploaded dec or paste. Live in the Documents send loop.",
    fields: [
      ...agencyFields,
      { key: "prior_agency", label: "Prior agency", group: "AOR" },
      { key: "new_agency", label: "New agency", group: "AOR" },
    ],
  },
  {
    slug: "agency-loss-run",
    name: "No Run Loss request",
    line: "HO",
    family: "Agency form",
    summary: "Loss-run request. Prefill from the deal or an uploaded dec, then send for signature.",
    fields: [
      ...agencyFields,
      { key: "requested_years", label: "Years requested", group: "Request" },
      { key: "request_reason", label: "Reason", group: "Request" },
      { key: "new_agency", label: "Requesting agency", group: "Request" },
    ],
  },
];
