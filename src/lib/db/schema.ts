import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/** Consumed from Quote Sheet ingest — do not invent a second sheet shape. */
export type QuoteSheetFieldValue = {
  value: string;
  status: "missing" | "check" | "confirmed";
  source: "blank" | "agent" | "extracted" | "seed" | "javy";
};

/** Renewal compare coverage row. Stored on policy_terms.coverages. */
export type PolicyCoverageLine = {
  key: string;
  label: string;
  value: string;
};

export type CoverageLimits = {
  eachOccurrence?: string;
  damageToRented?: string;
  medicalExpense?: string;
  personalAdvertising?: string;
  generalAggregate?: string;
  productsCompletedOps?: string;
  wcStatutory?: string;
  elEachAccident?: string;
  elDiseaseEachEmployee?: string;
  elDiseasePolicyLimit?: string;
};

export type CertificateLine = {
  policyId: string;
  lineOfBusiness: string;
  lineLabel: string;
  policyNumber: string;
  carrierName: string;
  status: string;
  effectiveDate: string;
  expirationDate: string;
  limits: { key: string; label: string; value: string }[];
};

export type RenewalCompareSnapshot = {
  currentPremium: string;
  proposedPremium: string;
  premiumDelta: string;
  premiumDeltaPct: string | null;
  currentDeductibles: Record<string, string | null>;
  proposedDeductibles: Record<string, string | null>;
  coverageRows: {
    key: string;
    label: string;
    currentValue: string;
    proposedValue: string;
    changed: boolean;
  }[];
};

const tenantCol = () =>
  uuid("tenant_id")
    .notNull()
    .references(() => tenants.id);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    source: text("source"),
    status: text("status").notNull().default("new"),
    notes: text("notes"),
    convertedDealId: uuid("converted_deal_id"),
    mailingAddress: text("mailing_address"),
    city: text("city"),
    state: text("state"),
    zip: text("zip"),
    dateOfBirth: text("date_of_birth"),
    mergedIntoId: uuid("merged_into_id"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ownerId: uuid("owner_id"),
    ...timestamps,
  },
  (t) => [index("leads_tenant_idx").on(t.tenantId)],
);

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    mailingAddress: text("mailing_address"),
    city: text("city"),
    state: text("state"),
    zip: text("zip"),
    tenureStart: timestamp("tenure_start", { withTimezone: true }),
    policyCount: integer("policy_count").notNull().default(0),
    activePolicyCount: integer("active_policy_count").notNull().default(0),
    notes: text("notes"),
    lifeNotes: text("life_notes"),
    healthNotes: text("health_notes"),
    dateOfBirth: text("date_of_birth"),
    language: text("language"),
    maritalStatus: text("marital_status"),
    clientStatus: text("client_status"),
    lifetimePolicyCount: integer("lifetime_policy_count").notNull().default(0),
    accountId: uuid("account_id"),
    zohoId: text("zoho_id"),
    sourceId: text("source_id"),
    status: text("status").notNull().default("active"),
    mergedIntoId: uuid("merged_into_id"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ownerId: uuid("owner_id"),
    ...timestamps,
  },
  (t) => [index("contacts_tenant_idx").on(t.tenantId)],
);

export const deals = pgTable(
  "deals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    leadId: uuid("lead_id").references(() => leads.id),
    contactId: uuid("contact_id").references(() => contacts.id),
    accountId: uuid("account_id"),
    title: text("title").notNull(),
    pipelineStage: text("pipeline_stage").notNull().default("shopping"),
    lineOfBusiness: text("line_of_business").notNull().default("HO"),
    bindTarget: text("bind_target").notNull().default("contact"),
    state: text("state").notNull().default("FL"),
    notes: text("notes"),
    quoteResultsNote: text("quote_results_note"),
    primaryNamedInsured: text("primary_named_insured"),
    secondaryNamedInsured: text("secondary_named_insured"),
    boundAt: timestamp("bound_at", { withTimezone: true }),
    pipelineId: uuid("pipeline_id"),
    pipelineStageSlug: text("pipeline_stage_slug"),
    wonAt: timestamp("won_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    archiveScheduledAt: timestamp("archive_scheduled_at", { withTimezone: true }),
    ownerId: uuid("owner_id"),
    shopLines: jsonb("shop_lines").$type<string[] | null>(),
    coverageAmount: integer("coverage_amount"),
    propertyOneliner: text("property_oneliner"),
    currentCarrier: text("current_carrier"),
    ...timestamps,
  },
  (t) => [
    index("deals_tenant_idx").on(t.tenantId),
    index("deals_stage_idx").on(t.tenantId, t.pipelineStage),
  ],
);

export const carriers = pgTable(
  "carriers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    name: text("name").notNull(),
    naic: text("naic"),
    writtenLines: jsonb("written_lines").$type<string[]>().notNull().default([]),
    dontWriteNotes: text("dont_write_notes"),
    portalStatus: text("portal_status").notNull().default("open"),
    portalUrl: text("portal_url"),
    customerServicePhone: text("customer_service_phone"),
    agentPhone: text("agent_phone"),
    website: text("website"),
    carrierInfo: text("carrier_info"),
    active: boolean("active").notNull().default(true),
    fixtureTag: text("fixture_tag"),
    ...timestamps,
  },
  (t) => [index("carriers_tenant_idx").on(t.tenantId)],
);

export const risks = pgTable(
  "risks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id),
    contactId: uuid("contact_id").references(() => contacts.id),
    riskType: text("risk_type").notNull().default("property"),
    address1: text("address1"),
    city: text("city"),
    county: text("county"),
    state: text("state").default("FL"),
    zip: text("zip"),
    yearBuilt: integer("year_built"),
    construction: text("construction"),
    occupancy: text("occupancy"),
    stories: integer("stories"),
    squareFeet: integer("square_feet"),
    coverageA: integer("coverage_a"),
    roofYear: integer("roof_year"),
    roofCovering: text("roof_covering"),
    openingProtection: text("opening_protection"),
    pool: boolean("pool"),
    protectionClass: text("protection_class"),
    milesToCoast: real("miles_to_coast"),
    mobileHome: boolean("mobile_home").notNull().default(false),
    replacementCostEstimate: integer("replacement_cost_estimate"),
    vin: text("vin"),
    vehicleYear: integer("vehicle_year"),
    vehicleMake: text("vehicle_make"),
    vehicleModel: text("vehicle_model"),
    vehicleUsage: text("vehicle_usage"),
    garagingZip: text("garaging_zip"),
    ...timestamps,
  },
  (t) => [
    index("risks_tenant_idx").on(t.tenantId),
    index("risks_deal_idx").on(t.tenantId, t.dealId),
  ],
);

export const policies = pgTable(
  "policies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    contactId: uuid("contact_id").references(() => contacts.id),
    accountId: uuid("account_id"),
    dealId: uuid("deal_id").references(() => deals.id),
    riskId: uuid("risk_id").references(() => risks.id),
    carrierId: uuid("carrier_id").references(() => carriers.id),
    policyNumber: text("policy_number").notNull(),
    lineOfBusiness: text("line_of_business").notNull(),
    status: text("status").notNull().default("active"),
    effectiveDate: timestamp("effective_date", { withTimezone: true }).notNull(),
    expirationDate: timestamp("expiration_date", { withTimezone: true }).notNull(),
    premium: numeric("premium", { precision: 12, scale: 2 }),
    coverageA: integer("coverage_a"),
    formType: text("form_type"),
    originalEffectiveDate: timestamp("original_effective_date", { withTimezone: true }),
    billingFrequency: text("billing_frequency"),
    renewalDate: timestamp("renewal_date", { withTimezone: true }),
    commissionFamily: text("commission_family"),
    sellingAgency: text("selling_agency"),
    policySubType: text("policy_sub_type"),
    insuredCount: integer("insured_count"),
    commission4Pct: numeric("commission4_pct", { precision: 6, scale: 3 }),
    oepStart: timestamp("oep_start", { withTimezone: true }),
    termMonths: integer("term_months"),
    producer: text("producer"),
    premisesAddress: text("premises_address"),
    premisesCity: text("premises_city"),
    premisesState: text("premises_state"),
    premisesZip: text("premises_zip"),
    zohoId: text("zoho_id"),
    sourceId: text("source_id"),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    endReason: text("end_reason"),
    ownerId: uuid("owner_id"),
    coverageLimits: jsonb("coverage_limits").$type<Record<string, string> | null>(),
    locationId: uuid("location_id"),
    ...timestamps,
  },
  (t) => [
    index("policies_tenant_idx").on(t.tenantId),
    index("policies_exp_idx").on(t.tenantId, t.expirationDate),
  ],
);

export const clientHistory = pgTable(
  "client_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    contactId: uuid("contact_id").references(() => contacts.id),
    accountId: uuid("account_id"),
    dealId: uuid("deal_id").references(() => deals.id),
    policyId: uuid("policy_id").references(() => policies.id),
    eventType: text("event_type").notNull(),
    body: text("body").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("client_history_tenant_idx").on(t.tenantId, t.contactId)],
);

export const reviewTasks = pgTable(
  "review_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    contactId: uuid("contact_id").references(() => contacts.id),
    accountId: uuid("account_id"),
    policyId: uuid("policy_id").references(() => policies.id),
    dealId: uuid("deal_id").references(() => deals.id),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("open"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    workItemId: uuid("work_item_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("review_tasks_tenant_idx").on(t.tenantId),
    index("review_tasks_due_idx").on(t.tenantId, t.status, t.dueDate),
  ],
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    riskId: uuid("risk_id").references(() => risks.id),
    dealId: uuid("deal_id").references(() => deals.id),
    policyId: uuid("policy_id"),
    contactId: uuid("contact_id").references(() => contacts.id),
    accountId: uuid("account_id"),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    storagePath: text("storage_path").notNull(),
    docType: text("doc_type").notNull().default("other"),
    slot: text("slot").notNull().default("source_doc"),
    status: text("status").notNull().default("uploaded"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("documents_tenant_risk_idx").on(t.tenantId, t.riskId),
    index("documents_tenant_deal_slot_idx").on(t.tenantId, t.dealId, t.slot),
    index("documents_tenant_policy_idx").on(t.tenantId, t.policyId),
  ],
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    mailingAddress: text("mailing_address"),
    city: text("city"),
    state: text("state"),
    zip: text("zip"),
    notes: text("notes"),
    tenureStart: timestamp("tenure_start", { withTimezone: true }),
    policyCount: integer("policy_count").notNull().default(0),
    activePolicyCount: integer("active_policy_count").notNull().default(0),
    dba: text("dba"),
    ein: text("ein"),
    entityType: text("entity_type"),
    employeeCount: integer("employee_count"),
    annualSales: numeric("annual_sales", { precision: 14, scale: 2 }),
    payrollTotal: numeric("payroll_total", { precision: 14, scale: 2 }),
    payrollW2: numeric("payroll_w2", { precision: 14, scale: 2 }),
    payroll1099: numeric("payroll_1099", { precision: 14, scale: 2 }),
    yearsInBusiness: integer("years_in_business"),
    naics: text("naics"),
    operations: text("operations"),
    operationsDescription: text("operations_description"),
    legalName: text("legal_name"),
    wcClassCode: text("wc_class_code"),
    clientSince: timestamp("client_since", { withTimezone: true }),
    zohoId: text("zoho_id"),
    sourceId: text("source_id"),
    boundPolicyCount: integer("bound_policy_count").notNull().default(0),
    pendingPolicyCount: integer("pending_policy_count").notNull().default(0),
    lifetimePolicyCount: integer("lifetime_policy_count").notNull().default(0),
    primaryAddress1: text("primary_address1"),
    primaryCity: text("primary_city"),
    primaryCounty: text("primary_county"),
    primaryState: text("primary_state"),
    primaryZip: text("primary_zip"),
    mailingSameAsPrimary: boolean("mailing_same_as_primary").notNull().default(true),
    officerContactId: uuid("officer_contact_id"),
    website: text("website"),
    isExample: boolean("is_example").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index("accounts_tenant_idx").on(t.tenantId),
    index("accounts_ein_idx").on(t.tenantId, t.ein),
  ],
);

export const contactAccounts = pgTable(
  "contact_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),
    role: text("role").notNull().default("principal"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("contact_accounts_tenant_idx").on(t.tenantId),
    uniqueIndex("contact_accounts_pair_uidx").on(t.tenantId, t.contactId, t.accountId),
  ],
);

export const quoteSheets = pgTable(
  "quote_sheets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id),
    line: text("line").notNull(),
    values: jsonb("values").$type<Record<string, QuoteSheetFieldValue>>().notNull().default({}),
    ...timestamps,
  },
  (t) => [
    index("quote_sheets_tenant_idx").on(t.tenantId),
    uniqueIndex("quote_sheets_deal_line_uidx").on(t.tenantId, t.dealId, t.line),
  ],
);

export const extractedFields = pgTable(
  "extracted_fields",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id),
    riskId: uuid("risk_id")
      .notNull()
      .references(() => risks.id),
    fieldKey: text("field_key").notNull(),
    rawValue: text("raw_value").notNull(),
    normalizedValue: text("normalized_value").notNull(),
    confidence: numeric("confidence", { precision: 4, scale: 3 }).notNull(),
    flagged: boolean("flagged").notNull().default(false),
    appliedToRisk: boolean("applied_to_risk").notNull().default(false),
    reviewerNote: text("reviewer_note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("extracted_fields_doc_idx").on(t.tenantId, t.documentId)],
);

export const appetiteRules = pgTable(
  "appetite_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    carrierId: uuid("carrier_id")
      .notNull()
      .references(() => carriers.id),
    lineOfBusiness: text("line_of_business").notNull().default("HO"),
    minCovA: integer("min_cov_a"),
    maxCovA: integer("max_cov_a"),
    minYearBuilt: integer("min_year_built"),
    maxRoofAge: integer("max_roof_age"),
    allowedRoofCoverings: jsonb("allowed_roof_coverings").$type<string[] | null>(),
    coastalAllowed: boolean("coastal_allowed").notNull().default(true),
    minMilesToCoast: real("min_miles_to_coast"),
    maxMilesToCoast: real("max_miles_to_coast"),
    mobileAllowed: boolean("mobile_allowed").notNull().default(false),
    requiresOpeningProtection: boolean("requires_opening_protection")
      .notNull()
      .default(false),
    maxStories: integer("max_stories"),
    allowedConstruction: jsonb("allowed_construction").$type<string[] | null>(),
    allowedOccupancy: jsonb("allowed_occupancy").$type<string[] | null>(),
    allowedCounties: jsonb("allowed_counties").$type<string[] | null>(),
    excludedCounties: jsonb("excluded_counties").$type<string[] | null>(),
    countyMinCovA: jsonb("county_min_cov_a").$type<Record<string, number> | null>(),
    requireReplacementCost: boolean("require_replacement_cost")
      .notNull()
      .default(false),
    rceFloorRatio: real("rce_floor_ratio"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("appetite_rules_tenant_carrier_idx").on(t.tenantId, t.carrierId)],
);

export const quoteAttemptLogs = pgTable(
  "quote_attempt_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id),
    riskId: uuid("risk_id")
      .notNull()
      .references(() => risks.id),
    carrierId: uuid("carrier_id")
      .notNull()
      .references(() => carriers.id),
    attemptedAt: timestamp("attempted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lineOfBusiness: text("line_of_business").notNull().default("HO"),
    result: text("result").notNull(),
    bindable: boolean("bindable").notNull().default(false),
    quoteNumber: text("quote_number"),
    premium: numeric("premium", { precision: 12, scale: 2 }),
    covATried: integer("cov_a_tried"),
    covAForced: integer("cov_a_forced"),
    why: text("why"),
    snapYearBuilt: integer("snap_year_built"),
    snapRoofYear: integer("snap_roof_year"),
    snapRoofCovering: text("snap_roof_covering"),
    snapConstruction: text("snap_construction"),
    snapOpeningProtection: text("snap_opening_protection"),
    snapOccupancy: text("snap_occupancy"),
    snapStories: integer("snap_stories"),
    snapPool: boolean("snap_pool"),
    snapProtectionClass: text("snap_protection_class"),
    snapMilesToCoast: real("snap_miles_to_coast"),
    snapCity: text("snap_city"),
    snapCounty: text("snap_county"),
    snapCoverageA: integer("snap_coverage_a"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("quote_logs_tenant_idx").on(t.tenantId),
    index("quote_logs_carrier_idx").on(t.tenantId, t.carrierId),
  ],
);

export const quotes = pgTable(
  "quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id),
    riskId: uuid("risk_id")
      .notNull()
      .references(() => risks.id),
    carrierId: uuid("carrier_id")
      .notNull()
      .references(() => carriers.id),
    quoteAttemptLogId: uuid("quote_attempt_log_id").references(
      () => quoteAttemptLogs.id,
    ),
    quoteNumber: text("quote_number"),
    premium: numeric("premium", { precision: 12, scale: 2 }),
    hurricaneDeductible: text("hurricane_deductible"),
    aopDeductible: text("aop_deductible"),
    coverageA: integer("coverage_a"),
    bindable: boolean("bindable").notNull().default(false),
    coverageGaps: jsonb("coverage_gaps").$type<string[]>().notNull().default([]),
    notes: text("notes"),
    stub: boolean("stub").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("quotes_tenant_deal_idx").on(t.tenantId, t.dealId)],
);

export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    severity: text("severity").notNull().default("info"),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("alerts_tenant_unread_idx").on(t.tenantId, t.readAt)],
);

/** Consumed from agency-ops: task / meeting / call. TEST-DESK adds account_id. */
export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    notes: text("notes"),
    status: text("status").notNull().default("open"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    startAt: timestamp("start_at", { withTimezone: true }),
    endAt: timestamp("end_at", { withTimezone: true }),
    assignee: text("assignee"),
    contactId: uuid("contact_id").references(() => contacts.id),
    accountId: uuid("account_id"),
    dealId: uuid("deal_id").references(() => deals.id),
    policyId: uuid("policy_id").references(() => policies.id),
    leadId: uuid("lead_id").references(() => leads.id),
    ...timestamps,
  },
  (t) => [
    index("activities_tenant_idx").on(t.tenantId),
    index("activities_when_idx").on(t.tenantId, t.startAt, t.dueAt),
    index("activities_status_idx").on(t.tenantId, t.status, t.kind),
    index("activities_account_idx").on(t.tenantId, t.accountId),
  ],
);

/** Every task / meeting / call writes a log. FKs keep logs off orphan records. */
export const activityLogs = pgTable(
  "activity_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    activityId: uuid("activity_id")
      .notNull()
      .references(() => activities.id),
    kind: text("kind").notNull(),
    eventType: text("event_type").notNull(),
    body: text("body").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    contactId: uuid("contact_id").references(() => contacts.id),
    accountId: uuid("account_id"),
    policyId: uuid("policy_id").references(() => policies.id),
    dealId: uuid("deal_id").references(() => deals.id),
    leadId: uuid("lead_id").references(() => leads.id),
    direction: text("direction"),
    threadKey: text("thread_key"),
    subject: text("subject"),
    fromAddress: text("from_address"),
    toAddress: text("to_address"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("activity_logs_activity_idx").on(t.tenantId, t.activityId),
    index("activity_logs_contact_idx").on(t.tenantId, t.contactId),
    index("activity_logs_account_idx").on(t.tenantId, t.accountId),
    index("activity_logs_policy_idx").on(t.tenantId, t.policyId),
    index("activity_logs_deal_idx").on(t.tenantId, t.dealId),
    index("activity_logs_thread_idx").on(t.tenantId, t.threadKey),
  ],
);

export const pipelines = pgTable(
  "pipelines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    kind: text("kind").notNull().default("shopping"),
    seeded: boolean("seeded").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index("pipelines_tenant_idx").on(t.tenantId),
    uniqueIndex("pipelines_slug_uidx").on(t.tenantId, t.slug),
  ],
);

export const pipelineStages = pgTable(
  "pipeline_stages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    pipelineId: uuid("pipeline_id")
      .notNull()
      .references(() => pipelines.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    seeded: boolean("seeded").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("pipeline_stages_slug_uidx").on(t.tenantId, t.pipelineId, t.slug)],
);

export type FormFieldDef = {
  key: string;
  label: string;
  group: string;
  sheetKey?: string;
  contactKey?: "name" | "email" | "phone" | "dob" | "mailing";
  dealKey?: "primaryNamedInsured" | "secondaryNamedInsured" | "title" | "state";
};

export const formTemplates = pgTable(
  "form_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    line: text("line").notNull(),
    status: text("status").notNull().default("stub"),
    family: text("family"),
    summary: text("summary"),
    fields: jsonb("fields").$type<FormFieldDef[]>().notNull().default([]),
    ...timestamps,
  },
  (t) => [uniqueIndex("form_templates_slug_uidx").on(t.tenantId, t.slug)],
);

export const emailTemplates = pgTable(
  "email_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    locale: text("locale").notNull().default("en"),
    ...timestamps,
  },
  (t) => [uniqueIndex("email_templates_slug_uidx").on(t.tenantId, t.slug)],
);

export const emailTriggers = pgTable(
  "email_triggers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    delayDays: integer("delay_days").notNull().default(0),
    templateId: uuid("template_id"),
    hangOff: text("hang_off").notNull().default("won_date"),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
);

export const emailSendJobs = pgTable(
  "email_send_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    triggerId: uuid("trigger_id"),
    templateId: uuid("template_id"),
    contactId: uuid("contact_id"),
    accountId: uuid("account_id"),
    dealId: uuid("deal_id"),
    policyId: uuid("policy_id"),
    anchorKind: text("anchor_kind").notNull().default("won_date"),
    anchorAt: timestamp("anchor_at", { withTimezone: true }).notNull(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("queued"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("email_jobs_anchor_idx").on(t.tenantId, t.anchorKind, t.status)],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    role: text("role").notNull().default("agent"),
    passwordHash: text("password_hash"),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("users_tenant_idx").on(t.tenantId)],
);

export const carrierAppointments = pgTable(
  "carrier_appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    carrierId: uuid("carrier_id")
      .notNull()
      .references(() => carriers.id),
    writtenLine: text("written_line").notNull(),
    appointed: boolean("appointed").notNull().default(true),
    sellingAgency: text("selling_agency"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("carrier_appointments_line_uidx").on(t.tenantId, t.carrierId, t.writtenLine),
  ],
);

export const locations = pgTable(
  "locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    contactId: uuid("contact_id").references(() => contacts.id),
    leadId: uuid("lead_id").references(() => leads.id),
    accountId: uuid("account_id").references(() => accounts.id),
    kind: text("kind").notNull().default("mailing"),
    label: text("label"),
    address1: text("address1"),
    street: text("street"),
    city: text("city"),
    county: text("county"),
    state: text("state"),
    zip: text("zip"),
    occupancy: text("occupancy"),
    ...timestamps,
  },
  (t) => [index("locations_tenant_idx").on(t.tenantId)],
);

export const mergeCandidates = pgTable(
  "merge_candidates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    entityType: text("entity_type").notNull(),
    leftId: uuid("left_id").notNull(),
    rightId: uuid("right_id").notNull(),
    matchReasons: jsonb("match_reasons").$type<string[]>().notNull().default([]),
    status: text("status").notNull().default("open"),
    keeperId: uuid("keeper_id"),
    duplicateId: uuid("duplicate_id"),
    mergedAt: timestamp("merged_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("merge_candidates_tenant_idx").on(t.tenantId, t.status)],
);

export const mergeEvents = pgTable(
  "merge_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    entityType: text("entity_type").notNull(),
    keeperId: uuid("keeper_id").notNull(),
    duplicateId: uuid("duplicate_id").notNull(),
    copiedFields: jsonb("copied_fields").$type<string[]>().notNull().default([]),
    relinked: jsonb("relinked").$type<Record<string, number>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
);

export const issuedCertificates = pgTable(
  "issued_certificates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    accountId: uuid("account_id").references(() => accounts.id),
    businessId: uuid("business_id"),
    certificateNumber: text("certificate_number").notNull(),
    holderName: text("holder_name").notNull(),
    holderAddress: text("holder_address"),
    jobLocation: text("job_location"),
    lines: jsonb("lines").$type<CertificateLine[]>().notNull().default([]),
    producerName: text("producer_name"),
    issuedAt: timestamp("issued_at", { withTimezone: true }).defaultNow().notNull(),
    status: text("status").notNull().default("issued"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
);

export const claims = pgTable(
  "claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    policyId: uuid("policy_id").references(() => policies.id),
    dateReported: timestamp("date_reported", { withTimezone: true }),
    dateOfLoss: timestamp("date_of_loss", { withTimezone: true }),
    causeType: text("cause_type"),
    description: text("description"),
    reportedHow: text("reported_how"),
    carrierClaimNumber: text("carrier_claim_number"),
    status: text("status").notNull().default("inquiry"),
    ...timestamps,
  },
  (t) => [index("claims_tenant_idx").on(t.tenantId)],
);

export const claimNotes = pgTable("claim_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: tenantCol(),
  claimId: uuid("claim_id")
    .notNull()
    .references(() => claims.id),
  body: text("body").notNull(),
  postedBy: text("posted_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const claimAttachments = pgTable("claim_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: tenantCol(),
  claimId: uuid("claim_id")
    .notNull()
    .references(() => claims.id),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  storagePath: text("storage_path").notNull(),
  docType: text("doc_type").notNull().default("other"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const claimActivity = pgTable("claim_activity", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: tenantCol(),
  claimId: uuid("claim_id")
    .notNull()
    .references(() => claims.id),
  eventType: text("event_type").notNull(),
  body: text("body").notNull(),
  actor: text("actor"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const commissions = pgTable(
  "commissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    agentId: uuid("agent_id"),
    policyId: uuid("policy_id").references(() => policies.id),
    carrierId: uuid("carrier_id").references(() => carriers.id),
    lineOfBusiness: text("line_of_business"),
    premium: numeric("premium", { precision: 12, scale: 2 }),
    ratePct: numeric("rate_pct", { precision: 6, scale: 3 }),
    amount: numeric("amount", { precision: 12, scale: 2 }),
    status: text("status").notNull().default("pending"),
    dueDate: timestamp("due_date", { withTimezone: true }),
    paidDate: timestamp("paid_date", { withTimezone: true }),
    period: text("period"),
    ...timestamps,
  },
  (t) => [index("commissions_tenant_idx").on(t.tenantId, t.status)],
);

export const commissionEvents = pgTable("commission_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: tenantCol(),
  commissionId: uuid("commission_id").references(() => commissions.id),
  actorId: uuid("actor_id"),
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const agencySettings = pgTable("agency_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: tenantCol(),
  fiscalYearStartMonth: integer("fiscal_year_start_month").notNull().default(1),
  agencyName: text("agency_name"),
  logoPath: text("logo_path"),
  emailSignature: text("email_signature"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const deskColumnPrefs = pgTable(
  "desk_column_prefs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    userId: uuid("user_id"),
    tableKey: text("table_key").notNull(),
    columns: jsonb("columns").$type<string[]>().notNull().default([]),
    ...timestamps,
  },
  (t) => [uniqueIndex("desk_column_prefs_uidx").on(t.tenantId, t.userId, t.tableKey)],
);

/** Configurable commission rates. No official carrier/CMS rates hardcoded. */
export const commissionRateSettings = pgTable("commission_rate_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: tenantCol(),
  lineFamily: text("line_family").notNull(),
  ratePct: numeric("rate_pct", { precision: 6, scale: 3 }),
  perPersonMonth: numeric("per_person_month", { precision: 10, scale: 2 }),
  medicareNew: numeric("medicare_new", { precision: 10, scale: 2 }),
  medicareRenewal: numeric("medicare_renewal", { precision: 10, scale: 2 }),
  notes: text("notes"),
  ...timestamps,
});

export const policyAutomations = pgTable(
  "policy_automations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    policyId: uuid("policy_id").references(() => policies.id),
    kind: text("kind").notNull(),
    fireOn: timestamp("fire_on", { withTimezone: true }),
    status: text("status").notNull().default("open"),
    body: text("body"),
    ...timestamps,
  },
  (t) => [index("policy_automations_tenant_idx").on(t.tenantId, t.policyId, t.kind)],
);

export const recordAsks = pgTable("record_asks", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: tenantCol(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  authorId: uuid("author_id"),
  kind: text("kind").notNull().default("question"),
  body: text("body").notNull(),
  status: text("status").notNull().default("open"),
  resolvedBy: uuid("resolved_by"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const carrierGoals = pgTable("carrier_goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: tenantCol(),
  carrierId: uuid("carrier_id").references(() => carriers.id),
  year: integer("year").notNull(),
  premiumGoal: numeric("premium_goal", { precision: 14, scale: 2 }),
  policyGoal: integer("policy_goal"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const drivers = pgTable("drivers", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: tenantCol(),
  policyId: uuid("policy_id").references(() => policies.id),
  dealId: uuid("deal_id").references(() => deals.id),
  quoteSheetId: uuid("quote_sheet_id"),
  riskId: uuid("risk_id"),
  contactId: uuid("contact_id").references(() => contacts.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dateOfBirth: text("date_of_birth"),
  licenseNumber: text("license_number"),
  licenseState: text("license_state"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const vehicles = pgTable("vehicles", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: tenantCol(),
  policyId: uuid("policy_id").references(() => policies.id),
  dealId: uuid("deal_id").references(() => deals.id),
  quoteSheetId: uuid("quote_sheet_id"),
  riskId: uuid("risk_id"),
  year: integer("year"),
  make: text("make"),
  model: text("model"),
  vin: text("vin"),
  usage: text("usage"),
  garagingZip: text("garaging_zip"),
  garagingAddress: text("garaging_address"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const policyTerms = pgTable("policy_terms", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: tenantCol(),
  policyId: uuid("policy_id")
    .notNull()
    .references(() => policies.id),
  role: text("role").notNull().default("current"),
  termEffective: timestamp("term_effective", { withTimezone: true }).notNull(),
  termExpiration: timestamp("term_expiration", { withTimezone: true }).notNull(),
  premium: numeric("premium", { precision: 12, scale: 2 }),
  aopDeductible: text("aop_deductible"),
  hurricaneDeductible: text("hurricane_deductible"),
  comprehensiveDeductible: text("comprehensive_deductible"),
  collisionDeductible: text("collision_deductible"),
  coverages: jsonb("coverages").$type<PolicyCoverageLine[] | Record<string, string> | null>(),
  notes: text("notes"),
  source: text("source"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const renewalCompareLogs = pgTable("renewal_compare_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: tenantCol(),
  policyId: uuid("policy_id").references(() => policies.id),
  currentTermId: uuid("current_term_id"),
  proposedTermId: uuid("proposed_term_id"),
  eventType: text("event_type").notNull(),
  currentPremium: numeric("current_premium", { precision: 12, scale: 2 }),
  proposedPremium: numeric("proposed_premium", { precision: 12, scale: 2 }),
  delta: numeric("delta", { precision: 12, scale: 2 }),
  pct: numeric("pct", { precision: 8, scale: 4 }),
  summary: text("summary"),
  snapshot: jsonb("snapshot"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const policyEvents = pgTable("policy_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: tenantCol(),
  policyId: uuid("policy_id").references(() => policies.id),
  kind: text("kind").notNull(),
  effectiveDate: timestamp("effective_date", { withTimezone: true }),
  reason: text("reason"),
  summary: text("summary"),
  changeSet: jsonb("change_set"),
  premisesKey: text("premises_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const policyAttachments = pgTable("policy_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: tenantCol(),
  policyId: uuid("policy_id").references(() => policies.id),
  eventId: uuid("event_id"),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  storagePath: text("storage_path").notNull(),
  docType: text("doc_type").notNull().default("other"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const policyWorkItems = pgTable(
  "policy_work_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    policyId: uuid("policy_id")
      .notNull()
      .references(() => policies.id),
    assigneeId: uuid("assignee_id"),
    workStatus: text("work_status").notNull().default("ready"),
    ...timestamps,
  },
  (t) => [uniqueIndex("policy_work_items_policy_uidx").on(t.tenantId, t.policyId)],
);

export const policyWorkFlags = pgTable("policy_work_flags", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: tenantCol(),
  workItemId: uuid("work_item_id").references(() => policyWorkItems.id),
  policyId: uuid("policy_id"),
  flag: text("flag").notNull(),
  createdBy: uuid("created_by"),
  clearedAt: timestamp("cleared_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const policyWorkNotes = pgTable("policy_work_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: tenantCol(),
  workItemId: uuid("work_item_id").references(() => policyWorkItems.id),
  authorId: uuid("author_id"),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type Deal = typeof deals.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type ContactAccount = typeof contactAccounts.$inferSelect;
export type Policy = typeof policies.$inferSelect;
export type Risk = typeof risks.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type ExtractedFieldRow = typeof extractedFields.$inferSelect;
export type Carrier = typeof carriers.$inferSelect;
export type AppetiteRule = typeof appetiteRules.$inferSelect;
export type QuoteAttemptLog = typeof quoteAttemptLogs.$inferSelect;
export type Quote = typeof quotes.$inferSelect;
export type QuoteSheet = typeof quoteSheets.$inferSelect;
export type Alert = typeof alerts.$inferSelect;
export type ReviewTask = typeof reviewTasks.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type Pipeline = typeof pipelines.$inferSelect;
export type PipelineStage = typeof pipelineStages.$inferSelect;
export type FormTemplate = typeof formTemplates.$inferSelect;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type EmailTrigger = typeof emailTriggers.$inferSelect;
export type EmailSendJob = typeof emailSendJobs.$inferSelect;
export type User = typeof users.$inferSelect;
export type CarrierAppointment = typeof carrierAppointments.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type MergeCandidate = typeof mergeCandidates.$inferSelect;
export type IssuedCertificate = typeof issuedCertificates.$inferSelect;
export type Business = Account;
export type Claim = typeof claims.$inferSelect;
export type Commission = typeof commissions.$inferSelect;
export type Driver = typeof drivers.$inferSelect;
export type Vehicle = typeof vehicles.$inferSelect;
export type PolicyTerm = typeof policyTerms.$inferSelect;
export type RenewalCompareLog = typeof renewalCompareLogs.$inferSelect;
export type PolicyWorkItem = typeof policyWorkItems.$inferSelect;
export type DeskColumnPref = typeof deskColumnPrefs.$inferSelect;
export type CommissionRateSetting = typeof commissionRateSettings.$inferSelect;
export type PolicyAutomation = typeof policyAutomations.$inferSelect;
