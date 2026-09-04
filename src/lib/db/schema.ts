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
  source: "blank" | "agent" | "extracted" | "seed" | "javy" | "public";
  /** Short tag on the cell: "Uploaded dec", "Brevard PA", "Listing facts", "FEMA flood". */
  sourceLabel?: string;
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

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    username: text("username"),
    role: text("role").notNull().default("agent"),
    passwordHash: text("password_hash"),
    active: boolean("active").notNull().default(true),
    accessStatus: text("access_status").notNull().default("active"),
    canAccessModules: boolean("can_access_modules").notNull().default(true),
    canSeeAgencyWidgets: boolean("can_see_agency_widgets").notNull().default(true),
    officeLabel: text("office_label"),
    territoryLabel: text("territory_label"),
    mustSetPassword: boolean("must_set_password").notNull().default(false),
    inviteToken: text("invite_token"),
    inviteExpiresAt: timestamp("invite_expires_at", { withTimezone: true }),
    resetToken: text("reset_token"),
    resetExpiresAt: timestamp("reset_expires_at", { withTimezone: true }),
    mfaEnrolled: boolean("mfa_enrolled").notNull().default(false),
    mustEnrollMfa: boolean("must_enroll_mfa").notNull().default(true),
    mfaMethod: text("mfa_method"),
    totpSecret: text("totp_secret"),
    mfaSecret: text("mfa_secret"),
    mfaPhone: text("mfa_phone"),
    mfaEmail: text("mfa_email"),
    mfaDemoBypass: boolean("mfa_demo_bypass").notNull().default(false),
    recoveryToken: text("recovery_token"),
    recoveryExpiresAt: timestamp("recovery_expires_at", { withTimezone: true }),
    frozenAt: timestamp("frozen_at", { withTimezone: true }),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    meetingAddress: text("meeting_address"),
    ...timestamps,
  },
  (t) => [
    index("users_tenant_idx").on(t.tenantId),
    uniqueIndex("users_tenant_email_idx").on(t.tenantId, t.email),
    uniqueIndex("users_tenant_username_idx").on(t.tenantId, t.username),
  ],
);

/** Admin-issued password or MFA recovery links. Stub only — nothing emails. */
export const authRecoveryTokens = pgTable(
  "auth_recovery_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    kind: text("kind").notNull(),
    tokenHash: text("token_hash").notNull(),
    stubToken: text("stub_token"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdBy: uuid("created_by"),
    ...timestamps,
  },
  (t) => [
    index("auth_recovery_tokens_user_idx").on(t.userId),
    index("auth_recovery_tokens_hash_idx").on(t.tokenHash),
  ],
);

/** SMS / email stub codes for enroll or login verify. TOTP does not use this. */
export const mfaChallenges = pgTable(
  "mfa_challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    method: text("method").notNull(),
    codeHash: text("code_hash").notNull(),
    stubCode: text("stub_code"),
    destination: text("destination"),
    purpose: text("purpose").notNull().default("verify"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("mfa_challenges_user_idx").on(t.userId)],
);

export const agencySettings = pgTable(
  "agency_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    fiscalYearStartMonth: integer("fiscal_year_start_month").notNull().default(1),
    agencyName: text("agency_name"),
    logoPath: text("logo_path"),
    emailSignature: text("email_signature"),
    writeLife: boolean("write_life").notNull().default(true),
    writeHealth: boolean("write_health").notNull().default(true),
    showSellingAgency: boolean("show_selling_agency").notNull().default(false),
    officeAddress: text("office_address"),
    zoomUrl: text("zoom_url"),
    meetUrl: text("meet_url"),
    byoVideoUrl: text("byo_video_url"),
    videoProvider: text("video_provider").notNull().default("none"),
    showCompanyWidgets: boolean("show_company_widgets").notNull().default(false),
    /** Admin must enable this before agents can see GBP pulse / inquiries. */
    allowAgentsMonitorGbp: boolean("allow_agents_monitor_gbp").notNull().default(false),
    ...timestamps,
  },
  (t) => [uniqueIndex("agency_settings_tenant_idx").on(t.tenantId)],
);

/** Physical desks. An agent can sit in more than one office (different states ok). */
export const offices = pgTable(
  "offices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    name: text("name").notNull(),
    states: jsonb("states").$type<string[]>().notNull().default([]),
    address: text("address"),
    timezone: text("timezone"),
    ...timestamps,
  },
  (t) => [
    index("offices_tenant_idx").on(t.tenantId),
    uniqueIndex("offices_tenant_name_uidx").on(t.tenantId, t.name),
  ],
);

/** Geo books. Optional office links. Agents resolve through membership + linked offices. */
export const territories = pgTable(
  "territories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    name: text("name").notNull(),
    states: jsonb("states").$type<string[]>().notNull().default([]),
    counties: jsonb("counties").$type<string[]>().notNull().default([]),
    geoLabel: text("geo_label"),
    ...timestamps,
  },
  (t) => [
    index("territories_tenant_idx").on(t.tenantId),
    uniqueIndex("territories_tenant_name_uidx").on(t.tenantId, t.name),
  ],
);

export const territoryOffices = pgTable(
  "territory_offices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    territoryId: uuid("territory_id")
      .notNull()
      .references(() => territories.id, { onDelete: "cascade" }),
    officeId: uuid("office_id")
      .notNull()
      .references(() => offices.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("territory_offices_uidx").on(t.tenantId, t.territoryId, t.officeId),
    index("territory_offices_office_idx").on(t.tenantId, t.officeId),
  ],
);

export const userOffices = pgTable(
  "user_offices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    officeId: uuid("office_id")
      .notNull()
      .references(() => offices.id, { onDelete: "cascade" }),
    isPrimary: boolean("is_primary").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("user_offices_uidx").on(t.tenantId, t.userId, t.officeId),
    index("user_offices_office_idx").on(t.tenantId, t.officeId),
  ],
);

export const userTerritories = pgTable(
  "user_territories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    territoryId: uuid("territory_id")
      .notNull()
      .references(() => territories.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("user_territories_uidx").on(t.tenantId, t.userId, t.territoryId),
    index("user_territories_territory_idx").on(t.tenantId, t.territoryId),
  ],
);

/** Zoho-style global picklists: policy types, sub-types, terms, statuses, file categories. */
export const globalLists = pgTable(
  "global_lists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    listKey: text("list_key").notNull(),
    family: text("family"),
    parentSlug: text("parent_slug"),
    slug: text("slug").notNull(),
    label: text("label").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    color: text("color"),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("global_lists_tenant_idx").on(t.tenantId, t.listKey),
    uniqueIndex("global_lists_key_slug_uidx").on(t.tenantId, t.listKey, t.slug),
  ],
);

/** Configurable Life / Health book chips. Defaults seed Term/Whole/IUL/Final Expense and Marketplace/MA/A&B/Supplemental. */
export const lineSubfilterOptions = pgTable(
  "line_subfilter_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    book: text("book").notNull(),
    slug: text("slug").notNull(),
    label: text("label").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index("line_subfilter_options_tenant_idx").on(t.tenantId, t.book),
    uniqueIndex("line_subfilter_options_book_slug_uidx").on(t.tenantId, t.book, t.slug),
  ],
);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    firstName: text("first_name").notNull(),
    middleName: text("middle_name"),
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
    insuranceTypeDesired: text("insurance_type_desired"),
    preferredLanguage: text("preferred_language"),
    mergedIntoId: uuid("merged_into_id"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ownerId: uuid("owner_id"),
    ...timestamps,
  },
  (t) => [
    index("leads_tenant_idx").on(t.tenantId),
    index("leads_owner_idx").on(t.tenantId, t.ownerId),
  ],
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
    emailOptOut: boolean("email_opt_out").notNull().default(false),
    smsOptOut: boolean("sms_opt_out").notNull().default(false),
    emailOptedOutAt: timestamp("email_opted_out_at", { withTimezone: true }),
    smsOptedOutAt: timestamp("sms_opted_out_at", { withTimezone: true }),
    clientStatus: text("client_status"),
    lifetimePolicyCount: integer("lifetime_policy_count").notNull().default(0),
    accountId: uuid("account_id"),
    zohoId: text("zoho_id"),
    sourceId: text("source_id"),
    status: text("status").notNull().default("active"),
    mergedIntoId: uuid("merged_into_id"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ownerId: uuid("owner_id"),
    ssnEnc: text("ssn_enc"),
    ssnIv: text("ssn_iv"),
    ssnLast4: text("ssn_last4"),
    ...timestamps,
  },
  (t) => [
    index("contacts_tenant_idx").on(t.tenantId),
    index("contacts_owner_idx").on(t.tenantId, t.ownerId),
  ],
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
    shopLines: jsonb("shop_lines").$type<string[]>().notNull().default(["home"]),
    policySubType: text("policy_sub_type"),
    coverageAmount: integer("coverage_amount"),
    propertyOneliner: text("property_oneliner"),
    currentCarrier: text("current_carrier"),
    accountKind: text("account_kind").notNull().default("personal"),
    boundAt: timestamp("bound_at", { withTimezone: true }),
    pipelineId: uuid("pipeline_id"),
    pipelineStageSlug: text("pipeline_stage_slug"),
    wonAt: timestamp("won_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    archiveScheduledAt: timestamp("archive_scheduled_at", { withTimezone: true }),
    ownerId: uuid("owner_id"),
    quotingLine: text("quoting_line"),
    quotingForm: text("quoting_form"),
    sheetApprovedAt: timestamp("sheet_approved_at", { withTimezone: true }),
    sheetApprovedBy: text("sheet_approved_by"),
    quotingUnlocked: boolean("quoting_unlocked").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index("deals_tenant_idx").on(t.tenantId),
    index("deals_stage_idx").on(t.tenantId, t.pipelineStage),
    index("deals_owner_idx").on(t.tenantId, t.ownerId),
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
    portalLogin: text("portal_login"),
    customerServicePhone: text("customer_service_phone"),
    agentPhone: text("agent_phone"),
    website: text("website"),
    agentPortalUrl: text("agent_portal_url"),
    carrierInfo: text("carrier_info"),
    amBestRating: text("am_best_rating"),
    underwriterName: text("underwriter_name"),
    underwriterEmail: text("underwriter_email"),
    underwriterPhone: text("underwriter_phone"),
    accountManagerName: text("account_manager_name"),
    accountManagerEmail: text("account_manager_email"),
    accountManagerPhone: text("account_manager_phone"),
    claimsPhone: text("claims_phone"),
    billingPhone: text("billing_phone"),
    newBusinessCommPct: text("new_business_comm_pct"),
    renewalCommPct: text("renewal_comm_pct"),
    territory: text("territory"),
    preferredSubmission: text("preferred_submission"),
    bindingAuthority: text("binding_authority"),
    appetiteNotes: text("appetite_notes"),
    active: boolean("active").notNull().default(true),
    fixtureTag: text("fixture_tag"),
    ...timestamps,
  },
  (t) => [index("carriers_tenant_idx").on(t.tenantId)],
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
    appointed: boolean("appointed").notNull().default(false),
    sellingAgency: text("selling_agency").notNull(),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("carrier_appointments_tenant_idx").on(t.tenantId),
    uniqueIndex("carrier_appointments_carrier_line_uidx").on(
      t.tenantId,
      t.carrierId,
      t.writtenLine,
    ),
  ],
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
    insuranceType: text("insurance_type"),
    policyType: text("policy_type"),
    policyTerm: text("policy_term"),
    faceAmount: numeric("face_amount", { precision: 14, scale: 2 }),
    insuredSameAsMailing: boolean("insured_same_as_mailing").notNull().default(false),
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
    index("policies_owner_idx").on(t.tenantId, t.ownerId),
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

export const documentFolders = pgTable(
  "document_folders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    name: text("name").notNull(),
    kind: text("kind").notNull().default("custom"),
    slug: text("slug"),
    description: text("description"),
    parentId: uuid("parent_id"),
    contactId: uuid("contact_id").references(() => contacts.id),
    dealId: uuid("deal_id").references(() => deals.id),
    policyId: uuid("policy_id").references(() => policies.id),
    sortOrder: integer("sort_order").notNull().default(0),
    library: text("library").notNull().default("shared"),
    ...timestamps,
  },
  (t) => [
    index("document_folders_tenant_idx").on(t.tenantId, t.kind),
    index("document_folders_parent_idx").on(t.tenantId, t.parentId),
    index("document_folders_library_idx").on(t.tenantId, t.library),
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
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    folderId: uuid("folder_id"),
    library: text("library").notNull().default("shared"),
    fillable: boolean("fillable").notNull().default(false),
    formTemplateId: uuid("form_template_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("documents_tenant_risk_idx").on(t.tenantId, t.riskId),
    index("documents_tenant_deal_slot_idx").on(t.tenantId, t.dealId, t.slot),
    index("documents_tenant_policy_idx").on(t.tenantId, t.policyId),
    index("documents_tenant_folder_idx").on(t.tenantId, t.folderId),
    index("documents_tenant_library_idx").on(t.tenantId, t.library),
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
    einEnc: text("ein_enc"),
    einIv: text("ein_iv"),
    einLast4: text("ein_last4"),
    einLookup: text("ein_lookup"),
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
    index("accounts_ein_lookup_idx").on(t.tenantId, t.einLookup),
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
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: text("approved_by"),
    quotingUnlocked: boolean("quoting_unlocked").notNull().default(false),
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

export const extractionJobs = pgTable(
  "extraction_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id),
    documentId: uuid("document_id").references(() => documents.id),
    quoteSheetId: uuid("quote_sheet_id").references(() => quoteSheets.id),
    engine: text("engine").notNull(),
    status: text("status").notNull(),
    filledKeys: jsonb("filled_keys").$type<string[]>().notNull().default([]),
    skippedKeys: jsonb("skipped_keys").$type<string[]>().notNull().default([]),
    message: text("message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("extraction_jobs_deal_idx").on(t.tenantId, t.dealId)],
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
    /** When set, the ping is for this desk user. Null stays agency-wide. */
    userId: uuid("user_id"),
    recipientUserId: uuid("recipient_user_id"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("alerts_tenant_unread_idx").on(t.tenantId, t.readAt)],
);

/** Admin → agent in-app messages. Nothing emails. */
export const deskMessages = pgTable(
  "desk_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    fromUserId: uuid("from_user_id").notNull(),
    toUserId: uuid("to_user_id").notNull(),
    body: text("body").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("desk_messages_to_idx").on(t.tenantId, t.toUserId, t.createdAt)],
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
    durationSeconds: integer("duration_seconds"),
    outcome: text("outcome"),
    assignee: text("assignee"),
    contactId: uuid("contact_id").references(() => contacts.id),
    accountId: uuid("account_id"),
    dealId: uuid("deal_id").references(() => deals.id),
    policyId: uuid("policy_id").references(() => policies.id),
    leadId: uuid("lead_id").references(() => leads.id),
    phoneNumber: text("phone_number"),
    direction: text("direction"),
    meetingType: text("meeting_type"),
    meetingLocation: text("meeting_location"),
    videoProvider: text("video_provider"),
    videoUrl: text("video_url"),
    inviteAudience: text("invite_audience"),
    inviteOfficeId: uuid("invite_office_id"),
    inviteTerritoryId: uuid("invite_territory_id"),
    createdByUserId: uuid("created_by_user_id"),
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

/** Invited desk users for Admin company / training events. */
export const calendarInvites = pgTable(
  "calendar_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    activityId: uuid("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("calendar_invites_uidx").on(t.tenantId, t.activityId, t.userId),
    index("calendar_invites_user_idx").on(t.tenantId, t.userId),
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
    fillable: boolean("fillable").notNull().default(true),
    folderId: uuid("folder_id"),
    ...timestamps,
  },
  (t) => [uniqueIndex("form_templates_slug_uidx").on(t.tenantId, t.slug)],
);

export const formFills = pgTable(
  "form_fills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    formTemplateId: uuid("form_template_id")
      .notNull()
      .references(() => formTemplates.id),
    sourceDocumentId: uuid("source_document_id").references(() => documents.id),
    folderId: uuid("folder_id"),
    values: jsonb("values").$type<Record<string, string>>().notNull().default({}),
    sourceText: text("source_text"),
    status: text("status").notNull().default("draft"),
    ...timestamps,
  },
  (t) => [index("form_fills_tenant_template_idx").on(t.tenantId, t.formTemplateId)],
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
  assigneeId: uuid("assignee_id"),
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
  licenseNumberEnc: text("license_number_enc"),
  licenseNumberIv: text("license_number_iv"),
  licenseNumberLast4: text("license_number_last4"),
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

export const deskAgents = pgTable(
  "desk_agents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    slug: text("slug").notNull(),
    displayName: text("display_name").notNull(),
    role: text("role").notNull().default("agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("desk_agents_tenant_idx").on(t.tenantId),
    uniqueIndex("desk_agents_slug_uidx").on(t.tenantId, t.slug),
  ],
);

export const columnLayouts = pgTable(
  "column_layouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    agentId: uuid("agent_id").references(() => deskAgents.id),
    tableId: text("table_id").notNull(),
    columnIds: jsonb("column_ids").$type<string[]>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("column_layouts_lookup_idx").on(t.tenantId, t.tableId, t.agentId)],
);

export const emailSendAccounts = pgTable(
  "email_send_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    provider: text("provider").notNull(),
    status: text("status").notNull().default("disconnected"),
    accountEmail: text("account_email"),
    ...timestamps,
  },
  (t) => [index("email_send_accounts_tenant_idx").on(t.tenantId)],
);

export const agencyBrand = pgTable(
  "agency_brand",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    agencyName: text("agency_name").notNull(),
    logoStoragePath: text("logo_storage_path"),
    logoMime: text("logo_mime"),
    defaultColorPreset: text("default_color_preset").notNull().default("agency"),
    defaultFontPreset: text("default_font_preset").notNull().default("plex"),
    defaultDensity: text("default_density").notNull().default("comfortable"),
    defaultColumnLayout: jsonb("default_column_layout")
      .$type<Record<string, string[]> | null>()
      .default({}),
    ...timestamps,
  },
  (t) => [index("agency_brand_tenant_idx").on(t.tenantId)],
);

export const emailSignatures = pgTable(
  "email_signatures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    name: text("name").notNull(),
    bodyEn: text("body_en").notNull(),
    bodyEs: text("body_es").notNull(),
    isDefault: boolean("is_default").notNull().default(true),
    isExampleCopy: boolean("is_example_copy").notNull().default(true),
    ownerUserId: uuid("owner_user_id").references(() => users.id),
    approvalStatus: text("approval_status").notNull().default("live"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewNote: text("review_note"),
    ...timestamps,
  },
  (t) => [index("email_signatures_tenant_idx").on(t.tenantId)],
);

/** Named Trigger → Condition → Action rules. Not per-policy fire jobs. */
export const guidedAutomations = pgTable(
  "guided_automations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    name: text("name").notNull(),
    triggerKind: text("trigger_kind").notNull(),
    triggerValue: text("trigger_value"),
    conditionKind: text("condition_kind").notNull().default("always"),
    conditionValue: text("condition_value"),
    actionKind: text("action_kind").notNull(),
    actionValue: text("action_value"),
    enabled: boolean("enabled").notNull().default(true),
    isExample: boolean("is_example").notNull().default(false),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps,
  },
  (t) => [index("guided_automations_tenant_idx").on(t.tenantId)],
);

/** Bulk SMS compose stub. Requires an SMS integration. Nothing texts a client. */
export const bulkSmsDrafts = pgTable(
  "bulk_sms_drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    name: text("name").notNull(),
    body: text("body").notNull(),
    audienceLabel: text("audience_label"),
    status: text("status").notNull().default("draft"),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps,
  },
  (t) => [index("bulk_sms_drafts_tenant_idx").on(t.tenantId)],
);

export const agentUiPrefs = pgTable(
  "agent_ui_prefs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    actorKey: text("actor_key").notNull(),
    colorPreset: text("color_preset"),
    fontPreset: text("font_preset"),
    density: text("density"),
    columnLayout: jsonb("column_layout").$type<Record<string, string[]> | null>(),
    ...timestamps,
  },
  (t) => [index("agent_ui_prefs_actor_idx").on(t.tenantId, t.actorKey)],
);

export const calendarConnections = pgTable(
  "calendar_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    provider: text("provider").notNull().default("google"),
    connected: boolean("connected").notNull().default(false),
    displayEmail: text("display_email"),
    connectedAt: timestamp("connected_at", { withTimezone: true }),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    lastSyncDirection: text("last_sync_direction"),
    lastSyncStatus: text("last_sync_status"),
    ...timestamps,
  },
  (t) => [index("calendar_connections_tenant_idx").on(t.tenantId, t.provider)],
);

export const emailCampaigns = pgTable(
  "email_campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    name: text("name").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    audienceType: text("audience_type").notNull(),
    audienceValue: text("audience_value").notNull(),
    status: text("status").notNull().default("draft"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("email_campaigns_tenant_idx").on(t.tenantId)],
);

export const campaignSendLogs = pgTable(
  "campaign_send_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => emailCampaigns.id),
    recipientEmail: text("recipient_email"),
    recipientName: text("recipient_name"),
    outcome: text("outcome").notNull().default("would_send"),
    detail: text("detail"),
    loggedAt: timestamp("logged_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("campaign_send_logs_campaign_idx").on(t.tenantId, t.campaignId)],
);

export const smsSettings = pgTable("sms_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: tenantCol(),
  provider: text("provider").notNull().default("none"),
  connected: boolean("connected").notNull().default(false),
  displayFrom: text("display_from"),
  notes: text("notes"),
  lastConnectStatus: text("last_connect_status"),
  ...timestamps,
});

/** Agency-paid BYO trunk. Stub only — no Twilio purchase, no credentials stored. */
export const telephonySettings = pgTable(
  "telephony_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    provider: text("provider").notNull().default("none"),
    connected: boolean("connected").notNull().default(false),
    displayFrom: text("display_from"),
    accountLabel: text("account_label"),
    notes: text("notes"),
    lastConnectStatus: text("last_connect_status"),
    ...timestamps,
  },
  (t) => [uniqueIndex("telephony_settings_tenant_idx").on(t.tenantId)],
);

/** BYO e-sign stubs. No vendor keys stored. DocuSign / Dropbox Sign only in Settings. */
export const esignSettings = pgTable(
  "esign_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    provider: text("provider").notNull().default("none"),
    connected: boolean("connected").notNull().default(false),
    accountLabel: text("account_label"),
    notes: text("notes"),
    lastConnectStatus: text("last_connect_status"),
    ...timestamps,
  },
  (t) => [uniqueIndex("esign_settings_tenant_idx").on(t.tenantId)],
);

/** BYO connector catalog. Stub only — no OAuth, no vendor keys. */
export const integrationConnections = pgTable(
  "integration_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    category: text("category").notNull(),
    provider: text("provider").notNull(),
    connected: boolean("connected").notNull().default(false),
    displayLabel: text("display_label"),
    accountLabel: text("account_label"),
    notes: text("notes"),
    lastStatus: text("last_status"),
    lastConnectStatus: text("last_connect_status"),
    connectedAt: timestamp("connected_at", { withTimezone: true }),
    /** Social stub owner. Null = agency / unassigned inbound. */
    ownerUserId: uuid("owner_user_id"),
    ...timestamps,
  },
  (t) => [
    index("integration_connections_tenant_idx").on(t.tenantId, t.category),
    uniqueIndex("integration_connections_pair_uidx").on(t.tenantId, t.category, t.provider),
  ],
);

/** Per-user home layout: preset, hidden widgets, admin My book vs Agency-wide. */
export const userDashboardPrefs = pgTable(
  "user_dashboard_prefs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    userId: uuid("user_id").notNull(),
    preset: text("preset").notNull().default("my_production"),
    hiddenWidgets: jsonb("hidden_widgets").$type<string[]>().notNull().default([]),
    bookScope: text("book_scope").notNull().default("agency"),
    ...timestamps,
  },
  (t) => [uniqueIndex("user_dashboard_prefs_user_uidx").on(t.tenantId, t.userId)],
);

/** Admin-posted production contest. Standings are computed from the book. */
export const contests = pgTable(
  "contests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    title: text("title").notNull(),
    rules: text("rules").notNull(),
    metric: text("metric").notNull().default("premium"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    createdBy: uuid("created_by"),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("contests_tenant_idx").on(t.tenantId)],
);

/** Admin posts a referral or shares an inbound email for agents to claim. */
export const leadOffers = pgTable(
  "lead_offers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    title: text("title").notNull(),
    details: text("details").notNull(),
    kind: text("kind").notNull().default("referral"),
    language: text("language"),
    state: text("state"),
    leadId: uuid("lead_id"),
    postedBy: uuid("posted_by").notNull(),
    status: text("status").notNull().default("open"),
    awardedTo: uuid("awarded_to"),
    awardedAt: timestamp("awarded_at", { withTimezone: true }),
    emailFrom: text("email_from"),
    emailSubject: text("email_subject"),
    emailSnippet: text("email_snippet"),
    emailBody: text("email_body"),
    emailStubId: text("email_stub_id"),
    claimedBy: uuid("claimed_by"),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("lead_offers_tenant_idx").on(t.tenantId, t.status)],
);

export const leadOfferClaims = pgTable(
  "lead_offer_claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    offerId: uuid("offer_id")
      .notNull()
      .references(() => leadOffers.id),
    agentId: uuid("agent_id").notNull(),
    note: text("note"),
    relation: text("relation"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("lead_offer_claims_agent_uidx").on(t.tenantId, t.offerId, t.agentId)],
);

/**
 * Inbound / social lead offers. Separate from management lead_offers.
 * Social inbound create Lead + notify + award.
 */
export const socialLeadOffers = pgTable(
  "social_lead_offers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id),
    source: text("source").notNull(),
    platform: text("platform"),
    status: text("status").notNull().default("open"),
    ownerUserId: uuid("owner_user_id"),
    offeredToUserId: uuid("offered_to_user_id"),
    awardedByUserId: uuid("awarded_by_user_id"),
    awardedAt: timestamp("awarded_at", { withTimezone: true }),
    alertId: uuid("alert_id"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("social_lead_offers_tenant_status_idx").on(t.tenantId, t.status),
    uniqueIndex("social_lead_offers_lead_uidx").on(t.tenantId, t.leadId),
  ],
);

export const piiRevealLogs = pgTable(
  "pii_reveal_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    actorId: uuid("actor_id"),
    actorName: text("actor_name"),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    fieldKey: text("field_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("pii_reveal_logs_entity_idx").on(t.tenantId, t.entityType, t.entityId)],
);

export const signatureEnvelopes = pgTable(
  "signature_envelopes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id),
    provider: text("provider").notNull().default("docusign"),
    status: text("status").notNull().default("draft"),
    signerName: text("signer_name"),
    signerEmail: text("signer_email"),
    subject: text("subject"),
    lastProviderResult: text("last_provider_result"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("signature_envelopes_tenant_idx").on(t.tenantId)],
);

export type Lead = typeof leads.$inferSelect;
export type Deal = typeof deals.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type ContactAccount = typeof contactAccounts.$inferSelect;
export type Policy = typeof policies.$inferSelect;
export type Risk = typeof risks.$inferSelect;
export type DocumentFolder = typeof documentFolders.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type ExtractedFieldRow = typeof extractedFields.$inferSelect;
export type Carrier = typeof carriers.$inferSelect;
export type CarrierAppointment = typeof carrierAppointments.$inferSelect;
export type AppetiteRule = typeof appetiteRules.$inferSelect;
export type QuoteAttemptLog = typeof quoteAttemptLogs.$inferSelect;
export type Quote = typeof quotes.$inferSelect;
export type QuoteSheet = typeof quoteSheets.$inferSelect;
export type Alert = typeof alerts.$inferSelect;
export type DeskMessage = typeof deskMessages.$inferSelect;
export type MfaChallenge = typeof mfaChallenges.$inferSelect;
export type ReviewTask = typeof reviewTasks.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type CalendarInvite = typeof calendarInvites.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type Pipeline = typeof pipelines.$inferSelect;
export type PipelineStage = typeof pipelineStages.$inferSelect;
export type FormTemplate = typeof formTemplates.$inferSelect;
export type FormFill = typeof formFills.$inferSelect;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type EmailTrigger = typeof emailTriggers.$inferSelect;
export type EmailSendJob = typeof emailSendJobs.$inferSelect;
export type User = typeof users.$inferSelect;
export type AuthRecoveryToken = typeof authRecoveryTokens.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type MergeCandidate = typeof mergeCandidates.$inferSelect;
export type IssuedCertificate = typeof issuedCertificates.$inferSelect;
export type Business = Account;
export type Claim = typeof claims.$inferSelect;
export type Commission = typeof commissions.$inferSelect;
export type RecordAsk = typeof recordAsks.$inferSelect;
export type Driver = typeof drivers.$inferSelect;
export type Vehicle = typeof vehicles.$inferSelect;
export type PolicyTerm = typeof policyTerms.$inferSelect;
export type RenewalCompareLog = typeof renewalCompareLogs.$inferSelect;
export type PolicyWorkItem = typeof policyWorkItems.$inferSelect;
export type PolicyWorkFlag = typeof policyWorkFlags.$inferSelect;
export type PolicyWorkNote = typeof policyWorkNotes.$inferSelect;
export type DeskUser = User;
export type DeskColumnPref = typeof deskColumnPrefs.$inferSelect;
export type CommissionRateSetting = typeof commissionRateSettings.$inferSelect;
export type PolicyAutomation = typeof policyAutomations.$inferSelect;
export type PipelineStageRow = PipelineStage;
export type DeskAgent = typeof deskAgents.$inferSelect;
export type ColumnLayoutRow = typeof columnLayouts.$inferSelect;
export type EmailSendAccount = typeof emailSendAccounts.$inferSelect;
export type AgencyBrand = typeof agencyBrand.$inferSelect;
export type EmailSignature = typeof emailSignatures.$inferSelect;
export type GuidedAutomation = typeof guidedAutomations.$inferSelect;
export type BulkSmsDraft = typeof bulkSmsDrafts.$inferSelect;
export type AgentUiPref = typeof agentUiPrefs.$inferSelect;
export type CalendarConnection = typeof calendarConnections.$inferSelect;
export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type CampaignSendLog = typeof campaignSendLogs.$inferSelect;
export type SmsSettings = typeof smsSettings.$inferSelect;
export type TelephonySettings = typeof telephonySettings.$inferSelect;
export type EsignSettings = typeof esignSettings.$inferSelect;
export type SignatureEnvelope = typeof signatureEnvelopes.$inferSelect;
export type IntegrationConnection = typeof integrationConnections.$inferSelect;
export type LeadOfferRow = typeof leadOffers.$inferSelect;
export type SocialLeadOffer = typeof socialLeadOffers.$inferSelect;
export type PiiRevealLog = typeof piiRevealLogs.$inferSelect;
export type ExtractionJob = typeof extractionJobs.$inferSelect;
export type LineSubfilterOptionRow = typeof lineSubfilterOptions.$inferSelect;
export type GlobalListRow = typeof globalLists.$inferSelect;
export type UserDashboardPref = typeof userDashboardPrefs.$inferSelect;
export type Contest = typeof contests.$inferSelect;
export type LeadOffer = typeof leadOffers.$inferSelect;
export type LeadOfferClaim = typeof leadOfferClaims.$inferSelect;
export type Office = typeof offices.$inferSelect;
export type Territory = typeof territories.$inferSelect;
export type TerritoryOffice = typeof territoryOffices.$inferSelect;
export type UserOffice = typeof userOffices.$inferSelect;
export type UserTerritory = typeof userTerritories.$inferSelect;
