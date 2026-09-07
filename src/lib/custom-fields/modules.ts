import { CORE_FIELDS, defaultLayoutForLine } from "./defaults";
import { emptyLayout, type CustomFieldDef, type FieldLayout, type LayoutSection } from "./types";

export const FIELD_LAYOUT_MODULES = [
  "leads",
  "deals",
  "policies",
  "contacts",
  "businesses",
  "carriers",
] as const;

export type FieldLayoutModule = (typeof FIELD_LAYOUT_MODULES)[number];

export const FIELD_LAYOUT_MODULE_LABEL: Record<FieldLayoutModule, string> = {
  leads: "Leads",
  deals: "Deals",
  policies: "Policies",
  contacts: "Contacts",
  businesses: "Business",
  carriers: "Carriers",
};

export const FIELD_LAYOUT_MODULE_LIST_HREF: Record<FieldLayoutModule, string> = {
  leads: "/leads",
  deals: "/deals",
  policies: "/policies",
  contacts: "/contacts",
  businesses: "/accounts",
  carriers: "/carriers",
};

/** Sentinel LOB for modules that share one layout (not per-line deals). */
export const MODULE_LAYOUT_LINE = "ALL";

function section(id: string, label: string, fieldKeys: string[]): LayoutSection {
  return { id, label, fieldKeys };
}

function twoCol(left: LayoutSection[], right: LayoutSection[]): FieldLayout {
  return {
    columns: [
      { id: "left", sections: left },
      { id: "right", sections: right },
    ],
  };
}

const LEAD_FIELDS: CustomFieldDef[] = [
  { key: "first_name", label: "First name", type: "single_line", systemKey: "firstName" },
  { key: "last_name", label: "Last name", type: "single_line", systemKey: "lastName" },
  { key: "email", label: "Email", type: "email", systemKey: "email" },
  { key: "phone", label: "Phone", type: "phone", systemKey: "phone" },
  { key: "source", label: "Source", type: "single_line", systemKey: "source" },
  { key: "notes", label: "Notes", type: "multi_line", systemKey: "notes" },
  { key: "mailing_address", label: "Address", type: "address", systemKey: "mailingAddress" },
  { key: "city", label: "City", type: "single_line", systemKey: "city" },
  { key: "state", label: "State", type: "single_line", systemKey: "state" },
  { key: "zip", label: "ZIP", type: "single_line", systemKey: "zip" },
];

const CONTACT_FIELDS: CustomFieldDef[] = [
  { key: "first_name", label: "First name", type: "single_line", systemKey: "firstName" },
  { key: "last_name", label: "Last name", type: "single_line", systemKey: "lastName" },
  { key: "email", label: "Email", type: "email", systemKey: "email" },
  { key: "phone", label: "Phone", type: "phone", systemKey: "phone" },
  { key: "mailing_address", label: "Address", type: "address", systemKey: "mailingAddress" },
  { key: "city", label: "City", type: "single_line", systemKey: "city" },
  { key: "state", label: "State", type: "single_line", systemKey: "state" },
  { key: "zip", label: "ZIP", type: "single_line", systemKey: "zip" },
];

const POLICY_FIELDS: CustomFieldDef[] = [
  { key: "policy_number", label: "Policy number", type: "single_line", systemKey: "policyNumber" },
  { key: "status", label: "Status", type: "single_line", systemKey: "status" },
  { key: "premium", label: "Premium", type: "currency", systemKey: "premium" },
  { key: "effective_date", label: "Effective", type: "date", systemKey: "effectiveDate" },
  { key: "expiration_date", label: "Expiration", type: "date", systemKey: "expirationDate" },
  { key: "carrier", label: "Carrier", type: "lookup", lookupModule: "carriers" },
];

const BUSINESS_FIELDS: CustomFieldDef[] = [
  { key: "business_name", label: "Business name", type: "single_line", systemKey: "name" },
  { key: "phone", label: "Phone", type: "phone", systemKey: "phone" },
  { key: "email", label: "Email", type: "email", systemKey: "email" },
  { key: "mailing_address", label: "Address", type: "address", systemKey: "mailingAddress" },
  { key: "city", label: "City", type: "single_line", systemKey: "city" },
  { key: "state", label: "State", type: "single_line", systemKey: "state" },
];

const CARRIER_FIELDS: CustomFieldDef[] = [
  { key: "name", label: "Carrier name", type: "single_line", systemKey: "name" },
  { key: "naic", label: "NAIC", type: "single_line", systemKey: "naic" },
  { key: "phone", label: "Phone", type: "phone", systemKey: "phone" },
  { key: "email", label: "Email", type: "email", systemKey: "email" },
  { key: "territory", label: "Territory", type: "single_line", systemKey: "territory" },
];

export function isFieldLayoutModule(value: string | null | undefined): value is FieldLayoutModule {
  return Boolean(value && (FIELD_LAYOUT_MODULES as readonly string[]).includes(value));
}

export function parseLayoutModule(value: string | null | undefined): FieldLayoutModule {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (raw === "accounts" || raw === "business" || raw === "account") return "businesses";
  if (isFieldLayoutModule(raw)) return raw;
  return "deals";
}

export function fieldLayoutModuleLabel(module: FieldLayoutModule): string {
  return FIELD_LAYOUT_MODULE_LABEL[module];
}

export function fieldLayoutListHref(module: FieldLayoutModule): string {
  return FIELD_LAYOUT_MODULE_LIST_HREF[module];
}

export function fieldBuilderHref(module: FieldLayoutModule, line?: string): string {
  const params = new URLSearchParams({ module });
  if (module === "deals" && line) params.set("line", line);
  return `/settings/field-builder?${params.toString()}`;
}

export function defaultFieldsForModule(module: FieldLayoutModule): CustomFieldDef[] {
  if (module === "deals") return CORE_FIELDS;
  if (module === "leads") return LEAD_FIELDS;
  if (module === "contacts") return CONTACT_FIELDS;
  if (module === "policies") return POLICY_FIELDS;
  if (module === "businesses") return BUSINESS_FIELDS;
  return CARRIER_FIELDS;
}

export function defaultLayoutForModule(module: FieldLayoutModule): FieldLayout {
  if (module === "deals") return defaultLayoutForLine("HO");
  if (module === "leads") {
    return twoCol(
      [section("contact", "Contact", ["first_name", "last_name", "email", "phone"])],
      [section("details", "Details", ["source", "notes"])],
    );
  }
  if (module === "contacts") {
    return twoCol(
      [section("contact", "Contact", ["first_name", "last_name", "email", "phone"])],
      [section("address", "Address", ["mailing_address", "city", "state", "zip"])],
    );
  }
  if (module === "policies") {
    return twoCol(
      [section("policy", "Policy", ["policy_number", "status", "premium"])],
      [section("term", "Term", ["effective_date", "expiration_date", "carrier"])],
    );
  }
  if (module === "businesses") {
    return twoCol(
      [section("business", "Business", ["business_name", "phone", "email"])],
      [section("location", "Location", ["mailing_address", "city", "state"])],
    );
  }
  if (module === "carriers") {
    return twoCol(
      [section("identity", "Identity", ["name", "naic", "territory"])],
      [section("contact", "Contact", ["phone", "email"])],
    );
  }
  return emptyLayout();
}
