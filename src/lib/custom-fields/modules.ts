import { CORE_FIELDS, defaultLayoutForLine } from "./defaults";
import { APPLICANT_CRM_FIELDS, applicantLayoutSection } from "./applicant-fields";
import {
  LEAD_INSURANCE_DESIRE_OPTIONS,
  LEAD_INSURANCE_SUBTYPE_OPTIONS,
  LEAD_INSURANCE_TYPE_OPTIONS,
  LEAD_INSURANCE_CATEGORY_OPTIONS,
  LEAD_LANGUAGE_OPTIONS,
  LEAD_PIPELINE_OPTIONS,
  LEAD_CADENCE_OPTIONS,
  LEAD_STATUS_OPTIONS,
  LEAD_TEMPERATURE_OPTIONS,
} from "./lead-picklist-options";
import { LEAD_SOURCES } from "@/lib/crm/sources";
import {
  BUSINESS_ENTITY_TYPE_OPTIONS,
  BUSINESS_INDUSTRY_OPTIONS,
} from "@/lib/businesses/entity-industry";
import { emptyLayout, type CustomFieldDef, type FieldLayout, type LayoutSection } from "./types";
import {
  CONTACT_MODULE_FIELDS,
  contactCardLayout,
} from "@/lib/contacts/contact-field-catalog";

export const FIELD_LAYOUT_MODULES = [
  "leads",
  "deals",
  "policies",
  "contacts",
  "businesses",
  "carriers",
  "tasks",
] as const;

export type FieldLayoutModule = (typeof FIELD_LAYOUT_MODULES)[number];

export const FIELD_LAYOUT_MODULE_LABEL: Record<FieldLayoutModule, string> = {
  leads: "Leads",
  deals: "Deals",
  policies: "Policies",
  contacts: "Contacts",
  businesses: "Accounts",
  carriers: "Carriers",
  tasks: "Tasks",
};

export const FIELD_LAYOUT_MODULE_LIST_HREF: Record<FieldLayoutModule, string> = {
  leads: "/leads",
  deals: "/deals",
  policies: "/policies",
  contacts: "/contacts",
  businesses: "/accounts",
  carriers: "/carriers",
  tasks: "/tasks",
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
  { key: "middle_name", label: "Middle name", type: "single_line", systemKey: "middleName" },
  { key: "last_name", label: "Last name", type: "single_line", systemKey: "lastName" },
  { key: "email", label: "Email", type: "email", systemKey: "email" },
  { key: "phone", label: "Phone", type: "phone", systemKey: "phone" },
  { key: "source", label: "Source", type: "picklist", options: [...LEAD_SOURCES], systemKey: "source" },
  { key: "status", label: "Status", type: "picklist", options: [...LEAD_STATUS_OPTIONS], systemKey: "status" },
  { key: "cadence", label: "Cadence", type: "picklist", options: [...LEAD_CADENCE_OPTIONS], systemKey: "cadence" },
  { key: "temperature", label: "Temperature", type: "picklist", options: [...LEAD_TEMPERATURE_OPTIONS], systemKey: "temperature" },
  { key: "notes", label: "Notes", type: "multi_line", systemKey: "notes" },
  { key: "mailing_address", label: "Insured Address", type: "address", systemKey: "mailingAddress" },
  { key: "contact_mailing_address", label: "Mailing Address", type: "address" },
  { key: "city", label: "City", type: "single_line", systemKey: "city" },
  { key: "state", label: "State", type: "single_line", systemKey: "state" },
  { key: "zip", label: "ZIP", type: "single_line", systemKey: "zip" },
  { key: "date_of_birth", label: "DOB", type: "dob", systemKey: "dateOfBirth" },
  {
    key: "pipeline",
    label: "Pipeline",
    type: "picklist",
    options: [...LEAD_PIPELINE_OPTIONS],
  },
  {
    key: "insurance_type",
    label: "Pipeline",
    type: "picklist",
    options: [...LEAD_INSURANCE_TYPE_OPTIONS],
    required: true,
  },
  {
    key: "insurance_category",
    label: "Insurance type",
    type: "picklist",
    options: [...LEAD_INSURANCE_CATEGORY_OPTIONS],
    required: true,
  },
  {
    key: "insurance_subtype",
    label: "Policy form",
    type: "picklist",
    options: [...LEAD_INSURANCE_SUBTYPE_OPTIONS],
    required: true,
  },
  {
    key: "picklist_yp0c",
    label: "Selling agency",
    type: "picklist",
    options: [],
    required: true,
    globalListKey: "selling_agency",
  },
  {
    key: "insurance_type_desired",
    label: "Insurance desired",
    type: "picklist",
    options: [...LEAD_INSURANCE_DESIRE_OPTIONS],
    systemKey: "insuranceTypeDesired",
  },
  {
    key: "preferred_language",
    label: "Language",
    type: "picklist",
    options: [...LEAD_LANGUAGE_OPTIONS],
    systemKey: "preferredLanguage",
  },
  ...APPLICANT_CRM_FIELDS,
];

const POLICY_FIELDS: CustomFieldDef[] = [
  { key: "policy_number", label: "Policy number", type: "single_line", systemKey: "policyNumber" },
  { key: "status", label: "Status", type: "single_line", systemKey: "status" },
  { key: "premium", label: "Premium", type: "currency", systemKey: "premium" },
  { key: "effective_date", label: "Effective", type: "date", systemKey: "effectiveDate" },
  { key: "expiration_date", label: "Expiration", type: "date", systemKey: "expirationDate" },
  { key: "renewal_date", label: "Renewal", type: "date", systemKey: "renewalDate" },
  { key: "line_of_business", label: "Line", type: "single_line", systemKey: "lineOfBusiness" },
  { key: "policy_sub_type", label: "Policy subtype", type: "single_line", systemKey: "policySubType" },
  { key: "form_type", label: "Form type", type: "single_line", systemKey: "formType" },
  { key: "coverage_a", label: "Coverage A", type: "currency", systemKey: "coverageA" },
  { key: "selling_agency", label: "Selling agency", type: "single_line", systemKey: "sellingAgency" },
  { key: "billing_frequency", label: "Billing frequency", type: "single_line", systemKey: "billingFrequency" },
  { key: "carrier", label: "Carrier", type: "lookup", lookupModule: "carriers" },
];

const BUSINESS_FIELDS: CustomFieldDef[] = [
  { key: "business_name", label: "Account Name", type: "single_line", systemKey: "name" },
  { key: "dba", label: "DBA", type: "single_line", systemKey: "dba" },
  { key: "legal_name", label: "Legal Name", type: "single_line", systemKey: "legalName" },
  { key: "phone", label: "Phone", type: "phone", systemKey: "phone" },
  { key: "email", label: "Email", type: "email", systemKey: "email" },
  { key: "website", label: "Website", type: "single_line", systemKey: "website" },
  { key: "mailing_address", label: "Address", type: "address", systemKey: "mailingAddress" },
  { key: "city", label: "City", type: "single_line", systemKey: "city" },
  { key: "state", label: "State", type: "single_line", systemKey: "state" },
  { key: "zip", label: "ZIP", type: "single_line", systemKey: "zip" },
  { key: "ein", label: "EIN", type: "single_line", systemKey: "ein" },
  {
    key: "entity_type",
    label: "Business Type",
    type: "picklist",
    options: [...BUSINESS_ENTITY_TYPE_OPTIONS],
    systemKey: "entityType",
  },
  {
    key: "industry",
    label: "Industry",
    type: "picklist",
    options: [...BUSINESS_INDUSTRY_OPTIONS],
    systemKey: "industry",
  },
  { key: "source", label: "Source", type: "picklist", options: [...LEAD_SOURCES], systemKey: "source" },
  { key: "referral", label: "Referral", type: "single_line", systemKey: "referral" },
  { key: "employee_count", label: "Employees", type: "number", systemKey: "employeeCount" },
  { key: "annual_sales", label: "Annual Sales", type: "currency", systemKey: "annualSales" },
  { key: "payroll_w2", label: "W-2 Payroll", type: "currency", systemKey: "payrollW2" },
  { key: "payroll_1099", label: "1099 Payroll", type: "currency", systemKey: "payroll1099" },
  { key: "years_in_business", label: "Years In Business", type: "number", systemKey: "yearsInBusiness" },
  { key: "naics", label: "NAICS", type: "single_line", systemKey: "naics" },
  { key: "operations", label: "Operations", type: "multi_line", systemKey: "operationsDescription" },
  { key: "life_notes", label: "Life Notes (CRM Only)", type: "multi_line", systemKey: "lifeNotes" },
  { key: "health_notes", label: "Health Notes (CRM Only)", type: "multi_line", systemKey: "healthNotes" },
  { key: "pc_notes", label: "P&C Notes (CRM Only)", type: "multi_line", systemKey: "pcNotes" },
  { key: "notes", label: "Notes", type: "multi_line", systemKey: "notes" },
];

const CARRIER_FIELDS: CustomFieldDef[] = [
  { key: "name", label: "Carrier name", type: "single_line", systemKey: "name", required: true },
  { key: "phone", label: "Phone", type: "phone", systemKey: "phone" },
  { key: "email", label: "Email", type: "email", systemKey: "email" },
  { key: "mailing_address", label: "Mailing address", type: "single_line", systemKey: "mailingAddress" },
  { key: "am_best_outlook", label: "AM Best outlook", type: "single_line", systemKey: "amBestOutlook" },
  { key: "marketing_contact_name", label: "Marketing contact", type: "single_line", systemKey: "marketingContactName" },
  { key: "naic", label: "NAIC", type: "single_line", systemKey: "naic" },
  { key: "am_best_rating", label: "AM Best", type: "single_line", systemKey: "amBestRating" },
  { key: "territory", label: "Territory", type: "single_line", systemKey: "territory" },
  { key: "written_lines", label: "Written lines", type: "single_line", systemKey: "writtenLines" },
  { key: "preferred_submission", label: "Preferred submission", type: "single_line", systemKey: "preferredSubmission" },
  { key: "binding_authority", label: "Binding authority", type: "single_line", systemKey: "bindingAuthority" },
  { key: "appetite_notes", label: "Appetite notes", type: "multi_line", systemKey: "appetiteNotes" },
  { key: "dont_write_notes", label: "Don't write", type: "multi_line", systemKey: "dontWriteNotes" },
  { key: "new_business_comm_pct", label: "New business %", type: "single_line", systemKey: "newBusinessCommPct" },
  { key: "renewal_comm_pct", label: "Renewal %", type: "single_line", systemKey: "renewalCommPct" },
  { key: "underwriter_name", label: "Underwriter", type: "single_line", systemKey: "underwriterName" },
  { key: "underwriter_email", label: "UW email", type: "email", systemKey: "underwriterEmail" },
  { key: "underwriter_phone", label: "UW phone", type: "phone", systemKey: "underwriterPhone" },
  { key: "account_manager_name", label: "Account manager", type: "single_line", systemKey: "accountManagerName" },
  { key: "account_manager_email", label: "AM email", type: "email", systemKey: "accountManagerEmail" },
  { key: "account_manager_phone", label: "AM phone", type: "phone", systemKey: "accountManagerPhone" },
  { key: "customer_service_phone", label: "Customer service", type: "phone", systemKey: "customerServicePhone" },
  { key: "agent_phone", label: "Agent phone", type: "phone", systemKey: "agentPhone" },
  { key: "claims_phone", label: "Claims", type: "phone", systemKey: "claimsPhone" },
  { key: "billing_phone", label: "Billing", type: "phone", systemKey: "billingPhone" },
  { key: "portal_url", label: "Portal URL", type: "single_line", systemKey: "portalUrl" },
  { key: "agency_code", label: "Agency code", type: "single_line", systemKey: "agencyCode" },
  { key: "portal_login", label: "Portal name", type: "single_line", systemKey: "portalLogin" },
  { key: "website", label: "Website", type: "single_line", systemKey: "website" },
  { key: "agent_portal_url", label: "Agent portal", type: "single_line", systemKey: "agentPortalUrl" },
  { key: "carrier_info", label: "Carrier info", type: "multi_line", systemKey: "carrierInfo" },
  { key: "portal_status", label: "Portal status", type: "single_line", systemKey: "portalStatus" },
];

const TASK_FIELDS: CustomFieldDef[] = [
  { key: "title", label: "Title", type: "single_line", systemKey: "title" },
  { key: "task_type", label: "Task type", type: "picklist", systemKey: "kind" },
  { key: "due_date", label: "Due date", type: "date", systemKey: "dueDate" },
  { key: "status", label: "Status", type: "picklist", options: ["open", "done"], systemKey: "status" },
  { key: "priority", label: "Priority", type: "picklist", options: ["none", "low", "normal", "high"] },
  { key: "tags", label: "Tags", type: "multi_line" },
  { key: "assignee", label: "Assignee", type: "single_line", systemKey: "assigneeId" },
  { key: "linked_record", label: "Linked record", type: "single_line" },
  { key: "record_type", label: "Record type", type: "picklist" },
  { key: "notes", label: "Notes", type: "multi_line" },
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
  // Nav/UI fallback only — mutations must use requireLayoutModule so a blank
  // module never silently rewrites Deals.
  return "deals";
}

/** Hard fail for Save/delete/upsert — never guess "deals". */
export function requireLayoutModule(value: string | null | undefined): FieldLayoutModule {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (raw === "accounts" || raw === "business" || raw === "account") return "businesses";
  if (isFieldLayoutModule(raw)) return raw;
  throw new Error("Layout module is required (leads, deals, policies, contacts, businesses, carriers, or tasks).");
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
  if (module === "contacts") return CONTACT_MODULE_FIELDS;
  if (module === "policies") return POLICY_FIELDS;
  if (module === "businesses") return BUSINESS_FIELDS;
  if (module === "tasks") return TASK_FIELDS;
  return CARRIER_FIELDS;
}

export function defaultLayoutForModule(module: FieldLayoutModule): FieldLayout {
  if (module === "tasks") {
    return twoCol(
      [
        section("task", "Task", ["title", "task_type", "due_date", "status", "priority"]),
        section("link", "Linked record", ["linked_record", "record_type", "assignee"]),
      ],
      [section("extra", "Extra", ["tags", "notes"])],
    );
  }
  if (module === "deals") return defaultLayoutForLine("HO");
  if (module === "leads") {
    return twoCol(
      [
        section("contact", "Contact", ["entity_type", "first_name", "middle_name", "last_name", "email", "phone", "date_of_birth", "epolicy"]),
        applicantLayoutSection(),
        section("insured_address", "Insured Address", ["mailing_address", "city", "state", "zip"]),
        section("mailing_address", "Mailing Address", ["contact_mailing_address", "contact_mailing_city", "contact_mailing_state", "contact_mailing_zip"]),
      ],
      [
        section("details", "Details", [
          "source",
          "cadence",
          "status",
          "temperature",
          "pipeline",
          "insurance_type",
          "insurance_category",
          "insurance_subtype",
          "picklist_yp0c",
          "preferred_language",
          "notes",
        ]),
      ],
    );
  }
  if (module === "contacts") {
    return contactCardLayout();
  }
  if (module === "policies") {
    return twoCol(
      [section("policy", "Policy", ["policy_number", "status", "line_of_business", "policy_sub_type", "form_type", "premium", "coverage_a"])],
      [section("term", "Term", ["effective_date", "expiration_date", "renewal_date", "selling_agency", "billing_frequency", "carrier"])],
    );
  }
  if (module === "businesses") {
    // Even left|right like Contacts. Keep Account Name on left; Phone (and
    // email/website) on right so name + phone are not stacked in one column.
    return twoCol(
      [
        section("business", "Account", [
          "business_name",
          "dba",
          "legal_name",
          "ein",
          "entity_type",
          "industry",
        ]),
        section("location", "Location", ["mailing_address", "city", "state", "zip"]),
        section("crm_notes", "CRM Notes", ["life_notes", "health_notes", "pc_notes", "notes"]),
      ],
      [
        section("contact", "Contact", ["phone", "email", "website"]),
        section("intake", "Intake", ["source", "referral"]),
        section("operations", "Operations", [
          "employee_count",
          "annual_sales",
          "payroll_w2",
          "payroll_1099",
          "years_in_business",
          "naics",
          "operations",
        ]),
      ],
    );
  }
  if (module === "carriers") {
    return twoCol(
      [
        section("identity", "Identity", [
          "name", "naic", "am_best_rating", "territory", "written_lines",
          "preferred_submission", "binding_authority", "appetite_notes", "dont_write_notes",
        ]),
        section("commission", "Commission", ["new_business_comm_pct", "renewal_comm_pct"]),
      ],
      [
        section("contacts", "Contacts", [
          "underwriter_name", "underwriter_email", "underwriter_phone",
          "account_manager_name", "account_manager_email", "account_manager_phone",
          "customer_service_phone", "agent_phone", "claims_phone", "billing_phone",
        ]),
        section("portal", "Portal", [
          "portal_url", "agency_code", "portal_login", "website", "agent_portal_url", "portal_status", "carrier_info",
        ]),
      ],
    );
  }
  return emptyLayout();
}

/** Business Card (Two column) — stock even left|right layout. */
export function businessCardLayout(): FieldLayout {
  return defaultLayoutForModule("businesses");
}

/**
 * Business Classic (Dense) — one column for narrower monitors.
 * Stacks every section into the left column; empty right → record form one-col.
 */
export function businessClassicLayout(): FieldLayout {
  const card = businessCardLayout();
  return twoCol([...card.columns[0].sections, ...card.columns[1].sections], []);
}

