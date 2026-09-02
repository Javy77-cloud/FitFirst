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
  uuid,
} from "drizzle-orm/pg-core";

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
    notes: text("notes"),
    lifeNotes: text("life_notes"),
    healthNotes: text("health_notes"),
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
    title: text("title").notNull(),
    pipelineStage: text("pipeline_stage").notNull().default("shopping"),
    lineOfBusiness: text("line_of_business").notNull().default("HO"),
    state: text("state").notNull().default("FL"),
    notes: text("notes"),
    boundAt: timestamp("bound_at", { withTimezone: true }),
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
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
    dealId: uuid("deal_id").references(() => deals.id),
    riskId: uuid("risk_id").references(() => risks.id),
    carrierId: uuid("carrier_id").references(() => carriers.id),
    policyNumber: text("policy_number").notNull(),
    lineOfBusiness: text("line_of_business").notNull(),
    status: text("status").notNull().default("active"),
    effectiveDate: timestamp("effective_date", { withTimezone: true }).notNull(),
    expirationDate: timestamp("expiration_date", { withTimezone: true }).notNull(),
    premium: integer("premium"),
    coverageA: integer("coverage_a"),
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
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
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
    policyId: uuid("policy_id").references(() => policies.id),
    dealId: uuid("deal_id").references(() => deals.id),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("open"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
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
    riskId: uuid("risk_id")
      .notNull()
      .references(() => risks.id),
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    storagePath: text("storage_path").notNull(),
    docType: text("doc_type").notNull().default("other"),
    status: text("status").notNull().default("uploaded"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("documents_tenant_risk_idx").on(t.tenantId, t.riskId)],
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
    premium: integer("premium"),
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
    premium: integer("premium"),
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

export type Lead = typeof leads.$inferSelect;
export type Deal = typeof deals.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Policy = typeof policies.$inferSelect;
export type Risk = typeof risks.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type ExtractedFieldRow = typeof extractedFields.$inferSelect;
export type Carrier = typeof carriers.$inferSelect;
export type AppetiteRule = typeof appetiteRules.$inferSelect;
export type QuoteAttemptLog = typeof quoteAttemptLogs.$inferSelect;
export type Quote = typeof quotes.$inferSelect;
export type Alert = typeof alerts.$inferSelect;
export type ReviewTask = typeof reviewTasks.$inferSelect;
