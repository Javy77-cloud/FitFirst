import { BUSINESS_INDUSTRY_OPTIONS } from "@/lib/businesses/entity-industry";
import { sourceFilterOptions } from "@/lib/crm/sources";
import { CLIENT_STATUSES, LINES } from "@/lib/domain";
import { titleCaseLabel } from "@/lib/ui/title-case";
import type { PageFilter, PageFilterModule, PageFilterOption } from "./types";

function option(value: string, label: string, color?: string | null): PageFilterOption {
  return { value, label: titleCaseLabel(label), color: color ?? null };
}

function filter(
  id: string,
  label: string,
  fieldKey: string,
  options: PageFilterOption[],
): PageFilter {
  return {
    id,
    label: titleCaseLabel(label),
    fieldKey,
    enabled: true,
    options,
  };
}

const CONTACTS_DEFAULTS: PageFilter[] = [
  filter(
    "contacts-status",
    "Status",
    "status",
    CLIENT_STATUSES.map((value) =>
      option(
        value,
        value === "client" ? "Client" : value === "not_a_client" ? "Not A Client" : "Former Client",
      ),
    ),
  ),
  filter(
    "contacts-source",
    "Source",
    "source",
    sourceFilterOptions().map((row) => option(row.value, row.label)),
  ),
];

const BUSINESSES_DEFAULTS: PageFilter[] = [
  filter(
    "businesses-status",
    "Status",
    "status",
    CLIENT_STATUSES.map((value) =>
      option(
        value,
        value === "client" ? "Client" : value === "not_a_client" ? "Not A Client" : "Former Client",
      ),
    ),
  ),
  filter(
    "businesses-industry",
    "Industry",
    "industry",
    BUSINESS_INDUSTRY_OPTIONS.map((value) => option(value, value)),
  ),
];

const POLICIES_DEFAULTS: PageFilter[] = [
  filter("policies-status", "Status", "status", [
    option("in_force", "In Force"),
    option("active", "Active"),
    option("bound", "Bound"),
    option("pending", "Pending"),
    option("lapsed", "Lapsed"),
  ]),
  filter(
    "policies-line",
    "Policy Type",
    "line",
    LINES.map((value) => option(value, value)),
  ),
  filter("policies-written", "Written", "written", [
    option("this_month", "This Month"),
    option("last_month", "Last Month"),
  ]),
  filter("policies-renewal", "Renewal", "renewal", [
    option("30", "30 Days", "#EAB308"),
    option("60", "60 Days", "#F97316"),
    option("90", "90 Days", "#BF0A30"),
  ]),
  filter("policies-attention", "Attention", "attention", [
    option("lapse", "Lapse", "#BF0A30"),
  ]),
];

const CARRIER_LOB: PageFilterOption[] = [
  option("HO", "Homeowners"),
  option("AUTO", "Auto"),
  option("FLOOD", "Flood"),
  option("LIFE", "Life"),
  option("BOP", "BOP"),
  option("GL", "GL"),
  option("WC", "WC"),
  option("RV", "RV"),
  option("UMBRELLA", "Umbrella"),
  option("HEALTH", "Health"),
  option("DP", "DP"),
];

const CARRIERS_DEFAULTS: PageFilter[] = [
  filter("carriers-status", "Status", "status", [
    option("Active", "Active", "#15803D"),
    option("Pending", "Pending", "#EAB308"),
    option("Inactive", "Inactive", "#64748B"),
  ]),
  filter("carriers-line", "LOB", "line", CARRIER_LOB),
  filter("carriers-business", "Book", "business", [
    option("active", "Has Active Business"),
    option("directory", "Directory Only"),
  ]),
  filter("carriers-portal", "Portal", "portal", [
    option("connected", "Connected", "#15803D"),
    option("missing", "Missing Credentials", "#EAB308"),
    option("none", "No Portal Linked"),
  ]),
];

const DEFAULTS: Record<PageFilterModule, PageFilter[]> = {
  contacts: CONTACTS_DEFAULTS,
  businesses: BUSINESSES_DEFAULTS,
  policies: POLICIES_DEFAULTS,
  carriers: CARRIERS_DEFAULTS,
};

export function defaultPageFilters(module: PageFilterModule): PageFilter[] {
  return DEFAULTS[module].map((row) => ({
    ...row,
    options: row.options.map((option) => ({ ...option })),
  }));
}
