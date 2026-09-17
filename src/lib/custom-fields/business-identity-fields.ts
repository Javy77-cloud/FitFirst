import { CONTACT_METHOD_OPTIONS } from "@/lib/contacts/contact-field-catalog";
import { BUSINESS_ENTITY_TYPE_OPTIONS } from "@/lib/businesses/entity-industry";
import type { CustomFieldDef, FieldLayout, LayoutSection } from "./types";

/**
 * Reuse the businesses/accounts entity picklist (relabel only).
 * Do not invent Sole prop/Corp aliases — those orphan saved LLC/Corporation values.
 */
export const COMMERCIAL_ENTITY_TYPE_OPTIONS = BUSINESS_ENTITY_TYPE_OPTIONS;

/**
 * Commercial Deal Details keys — businesses/accounts + existing deal/contact keys.
 * Relabel in BUSINESS_IDENTITY_FIELDS; do not mint fein/annual_revenue/owner_*.
 */
export const BUSINESS_IDENTITY_FIELD_KEYS = [
  "business_name",
  "dba",
  "entity_type",
  "ein",
  "years_in_business",
  "naics",
  "operations",
  "annual_sales",
  "employee_count",
  "payroll",
  "first_name",
  "last_name",
  "date_of_birth",
  "phone",
  "email",
  "preferred_contact_method",
  "mailing_address",
  "mailing_unit",
  "city",
  "state",
  "zip",
  "county",
  "contact_mailing_address",
  "contact_mailing_unit",
  "contact_mailing_city",
  "contact_mailing_state",
  "contact_mailing_zip",
  "contact_mailing_county",
] as const;

export type BusinessIdentityFieldKey = (typeof BUSINESS_IDENTITY_FIELD_KEYS)[number];

/** Keys already on personal Deal CORE — commercial layout relabels them, field builder keeps CORE labels. */
export const BUSINESS_IDENTITY_REUSED_CORE_KEYS = [
  "entity_type",
  "preferred_contact_method",
  "first_name",
  "last_name",
  "date_of_birth",
  "phone",
  "email",
  "mailing_address",
  "mailing_unit",
  "city",
  "state",
  "zip",
  "county",
  "contact_mailing_address",
  "contact_mailing_unit",
  "contact_mailing_city",
  "contact_mailing_state",
  "contact_mailing_zip",
  "contact_mailing_county",
  "operations",
  "payroll",
] as const;

function field(
  key: string,
  label: string,
  type: CustomFieldDef["type"] = "single_line",
  extra?: Partial<CustomFieldDef>,
): CustomFieldDef {
  return { key, label, type, ...extra };
}

/** Catalog rows for Commercial Deal Details — business identity, not marital/gender. */
export const BUSINESS_IDENTITY_FIELDS: CustomFieldDef[] = [
  field("business_name", "Business name", "single_line", { systemKey: "primaryNamedInsured" }),
  field("dba", "DBA"),
  field("entity_type", "Entity type", "picklist", { options: [...COMMERCIAL_ENTITY_TYPE_OPTIONS] }),
  field("ein", "FEIN", "single_line", { systemKey: "ein" }),
  field("years_in_business", "Years in business", "number"),
  field("naics", "NAICS code"),
  field("operations", "Business description", "multi_line"),
  field("annual_sales", "Annual revenue", "currency"),
  field("employee_count", "Number of employees", "number"),
  field("payroll", "Payroll", "currency"),
  field("first_name", "Owner first name"),
  field("last_name", "Owner last name"),
  field("date_of_birth", "Owner date of birth", "dob"),
  field("phone", "Owner phone", "phone"),
  field("email", "Owner email", "email"),
  field("preferred_contact_method", "Preferred contact method", "picklist", {
    options: [...CONTACT_METHOD_OPTIONS],
  }),
];

export const COMMERCIAL_DEAL_SECTION_IDS = [
  "business",
  "owner",
  "business_operations",
  "insured_address",
  "mailing_address",
] as const;

function section(id: string, label: string, fieldKeys: string[]): LayoutSection {
  return { id, label, fieldKeys };
}

/** Commercial Create → Details body. Personal marital/gender applicant is not used. */
export function defaultCommercialDealLayout(): FieldLayout {
  return {
    columns: [
      {
        id: "left",
        sections: [
          section("business", "Business", [
            "business_name",
            "dba",
            "entity_type",
            "ein",
            "years_in_business",
            "naics",
            "operations",
          ]),
          section("owner", "Owner", [
            "first_name",
            "last_name",
            "date_of_birth",
            "phone",
            "email",
            "preferred_contact_method",
          ]),
        ],
      },
      {
        id: "right",
        sections: [
          section("business_operations", "Operations", [
            "annual_sales",
            "employee_count",
            "payroll",
          ]),
          section("insured_address", "Business Address", [
            "mailing_address",
            "mailing_unit",
            "city",
            "state",
            "zip",
            "county",
          ]),
          section("mailing_address", "Mailing Address", [
            "contact_mailing_address",
            "contact_mailing_unit",
            "contact_mailing_city",
            "contact_mailing_state",
            "contact_mailing_zip",
            "contact_mailing_county",
          ]),
        ],
      },
    ],
  };
}

export function isCommercialDealSection(section: { id?: string; label?: string }): boolean {
  const id = (section.id ?? "").trim().toLowerCase();
  const label = (section.label ?? "").trim().toLowerCase();
  if ((COMMERCIAL_DEAL_SECTION_IDS as readonly string[]).includes(id)) return true;
  if (id === "business" || label === "business") return true;
  if (id === "owner" || label === "owner") return true;
  if (id === "business_operations" || label === "operations") return true;
  return false;
}
