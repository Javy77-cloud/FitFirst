import { BUSINESS_INDUSTRY_OPTIONS } from "@/lib/businesses/entity-industry";
import { sourceFilterOptions } from "@/lib/crm/sources";
import { CLIENT_STATUSES, LINES } from "@/lib/domain";
import { commercialLineMenuOptions, ERRORS_OMISSIONS_LONG } from "@/lib/policy/eo";
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
    commercialLineMenuOptions(LINES, (value) => value).map((row) => ({
      ...option(row.value, row.label),
      title: row.title,
    })),
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
  { ...option("EO", "E&O"), title: ERRORS_OMISSIONS_LONG },
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


const DEALS_PIPELINE_DEFAULTS: PageFilter[] = [
  filter("deals-pipeline-stage", "Stage", "stage", []),
  filter("deals-pipeline-line", "Line", "line", []),
  filter("deals-pipeline-subType", "Subtype", "subType", []),
  filter("deals-pipeline-source", "Source", "source", []),
  filter("deals-pipeline-assigned", "Assigned", "assigned", []),
  filter("deals-pipeline-tags", "Tags", "tags", []),
  filter("deals-pipeline-carrier", "Carrier", "carrier", []),
];

const RENEWALS_PIPELINE_DEFAULTS: PageFilter[] = [
  filter("renewals-pipeline-stage", "Stage", "stage", []),
  filter("renewals-pipeline-line", "Line", "line", []),
  filter("renewals-pipeline-carrier", "Carrier", "carrier", []),
  filter("renewals-pipeline-subType", "Policy Subtype", "subType", []),
  filter("renewals-pipeline-daysBand", "Days Band", "daysBand", [
    option("overdue", "Overdue"),
    option("0-30", "0–30 Days"),
    option("31-60", "31–60 Days"),
    option("61-90", "61–90 Days"),
    option("91-180", "91–180 Days"),
  ]),
];


const TASKS_DEFAULTS: PageFilter[] = [
  filter("tasks-status", "Status", "status", [
    option("open", "Open"),
    option("done", "Done"),
    option("completed", "Completed"),
  ]),
  filter("tasks-kind", "Task Type", "kind", []),
  filter("tasks-due", "Due", "due", [
    option("overdue", "Overdue", "#BF0A30"),
    option("today", "Today", "#EAB308"),
    option("this_week", "This Week", "#F97316"),
    option("later", "Later", "#64748B"),
  ]),
  filter("tasks-assignee", "Assignee", "assignee", []),
  filter("tasks-priority", "Priority", "priority", [
    option("none", "None"),
    option("low", "Low"),
    option("normal", "Normal"),
    option("high", "High"),
  ]),
  filter("tasks-tags", "Tags", "tags", []),
];

const DEFAULTS: Record<PageFilterModule, PageFilter[]> = {
  contacts: CONTACTS_DEFAULTS,
  businesses: BUSINESSES_DEFAULTS,
  policies: POLICIES_DEFAULTS,
  carriers: CARRIERS_DEFAULTS,
  "deals-pipeline": DEALS_PIPELINE_DEFAULTS,
  "renewals-pipeline": RENEWALS_PIPELINE_DEFAULTS,
  tasks: TASKS_DEFAULTS,
};

export function defaultPageFilters(module: PageFilterModule): PageFilter[] {
  return DEFAULTS[module].map((row) => ({
    ...row,
    options: row.options.map((option) => ({ ...option })),
  }));
}
