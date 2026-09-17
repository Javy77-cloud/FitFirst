import { CONTACT_METHOD_OPTIONS } from "@/lib/contacts/contact-field-catalog";
import type { CustomFieldDef, FieldLayout, LayoutSection } from "./types";

/** Spec entity types for Commercial Deal Details (not personal Individual/Joint). */
export const COMMERCIAL_ENTITY_TYPE_OPTIONS = [
  "Sole prop",
  "LLC",
  "Corp",
  "Partnership",
  "Nonprofit",
] as const;

export const BUSINESS_IDENTITY_FIELD_KEYS = [
  "business_name",
  "dba",
  "entity_type",
  "fein",
  "years_in_business",
  "naics",
  "business_description",
  "annual_revenue",
  "employee_count",
  "payroll",
  "owner_name",
  "owner_dob",
  "owner_phone",
  "owner_email",
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
  field("fein", "FEIN"),
  field("years_in_business", "Years in business", "number"),
  field("naics", "NAICS code"),
  field("business_description", "Business description", "multi_line"),
  field("annual_revenue", "Annual revenue", "currency"),
  field("employee_count", "Number of employees", "number"),
  field("payroll", "Payroll", "currency"),
  field("owner_name", "Owner name"),
  field("owner_dob", "Owner date of birth", "dob"),
  field("owner_phone", "Owner phone", "phone"),
  field("owner_email", "Owner email", "email"),
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
            "fein",
            "years_in_business",
            "naics",
            "business_description",
          ]),
          section("owner", "Owner", [
            "owner_name",
            "owner_dob",
            "owner_phone",
            "owner_email",
            "preferred_contact_method",
          ]),
        ],
      },
      {
        id: "right",
        sections: [
          section("business_operations", "Operations", [
            "annual_revenue",
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
