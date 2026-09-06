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
  source: "blank" | "agent" | "extracted" | "seed" | "javy" | "public" | "public-records" | "photo-ocr";
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

/** Hashed bearer tokens for /api/v1. Plaintext is shown once at issue. */
export const apiTokens = pgTable(
  "api_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    tokenHash: text("token_hash").notNull(),
    label: text("label"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("api_tokens_tenant_idx").on(t.tenantId),
    uniqueIndex("api_tokens_hash_idx").on(t.tokenHash),
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
    zohoId: text("zoho_id"),
    sourceId: text("source_id"),
    temperature: text("temperature"),
    firstContactAt: timestamp("first_contact_at", { withTimezone: true }),
    followUpTemplateId: uuid("follow_up_template_id"),
    nurtureUntil: timestamp("nurture_until", { withTimezone: true }),
    nurtureRemindVia: text("nurture_remind_via"),
    ...timestamps,
  },
  (t) => [
    index("leads_tenant_idx").on(t.tenantId),
    index("leads_owner_idx").on(t.tenantId, t.ownerId),
    index("leads_zoho_idx").on(t.tenantId, t.zohoId),
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
    preferredLanguage: text("preferred_language"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
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
    source: text("source"),
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
    source: text("source"),
    quotingLine: text("quoting_line"),
    quotingForm: text("quoting_form"),
    sheetApprovedAt: timestamp("sheet_approved_at", { withTimezone: true }),
    sheetApprovedBy: text("sheet_approved_by"),
    quotingUnlocked: boolean("quoting_unlocked").notNull().default(false),
    /** Pasted record/upload link for a video proposal. No Loom API. */
    videoProposalUrl: text("video_proposal_url"),
    /** In-desk e-sign stub only. Finish-line DocuSign stays parked. */
    esignStatus: text("esign_status").notNull().default("none"),
    esignRequestedAt: timestamp("esign_requested_at", { withTimezone: true }),
    esignSignedAt: timestamp("esign_signed_at", { withTimezone: true }),
    esignSignerName: text("esign_signer_name"),
    esignDocumentId: uuid("esign_document_id"),
    zohoId: text("zoho_id"),
    sourceId: text("source_id"),
    ...timestamps,
  },
  (t) => [
    index("deals_tenant_idx").on(t.tenantId),
    index("deals_stage_idx").on(t.tenantId, t.pipelineStage),
    index("deals_owner_idx").on(t.tenantId, t.ownerId),
    index("deals_zoho_idx").on(t.tenantId, t.zohoId),
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
    agencyCode: text("agency_code"),
    portalUsernameEnc: text("portal_username_enc"),
    portalUsernameIv: text("portal_username_iv"),
    portalUsernameHint: text("portal_username_hint"),
    portalPasswordEnc: text("portal_password_enc"),
    portalPasswordIv: text("portal_password_iv"),
    portalSecretsUpdatedAt: timestamp("portal_secrets_updated_at", { withTimezone: true }),
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
    zohoId: text("zoho_id"),
    sourceId: text("source_id"),
    ...timestamps,
  },
  (t) => [
    index("carriers_tenant_idx").on(t.tenantId),
    index("carriers_zoho_idx").on(t.tenantId, t.zohoId),
  ],
);

/** Admin-only reveal / readiness checks. Never stores the secret itself. */
export const carrierSecretRevealLogs = pgTable(
  "carrier_secret_reveal_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    carrierId: uuid("carrier_id")
      .notNull()
      .references(() => carriers.id),
    actorId: uuid("actor_id"),
    actorName: text("actor_name"),
    fieldKey: text("field_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("carrier_secret_reveal_logs_carrier_idx").on(t.tenantId, t.carrierId, t.createdAt)],
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
    gwp: numeric("gwp", { precision: 12, scale: 2 }),
    commission4: numeric("commission4", { precision: 12, scale: 2 }),
    premiumFrequency: text("premium_frequency"),
    numberOfInsured: integer("number_of_insured"),
    /** In-desk e-sign stub only. Finish-line DocuSign stays parked. */
    esignStatus: text("esign_status").notNull().default("none"),
    esignRequestedAt: timestamp("esign_requested_at", { withTimezone: true }),
    esignSignedAt: timestamp("esign_signed_at", { withTimezone: true }),
    esignSignerName: text("esign_signer_name"),
    esignDocumentId: uuid("esign_document_id"),
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

export const policyChangeLogs = pgTable(
  "policy_change_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    policyId: uuid("policy_id")
      .notNull()
      .references(() => policies.id, { onDelete: "cascade" }),
    changedBy: uuid("changed_by").references(() => users.id),
    changedByName: text("changed_by_name").notNull(),
    changedAt: timestamp("changed_at", { withTimezone: true }).defaultNow().notNull(),
    fieldKey: text("field_key").notNull(),
    fieldLabel: text("field_label").notNull(),
    beforeValue: text("before_value"),
    afterValue: text("after_value"),
    source: text("source").notNull().default("record_edit"),
    eventId: uuid("event_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("policy_change_logs_policy_idx").on(t.tenantId, t.policyId, t.changedAt),
    index("policy_change_logs_field_idx").on(t.tenantId, t.policyId, t.fieldKey),
  ],
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
    leadId: uuid("lead_id").references(() => leads.id),
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
    index("documents_tenant_lead_idx").on(t.tenantId, t.leadId),
    index("documents_tenant_policy_idx").on(t.tenantId, t.policyId),
    index("documents_tenant_folder_idx").on(t.tenantId, t.folderId),
    index("documents_tenant_library_idx").on(t.tenantId, t.library),
  ],
);

export const documentVersions = pgTable(
  "document_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    storagePath: text("storage_path").notNull(),
    docType: text("doc_type").notNull().default("other"),
    uploadedBy: uuid("uploaded_by").references(() => users.id),
    uploadedByName: text("uploaded_by_name"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("document_versions_doc_idx").on(t.tenantId, t.documentId, t.versionNumber),
    uniqueIndex("document_versions_doc_ver_uidx").on(t.tenantId, t.documentId, t.versionNumber),
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
    riskId: uuid("risk_id").references(() => risks.id),
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
    lostReason: text("lost_reason"),
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
    lostReason: text("lost_reason"),
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

/** Appetite-style correction log. Later fill prefers these over a repeated bad extract. Not ML. */
export const fillFeedbackLogs = pgTable(
  "fill_feedback_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    dealId: uuid("deal_id").references(() => deals.id),
    documentId: uuid("document_id").references(() => documents.id),
    quoteSheetId: uuid("quote_sheet_id").references(() => quoteSheets.id),
    docType: text("doc_type").notNull(),
    fieldKey: text("field_key").notNull(),
    wrongValue: text("wrong_value").notNull(),
    correctedValue: text("corrected_value").notNull(),
    carrierId: uuid("carrier_id").references(() => carriers.id),
    reason: text("reason").notNull().default("agent_edit"),
    line: text("line"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("fill_feedback_tenant_idx").on(t.tenantId, t.createdAt),
    index("fill_feedback_lookup_idx").on(t.tenantId, t.docType, t.fieldKey),
  ],
);

/** Agency memory for dec / wind mit / 4-point → master-sheet field mapping. */
export const fillLearningLogs = pgTable(
  "fill_learning_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    loggedAt: timestamp("logged_at", { withTimezone: true }).defaultNow().notNull(),
    dealId: uuid("deal_id").references(() => deals.id),
    documentId: uuid("document_id").references(() => documents.id),
    docType: text("doc_type").notNull(),
    fieldKey: text("field_key").notNull(),
    extractedValue: text("extracted_value").notNull().default(""),
    correctedValue: text("corrected_value").notNull(),
    correctedBy: text("corrected_by").notNull(),
    correctedByUserId: uuid("corrected_by_user_id").references(() => users.id),
    note: text("note"),
    carrierId: uuid("carrier_id").references(() => carriers.id),
    shopLine: text("shop_line").notNull().default("home"),
    ...timestamps,
  },
  (t) => [
    index("fill_learning_tenant_idx").on(t.tenantId),
    index("fill_learning_lookup_idx").on(t.tenantId, t.docType, t.fieldKey),
    index("fill_learning_deal_idx").on(t.tenantId, t.dealId),
  ],
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
    zohoId: text("zoho_id"),
    sourceId: text("source_id"),
    ...timestamps,
  },
  (t) => [
    index("activities_tenant_idx").on(t.tenantId),
    index("activities_when_idx").on(t.tenantId, t.startAt, t.dueAt),
    index("activities_status_idx").on(t.tenantId, t.status, t.kind),
    index("activities_account_idx").on(t.tenantId, t.accountId),
    index("activities_zoho_idx").on(t.tenantId, t.zohoId),
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
    durationSeconds: integer("duration_seconds"),
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
    color: text("color").notNull().default("blue"),
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
    subject: text("subject").notNull().default(""),
    body: text("body").notNull().default(""),
    locale: text("locale").notNull().default("en"),
    kind: text("kind"),
    subjectEn: text("subject_en"),
    bodyEn: text("body_en"),
    subjectEs: text("subject_es"),
    bodyEs: text("body_es"),
    isSeeded: boolean("is_seeded").notNull().default(false),
    isExampleCopy: boolean("is_example_copy").notNull().default(false),
    ...timestamps,
  },
  (t) => [uniqueIndex("email_templates_slug_uidx").on(t.tenantId, t.slug)],
);

export const emailTriggers = pgTable(
  "email_triggers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    kind: text("kind").notNull().default("custom"),
    name: text("name").notNull(),
    slug: text("slug"),
    delayDays: integer("delay_days").notNull().default(0),
    delayAmount: integer("delay_amount"),
    delayUnit: text("delay_unit"),
    eventKind: text("event_kind"),
    templateId: uuid("template_id"),
    hangOff: text("hang_off").notNull().default("won_date"),
    sendFromProvider: text("send_from_provider"),
    emailClient: boolean("email_client").notNull().default(false),
    createBrokerTask: boolean("create_broker_task").notNull().default(false),
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
    toEmail: text("to_email"),
    subject: text("subject"),
    body: text("body"),
    sendFromProvider: text("send_from_provider"),
    holdReason: text("hold_reason"),
    lastError: text("last_error"),
    attemptCount: integer("attempt_count").notNull().default(0),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    locale: text("locale"),
    ...timestamps,
  },
  (t) => [index("email_jobs_anchor_idx").on(t.tenantId, t.anchorKind, t.status)],
);

/** Desk outbound email/SMS intent. Drafts and holds only — no vendor send. */
export const commsOutboundJobs = pgTable(
  "comms_outbound_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    channel: text("channel").notNull(),
    status: text("status").notNull().default("queued"),
    toAddress: text("to_address"),
    fromAddress: text("from_address"),
    subject: text("subject"),
    body: text("body"),
    contactId: uuid("contact_id"),
    accountId: uuid("account_id"),
    dealId: uuid("deal_id"),
    policyId: uuid("policy_id"),
    leadId: uuid("lead_id"),
    activityId: uuid("activity_id"),
    holdReason: text("hold_reason"),
    vendor: text("vendor"),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("comms_outbound_tenant_idx").on(t.tenantId, t.status, t.channel)],
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
    additionalInsured: text("additional_insured"),
    specialWording: text("special_wording"),
    interestId: uuid("interest_id"),
    waiverOfSubrogation: boolean("waiver_of_subrogation").notNull().default(false),
    primaryNoncontributory: boolean("primary_noncontributory").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
);

export const claims = pgTable(
  "claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    policyId: uuid("policy_id").references(() => policies.id),
    contactId: uuid("contact_id").references(() => contacts.id),
    dateReported: timestamp("date_reported", { withTimezone: true }),
    dateOfLoss: timestamp("date_of_loss", { withTimezone: true }),
    causeType: text("cause_type"),
    description: text("description"),
    reportedHow: text("reported_how"),
    carrierClaimNumber: text("carrier_claim_number"),
    lossLocation: text("loss_location"),
    reporterName: text("reporter_name"),
    reporterPhone: text("reporter_phone"),
    producerId: uuid("producer_id"),
    producerNotifiedAt: timestamp("producer_notified_at", { withTimezone: true }),
    status: text("status").notNull().default("inquiry"),
    ...timestamps,
  },
  (t) => [
    index("claims_tenant_idx").on(t.tenantId),
    index("claims_contact_idx").on(t.tenantId, t.contactId),
    index("claims_status_idx").on(t.tenantId, t.status),
  ],
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
    insuranceType: text("insurance_type"),
    policyType: text("policy_type"),
    policySubType: text("policy_sub_type"),
    sellingAgency: text("selling_agency"),
    gwp: numeric("gwp", { precision: 12, scale: 2 }),
    commission4: numeric("commission4", { precision: 12, scale: 2 }),
    premiumFrequency: text("premium_frequency"),
    numberOfInsured: integer("number_of_insured"),
    paymentStatus: text("payment_status"),
    paymentReferenceBatch: text("payment_reference_batch"),
    initialCommission: numeric("initial_commission", { precision: 12, scale: 2 }),
    deferredCommission: numeric("deferred_commission", { precision: 12, scale: 2 }),
    monthlyCommission: numeric("monthly_commission", { precision: 12, scale: 2 }),
    totalAnnualCommission: numeric("total_annual_commission", { precision: 12, scale: 2 }),
    agencyAmount: numeric("agency_amount", { precision: 12, scale: 2 }),
    producerAmount: numeric("producer_amount", { precision: 12, scale: 2 }),
    paidByUserId: uuid("paid_by_user_id"),
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

/** Manual expected-vs-received catch. Not a carrier download. */
export const commissionReconciliations = pgTable(
  "commission_reconciliations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    commissionId: uuid("commission_id")
      .notNull()
      .references(() => commissions.id),
    policyId: uuid("policy_id").references(() => policies.id),
    agentId: uuid("agent_id"),
    expectedAmount: numeric("expected_amount", { precision: 12, scale: 2 }).notNull(),
    receivedAmount: numeric("received_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    variance: numeric("variance", { precision: 12, scale: 2 }).notNull().default("0"),
    status: text("status").notNull().default("pending"),
    note: text("note"),
    markedBy: uuid("marked_by"),
    markedAt: timestamp("marked_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("commission_recon_commission_uidx").on(t.tenantId, t.commissionId),
    index("commission_recon_tenant_idx").on(t.tenantId, t.status),
    index("commission_recon_agent_idx").on(t.tenantId, t.agentId),
  ],
);

export const deskColumnPrefs = pgTable(
  "desk_column_prefs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    userId: uuid("user_id"),
    tableKey: text("table_key").notNull(),
    columns: jsonb("columns").$type<string[]>().notNull().default([]),
    widths: jsonb("widths").$type<Record<string, number>>().notNull().default({}),
    sort: jsonb("sort").$type<{ key: string; dir: "asc" | "desc" } | null>(),
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
    visibility: text("visibility").notNull().default("both"),
    enabled: boolean("enabled").notNull().default(true),
    isExample: boolean("is_example").notNull().default(false),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps,
  },
  (t) => [index("guided_automations_tenant_idx").on(t.tenantId)],
);

/** One row per playbook fire. Tasks + in-app Alerts only — never a sent mail job. */
export const automationRuns = pgTable(
  "automation_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    automationId: uuid("automation_id")
      .notNull()
      .references(() => guidedAutomations.id),
    firedAt: timestamp("fired_at", { withTimezone: true }).defaultNow().notNull(),
    triggerKind: text("trigger_kind").notNull(),
    actionKind: text("action_kind").notNull(),
    createdTask: boolean("created_task").notNull().default(false),
    createdAlert: boolean("created_alert").notNull().default(false),
    activityId: uuid("activity_id"),
    alertId: uuid("alert_id"),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    audience: text("audience").notNull().default("both"),
    summary: text("summary").notNull().default(""),
    ...timestamps,
  },
  (t) => [
    index("automation_runs_tenant_idx").on(t.tenantId, t.firedAt),
    index("automation_runs_playbook_idx").on(t.tenantId, t.automationId),
  ],
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
    navLayout: jsonb("nav_layout").$type<{
      version: number;
      primaryOrder: string[];
      hiddenPrimaryIds?: string[];
      submenus: Record<string, string[]>;
    } | null>(),
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

/** Enable/disable catalog for the five insurance sequences (Task + email stubs). */
export const campaignSequences = pgTable(
  "campaign_sequences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    summary: text("summary").notNull(),
    audience: text("audience").notNull(),
    anchor: text("anchor").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    steps: jsonb("steps").$type<import("@/lib/campaign-sequences/types").SequenceStep[]>().notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("campaign_sequences_slug_uidx").on(t.tenantId, t.slug),
    index("campaign_sequences_tenant_idx").on(t.tenantId),
  ],
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

/** BYO connector catalog. Social rows may hold agency OAuth app credentials. */
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
    /** Agency-owned OAuth app. FitFirst never supplies Meta / X / LinkedIn keys. */
    clientId: text("client_id"),
    clientSecretEnc: text("client_secret_enc"),
    clientSecretIv: text("client_secret_iv"),
    oauthState: text("oauth_state"),
    connectMode: text("connect_mode"),
    lastOauthError: text("last_oauth_error"),
    accessTokenEnc: text("access_token_enc"),
    accessTokenIv: text("access_token_iv"),
    ...timestamps,
  },
  (t) => [
    index("integration_connections_tenant_idx").on(t.tenantId, t.category),
    uniqueIndex("integration_connections_pair_uidx").on(t.tenantId, t.category, t.provider),
  ],
);

/** Named Home boards. Tile order/span + hidden cards, scoped per user/tenant. */
export const userHomeLayouts = pgTable(
  "user_home_layouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    placements: jsonb("placements").$type<{ id: string; span: string }[]>().notNull().default([]),
    hiddenWidgets: jsonb("hidden_widgets").$type<string[]>().notNull().default([]),
    ...timestamps,
  },
  (t) => [index("user_home_layouts_user_idx").on(t.tenantId, t.userId)],
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
    customLayouts: jsonb("custom_layouts")
      .$type<
        {
          id: string;
          name: string;
          placements: { id: string; span: string; cols?: number; heightPx?: number }[];
          hiddenWidgets: string[];
        }[]
      >()
      .notNull()
      .default([]),
    activeLayoutId: text("active_layout_id"),
    resizeTiles: boolean("resize_tiles").notNull().default(false),
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

/** Admin-editable auto-route rules. Territory + written line + producer capacity. */
export const leadRoutingRules = pgTable(
  "lead_routing_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    name: text("name").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(10),
    territoryId: uuid("territory_id"),
    writtenLine: text("written_line"),
    maxOpenDeals: integer("max_open_deals").notNull().default(12),
    producerId: uuid("producer_id"),
    ...timestamps,
  },
  (t) => [index("lead_routing_rules_tenant_idx").on(t.tenantId, t.sortOrder)],
);

/** Why a lead was assigned or posted to the offer board. */
export const leadRoutingLogs = pgTable(
  "lead_routing_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id),
    ruleId: uuid("rule_id"),
    producerId: uuid("producer_id"),
    outcome: text("outcome").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("lead_routing_logs_lead_idx").on(t.tenantId, t.leadId)],
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

/**
 * Immutable E&O audit trail. Append-only in app + Postgres trigger.
 * Never store decrypted PII here — record ids and a short summary only.
 */
export const eoAuditLogs = pgTable(
  "eo_audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
    actorId: uuid("actor_id"),
    actorName: text("actor_name").notNull().default("Desk"),
    action: text("action").notNull(),
    summary: text("summary").notNull(),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    contactId: uuid("contact_id"),
    accountId: uuid("account_id"),
    policyId: uuid("policy_id"),
    dealId: uuid("deal_id"),
    leadId: uuid("lead_id"),
    documentId: uuid("document_id"),
    activityId: uuid("activity_id"),
    meta: jsonb("meta").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("eo_audit_logs_when_idx").on(t.tenantId, t.occurredAt),
    index("eo_audit_logs_action_idx").on(t.tenantId, t.action),
    index("eo_audit_logs_contact_idx").on(t.tenantId, t.contactId),
    index("eo_audit_logs_policy_idx").on(t.tenantId, t.policyId),
    index("eo_audit_logs_deal_idx").on(t.tenantId, t.dealId),
  ],
);

export const signatureEnvelopes = pgTable(
  "signature_envelopes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id),
    dealId: uuid("deal_id"),
    policyId: uuid("policy_id"),
    provider: text("provider").notNull().default("docusign"),
    mode: text("mode").notNull().default("vendor"),
    status: text("status").notNull().default("draft"),
    signerName: text("signer_name"),
    signerEmail: text("signer_email"),
    subject: text("subject"),
    lastProviderResult: text("last_provider_result"),
    signatureKind: text("signature_kind"),
    signatureData: text("signature_data"),
    signedByRole: text("signed_by_role"),
    publicToken: text("public_token"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("signature_envelopes_tenant_idx").on(t.tenantId),
    index("signature_envelopes_deal_idx").on(t.tenantId, t.dealId),
    index("signature_envelopes_policy_idx").on(t.tenantId, t.policyId),
    uniqueIndex("signature_envelopes_token_uidx").on(t.publicToken),
  ],
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
export type PolicyChangeLog = typeof policyChangeLogs.$inferSelect;
export type DocumentVersion = typeof documentVersions.$inferSelect;
export type ExtractedFieldRow = typeof extractedFields.$inferSelect;
export type Carrier = typeof carriers.$inferSelect;
export type CarrierSecretRevealLog = typeof carrierSecretRevealLogs.$inferSelect;
export type CarrierAppointment = typeof carrierAppointments.$inferSelect;
export type AppetiteRule = typeof appetiteRules.$inferSelect;
export type QuoteAttemptLog = typeof quoteAttemptLogs.$inferSelect;
export type FillLearningLog = typeof fillLearningLogs.$inferSelect;
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
export type CommsOutboundJob = typeof commsOutboundJobs.$inferSelect;
export type User = typeof users.$inferSelect;
export type ApiToken = typeof apiTokens.$inferSelect;
export type AuthRecoveryToken = typeof authRecoveryTokens.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type MergeCandidate = typeof mergeCandidates.$inferSelect;
export type IssuedCertificate = typeof issuedCertificates.$inferSelect;
export type Business = Account;
export type Claim = typeof claims.$inferSelect;
export type Commission = typeof commissions.$inferSelect;
export type CommissionReconciliation = typeof commissionReconciliations.$inferSelect;
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
export type AutomationRun = typeof automationRuns.$inferSelect;
export type BulkSmsDraft = typeof bulkSmsDrafts.$inferSelect;
export type AgentUiPref = typeof agentUiPrefs.$inferSelect;
export type CalendarConnection = typeof calendarConnections.$inferSelect;
export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type CampaignSendLog = typeof campaignSendLogs.$inferSelect;
export type CampaignSequence = typeof campaignSequences.$inferSelect;
export type SmsSettings = typeof smsSettings.$inferSelect;
export type TelephonySettings = typeof telephonySettings.$inferSelect;
export type EsignSettings = typeof esignSettings.$inferSelect;
export type SignatureEnvelope = typeof signatureEnvelopes.$inferSelect;
export type IntegrationConnection = typeof integrationConnections.$inferSelect;
export type LeadOfferRow = typeof leadOffers.$inferSelect;
export type SocialLeadOffer = typeof socialLeadOffers.$inferSelect;
export type PiiRevealLog = typeof piiRevealLogs.$inferSelect;
export type EoAuditLog = typeof eoAuditLogs.$inferSelect;
export type ExtractionJob = typeof extractionJobs.$inferSelect;
export type FillFeedbackLog = typeof fillFeedbackLogs.$inferSelect;
export type LineSubfilterOptionRow = typeof lineSubfilterOptions.$inferSelect;
export type GlobalListRow = typeof globalLists.$inferSelect;
export type UserDashboardPref = typeof userDashboardPrefs.$inferSelect;
export type UserHomeLayout = typeof userHomeLayouts.$inferSelect;
export type Contest = typeof contests.$inferSelect;
export type LeadOffer = typeof leadOffers.$inferSelect;
export type LeadOfferClaim = typeof leadOfferClaims.$inferSelect;
export type Office = typeof offices.$inferSelect;
export type Territory = typeof territories.$inferSelect;
export type TerritoryOffice = typeof territoryOffices.$inferSelect;
export type UserOffice = typeof userOffices.$inferSelect;
export type UserTerritory = typeof userTerritories.$inferSelect;
export type LeadRoutingRule = typeof leadRoutingRules.$inferSelect;
export type LeadRoutingLog = typeof leadRoutingLogs.$inferSelect;

export const portalTokens = pgTable(
  "portal_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    token: text("token").notNull(),
    label: text("label").notNull(),
    kind: text("kind").notNull().default("personal"),
    contactId: uuid("contact_id").references(() => contacts.id),
    accountId: uuid("account_id").references(() => accounts.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("portal_tokens_token_uidx").on(t.tenantId, t.token),
    index("portal_tokens_contact_idx").on(t.tenantId, t.contactId),
    index("portal_tokens_account_idx").on(t.tenantId, t.accountId),
  ],
);

export const portalRequests = pgTable(
  "portal_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    tokenId: uuid("token_id").references(() => portalTokens.id),
    contactId: uuid("contact_id").references(() => contacts.id),
    accountId: uuid("account_id").references(() => accounts.id),
    policyId: uuid("policy_id").references(() => policies.id),
    kind: text("kind").notNull(),
    status: text("status").notNull().default("open"),
    summary: text("summary").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    workItemId: uuid("work_item_id"),
    reusedCertificateId: uuid("reused_certificate_id"),
    ...timestamps,
  },
  (t) => [
    index("portal_requests_tenant_idx").on(t.tenantId, t.status),
    index("portal_requests_policy_idx").on(t.tenantId, t.policyId),
  ],
);

/** Admin Import / Export hub jobs. Never used to delete book rows. */
export const importExportJobs = pgTable(
  "import_export_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    actorId: uuid("actor_id"),
    actorName: text("actor_name").notNull(),
    actorEmail: text("actor_email"),
    entity: text("entity").notNull(),
    action: text("action").notNull(),
    status: text("status").notNull().default("ok"),
    filename: text("filename"),
    rowsOk: integer("rows_ok").notNull().default(0),
    rowsError: integer("rows_error").notNull().default(0),
    rowsCreate: integer("rows_create").notNull().default(0),
    rowsUpdate: integer("rows_update").notNull().default(0),
    rowsSkip: integer("rows_skip").notNull().default(0),
    errorCsv: text("error_csv"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("import_export_jobs_tenant_idx").on(t.tenantId, t.createdAt),
    index("import_export_jobs_entity_idx").on(t.tenantId, t.entity, t.createdAt),
  ],
);

export type PortalToken = typeof portalTokens.$inferSelect;
export type PortalRequest = typeof portalRequests.$inferSelect;
export type ImportExportJob = typeof importExportJobs.$inferSelect;

/** Endorsement / cancel / non-renew request pipeline. Filing updates the Policy. */
export const policyServiceRequests = pgTable(
  "policy_service_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    policyId: uuid("policy_id")
      .notNull()
      .references(() => policies.id),
    kind: text("kind").notNull(),
    status: text("status").notNull().default("requested"),
    reason: text("reason").notNull(),
    summary: text("summary"),
    effectiveDate: timestamp("effective_date", { withTimezone: true }).notNull(),
    coverageA: integer("coverage_a"),
    premium: numeric("premium", { precision: 12, scale: 2 }),
    requestedBy: uuid("requested_by"),
    requestedByName: text("requested_by_name"),
    filedEventId: uuid("filed_event_id"),
    filedAt: timestamp("filed_at", { withTimezone: true }),
    workDesk: text("work_desk").notNull().default("csr"),
    ...timestamps,
  },
  (t) => [
    index("policy_service_requests_tenant_idx").on(t.tenantId, t.status),
    index("policy_service_requests_policy_idx").on(t.tenantId, t.policyId),
    index("policy_service_requests_work_desk_idx").on(t.tenantId, t.workDesk),
  ],
);

/** Desk COI request queue. Issue still writes issued_certificates (stub, not ACORD). */
export const certificateRequests = pgTable(
  "certificate_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),
    policyId: uuid("policy_id").references(() => policies.id),
    holderName: text("holder_name").notNull(),
    holderAddress: text("holder_address").notNull(),
    jobLocation: text("job_location"),
    status: text("status").notNull().default("requested"),
    notes: text("notes"),
    issuedCertificateId: uuid("issued_certificate_id"),
    requestedBy: uuid("requested_by"),
    requestedByName: text("requested_by_name"),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    interestId: uuid("interest_id"),
    additionalInsured: text("additional_insured"),
    specialWording: text("special_wording"),
    waiverOfSubrogation: boolean("waiver_of_subrogation").notNull().default(false),
    primaryNoncontributory: boolean("primary_noncontributory").notNull().default(false),
    holderContactId: uuid("holder_contact_id"),
    ...timestamps,
  },
  (t) => [
    index("certificate_requests_tenant_idx").on(t.tenantId, t.status),
    index("certificate_requests_account_idx").on(t.tenantId, t.accountId),
    index("certificate_requests_interest_idx").on(t.tenantId, t.interestId),
    index("certificate_requests_holder_contact_idx").on(t.tenantId, t.holderContactId),
  ],
);

/** IVANS / AL3 plug. Empty importer — never invents carrier fees. */
export const carrierDownloadConnections = pgTable(
  "carrier_download_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    provider: text("provider").notNull(),
    status: text("status").notNull().default("not_connected"),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    lastError: text("last_error"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [uniqueIndex("carrier_download_connections_uidx").on(t.tenantId, t.provider)],
);

/** Mortgagee / additional interest / loss payee on a personal-lines Policy. */
export const policyAdditionalInterests = pgTable(
  "policy_additional_interests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    policyId: uuid("policy_id")
      .notNull()
      .references(() => policies.id),
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    zip: text("zip"),
    loanNumber: text("loan_number"),
    clause: text("clause"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("policy_additional_interests_tenant_idx").on(t.tenantId, t.policyId),
    index("policy_additional_interests_kind_idx").on(t.tenantId, t.kind),
  ],
);

/** Complete / incomplete servicing items on a Policy (renewal docs, inspection, mortgagee, ID cards). */
export const policyServicingChecks = pgTable(
  "policy_servicing_checks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    policyId: uuid("policy_id")
      .notNull()
      .references(() => policies.id),
    itemKey: text("item_key").notNull(),
    status: text("status").notNull().default("incomplete"),
    notes: text("notes"),
    taskId: uuid("task_id"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedBy: uuid("completed_by"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("policy_servicing_checks_uidx").on(t.tenantId, t.policyId, t.itemKey),
    index("policy_servicing_checks_policy_idx").on(t.tenantId, t.policyId),
  ],
);

/** Durable activity log for endorsement / cancel / non-renew requests. */
export const policyServiceRequestEvents = pgTable(
  "policy_service_request_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => policyServiceRequests.id),
    policyId: uuid("policy_id")
      .notNull()
      .references(() => policies.id),
    action: text("action").notNull(),
    body: text("body").notNull(),
    actorId: uuid("actor_id"),
    actorName: text("actor_name"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("policy_service_request_events_request_idx").on(t.tenantId, t.requestId),
    index("policy_service_request_events_policy_idx").on(t.tenantId, t.policyId),
  ],
);

/** Claim follow-up diary. Completing a row does not file FNOL or change claim status. */
export const claimDiary = pgTable(
  "claim_diary",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    claimId: uuid("claim_id")
      .notNull()
      .references(() => claims.id),
    policyId: uuid("policy_id").references(() => policies.id),
    kind: text("kind").notNull(),
    status: text("status").notNull().default("open"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    body: text("body").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("claim_diary_tenant_idx").on(t.tenantId, t.status),
    index("claim_diary_claim_idx").on(t.tenantId, t.claimId),
    index("claim_diary_policy_idx").on(t.tenantId, t.policyId),
  ],
);

/** Endorsement wording stub. Ready / withdraw does not file the Policy. */
export const endorsementDrafts = pgTable(
  "endorsement_drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    policyId: uuid("policy_id")
      .notNull()
      .references(() => policies.id),
    serviceRequestId: uuid("service_request_id").references(() => policyServiceRequests.id),
    status: text("status").notNull().default("drafted"),
    formCode: text("form_code").notNull(),
    wording: text("wording").notNull(),
    effectiveOn: timestamp("effective_on", { withTimezone: true }).notNull(),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("endorsement_drafts_tenant_idx").on(t.tenantId, t.status),
    index("endorsement_drafts_policy_idx").on(t.tenantId, t.policyId),
    index("endorsement_drafts_request_idx").on(t.tenantId, t.serviceRequestId),
  ],
);

/** Desk cancel / non-renew / reinstatement notice diary. Does not file the Policy. */
export const policyNotices = pgTable(
  "policy_notices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    policyId: uuid("policy_id")
      .notNull()
      .references(() => policies.id),
    kind: text("kind").notNull(),
    status: text("status").notNull().default("drafted"),
    reason: text("reason").notNull(),
    mailedAt: timestamp("mailed_at", { withTimezone: true }),
    effectiveOn: timestamp("effective_on", { withTimezone: true }).notNull(),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("policy_notices_tenant_idx").on(t.tenantId, t.status),
    index("policy_notices_policy_idx").on(t.tenantId, t.policyId),
  ],
);

/** Named COI holder contact. Add / edit / archive does not issue a stub. */
export const certificateHolderContacts = pgTable(
  "certificate_holder_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    accountId: uuid("account_id").references(() => accounts.id),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    zip: text("zip"),
    notes: text("notes"),
    status: text("status").notNull().default("active"),
    ...timestamps,
  },
  (t) => [
    index("certificate_holder_contacts_tenant_idx").on(t.tenantId, t.status),
    index("certificate_holder_contacts_account_idx").on(t.tenantId, t.accountId),
    index("certificate_holder_contacts_name_idx").on(t.tenantId, t.name),
  ],
);

/** Renewal pipeline queue stub. Stage moves do not bind or rewrite the Policy. */
export const renewalQueue = pgTable(
  "renewal_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    policyId: uuid("policy_id")
      .notNull()
      .references(() => policies.id),
    stage: text("stage").notNull().default("upcoming"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("renewal_queue_policy_uidx").on(t.tenantId, t.policyId),
    index("renewal_queue_tenant_idx").on(t.tenantId, t.stage),
    index("renewal_queue_policy_idx").on(t.tenantId, t.policyId),
  ],
);

/** Inspection diary. Completing or waiving does not file an endorsement. */
export const policyInspections = pgTable(
  "policy_inspections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    policyId: uuid("policy_id")
      .notNull()
      .references(() => policies.id),
    kind: text("kind").notNull(),
    status: text("status").notNull().default("requested"),
    vendor: text("vendor"),
    scheduledOn: timestamp("scheduled_on", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("policy_inspections_tenant_idx").on(t.tenantId, t.status),
    index("policy_inspections_policy_idx").on(t.tenantId, t.policyId),
  ],
);

/** Installment diary. Receiving does not collect money and does not change Policy status. */
export const policyInstallments = pgTable(
  "policy_installments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    policyId: uuid("policy_id")
      .notNull()
      .references(() => policies.id),
    billType: text("bill_type").notNull().default("agency_bill"),
    status: text("status").notNull().default("scheduled"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    dueOn: timestamp("due_on", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("policy_installments_tenant_idx").on(t.tenantId, t.status),
    index("policy_installments_policy_idx").on(t.tenantId, t.policyId),
  ],
);

export type PolicyServiceRequest = typeof policyServiceRequests.$inferSelect;
export type CertificateRequest = typeof certificateRequests.$inferSelect;
export type CarrierDownloadConnection = typeof carrierDownloadConnections.$inferSelect;
export type PolicyAdditionalInterest = typeof policyAdditionalInterests.$inferSelect;
export type PolicyServicingCheck = typeof policyServicingChecks.$inferSelect;
export type PolicyServiceRequestEvent = typeof policyServiceRequestEvents.$inferSelect;
export type PolicyNotice = typeof policyNotices.$inferSelect;
export type ClaimDiaryEntry = typeof claimDiary.$inferSelect;
export type EndorsementDraft = typeof endorsementDrafts.$inferSelect;
export type CertificateHolderContact = typeof certificateHolderContacts.$inferSelect;
export type RenewalQueueRow = typeof renewalQueue.$inferSelect;
export type PolicyInspection = typeof policyInspections.$inferSelect;
export type PolicyInstallment = typeof policyInstallments.$inferSelect;

/** Developer Hub — custom functions. Body is an allowlisted JSON transform, not host JS. */
export const developerFunctions = pgTable(
  "developer_functions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    name: text("name").notNull(),
    apiName: text("api_name").notNull(),
    description: text("description"),
    language: text("language").notNull().default("typescript"),
    category: text("category").notNull().default("standalone"),
    body: text("body").notNull().default(""),
    exposeAsRest: boolean("expose_as_rest").notNull().default(false),
    exposeAsOauth: boolean("expose_as_oauth").notNull().default(false),
    connectionLinkName: text("connection_link_name"),
    createdBy: uuid("created_by"),
    ...timestamps,
  },
  (t) => [
    index("developer_functions_tenant_idx").on(t.tenantId),
    uniqueIndex("developer_functions_api_name_uidx").on(t.tenantId, t.apiName),
  ],
);

export const developerFunctionExecutions = pgTable(
  "developer_function_executions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    functionId: uuid("function_id")
      .notNull()
      .references(() => developerFunctions.id),
    source: text("source").notNull().default("test"),
    status: text("status").notNull().default("ok"),
    input: jsonb("input").$type<unknown>().notNull().default({}),
    output: jsonb("output").$type<unknown>().notNull().default({}),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("developer_function_executions_fn_idx").on(t.tenantId, t.functionId, t.createdAt),
  ],
);

/** Org-level keys for Developer Hub REST stubs. Separate from user /api/v1 api_tokens. */
export const developerOrgApiKeys = pgTable(
  "developer_org_api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    name: text("name").notNull(),
    prefix: text("prefix").notNull(),
    secretHash: text("secret_hash").notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("developer_org_api_keys_tenant_idx").on(t.tenantId),
    uniqueIndex("developer_org_api_keys_hash_uidx").on(t.secretHash),
  ],
);

export const developerWebhooks = pgTable(
  "developer_webhooks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    name: text("name").notNull(),
    event: text("event").notNull(),
    targetUrl: text("target_url").notNull(),
    secret: text("secret"),
    enabled: boolean("enabled").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("developer_webhooks_tenant_idx").on(t.tenantId, t.event)],
);

export const developerWebhookDeliveries = pgTable(
  "developer_webhook_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    webhookId: uuid("webhook_id")
      .notNull()
      .references(() => developerWebhooks.id),
    event: text("event").notNull(),
    payload: jsonb("payload").$type<unknown>().notNull().default({}),
    status: text("status").notNull().default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    attemptedAt: timestamp("attempted_at", { withTimezone: true }),
  },
  (t) => [index("developer_webhook_deliveries_hook_idx").on(t.tenantId, t.webhookId, t.createdAt)],
);

export const developerInboundHooks = pgTable(
  "developer_inbound_hooks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("developer_inbound_hooks_slug_uidx").on(t.tenantId, t.slug)],
);

export const developerInboundPayloads = pgTable(
  "developer_inbound_payloads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    hookId: uuid("hook_id").references(() => developerInboundHooks.id),
    slug: text("slug").notNull(),
    payload: jsonb("payload").$type<unknown>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("developer_inbound_payloads_slug_idx").on(t.tenantId, t.slug, t.createdAt)],
);

export const developerConnections = pgTable(
  "developer_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    name: text("name").notNull(),
    linkName: text("link_name").notNull(),
    kind: text("kind").notNull(),
    status: text("status").notNull().default("needs_credentials"),
    clientId: text("client_id"),
    clientSecretEnc: text("client_secret_enc"),
    clientSecretIv: text("client_secret_iv"),
    notes: text("notes"),
    createdBy: uuid("created_by"),
    ...timestamps,
  },
  (t) => [
    index("developer_connections_tenant_idx").on(t.tenantId),
    uniqueIndex("developer_connections_link_uidx").on(t.tenantId, t.linkName),
  ],
);

/** Manual, user-run macros. Never scheduled. Developer Hub → Macros. */
export const deskMacros = pgTable(
  "desk_macros",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    module: text("module").notNull(),
    modules: jsonb("modules")
      .$type<import("@/lib/developer-hub/types").DevHubModule[]>()
      .notNull()
      .default([]),
    kind: text("kind").notNull().default("standard"),
    name: text("name").notNull(),
    description: text("description"),
    enabled: boolean("enabled").notNull().default(true),
    actions: jsonb("actions")
      .$type<import("@/lib/developer-hub/types").MacroActions>()
      .notNull(),
    ...timestamps,
  },
  (t) => [index("desk_macros_module_idx").on(t.tenantId, t.module)],
);

export const deskMacroRuns = pgTable(
  "desk_macro_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    macroId: uuid("macro_id")
      .notNull()
      .references(() => deskMacros.id),
    module: text("module").notNull(),
    recordIds: jsonb("record_ids").$type<string[]>().notNull(),
    summary: text("summary").notNull(),
    ranBy: uuid("ran_by"),
    ranAt: timestamp("ran_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("desk_macro_runs_macro_idx").on(t.tenantId, t.macroId)],
);

/** Links & Buttons. Placement: list / detail / mass_action. */
export const deskCustomButtons = pgTable(
  "desk_custom_buttons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    module: text("module").notNull(),
    placement: text("placement").notNull(),
    label: text("label").notNull(),
    visibilityProfiles: jsonb("visibility_profiles").$type<string[]>().notNull().default(["admin", "agent"]),
    actionKind: text("action_kind").notNull(),
    functionApiName: text("function_api_name"),
    urlTemplate: text("url_template"),
    widgetId: uuid("widget_id"),
    enabled: boolean("enabled").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("desk_custom_buttons_module_idx").on(t.tenantId, t.module, t.placement)],
);

export const deskClientScripts = pgTable(
  "desk_client_scripts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    module: text("module").notNull(),
    page: text("page").notNull(),
    event: text("event").notNull(),
    fieldName: text("field_name"),
    name: text("name").notNull(),
    body: text("body").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("desk_client_scripts_page_idx").on(t.tenantId, t.module, t.page)],
);

export const deskWidgets = pgTable(
  "desk_widgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    hosting: text("hosting").notNull(),
    externalUrl: text("external_url"),
    zipMeta: jsonb("zip_meta").$type<{
      fileName?: string;
      byteSize?: number;
      uploadedAt?: string;
    } | null>(),
    enabled: boolean("enabled").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("desk_widgets_type_idx").on(t.tenantId, t.type)],
);

export type DeveloperFunction = typeof developerFunctions.$inferSelect;
export type DeveloperFunctionExecution = typeof developerFunctionExecutions.$inferSelect;
export type DeveloperOrgApiKey = typeof developerOrgApiKeys.$inferSelect;
export type DeveloperWebhook = typeof developerWebhooks.$inferSelect;
export type DeveloperWebhookDelivery = typeof developerWebhookDeliveries.$inferSelect;
export type DeveloperInboundHook = typeof developerInboundHooks.$inferSelect;
export type DeveloperInboundPayload = typeof developerInboundPayloads.$inferSelect;
export type DeveloperConnection = typeof developerConnections.$inferSelect;
export type DeskMacro = typeof deskMacros.$inferSelect;
export type DeskMacroRun = typeof deskMacroRuns.$inferSelect;
export type DeskCustomButton = typeof deskCustomButtons.$inferSelect;
export type DeskClientScript = typeof deskClientScripts.$inferSelect;
export type DeskWidget = typeof deskWidgets.$inferSelect;

/** Status-triggered follow-up playbooks for the Leads work queue. */
export const leadFollowUpTemplates = pgTable(
  "lead_follow_up_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    name: text("name").notNull(),
    triggerStatus: text("trigger_status").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("lead_follow_up_templates_tenant_idx").on(t.tenantId, t.triggerStatus)],
);

export const leadFollowUpSteps = pgTable(
  "lead_follow_up_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => leadFollowUpTemplates.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    method: text("method").notNull(),
    delayAmount: integer("delay_amount").notNull(),
    delayUnit: text("delay_unit").notNull(),
    message: text("message"),
    remindVia: text("remind_via").notNull().default("task"),
    ...timestamps,
  },
  (t) => [index("lead_follow_up_steps_template_idx").on(t.templateId, t.sortOrder)],
);

export const leadFollowUpQueue = pgTable(
  "lead_follow_up_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantCol(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    templateId: uuid("template_id").references(() => leadFollowUpTemplates.id, { onDelete: "set null" }),
    stepId: uuid("step_id").references(() => leadFollowUpSteps.id, { onDelete: "set null" }),
    method: text("method").notNull(),
    message: text("message"),
    remindVia: text("remind_via").notNull().default("task"),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("queued"),
    activityId: uuid("activity_id"),
    alertId: uuid("alert_id"),
    outboundJobId: uuid("outbound_job_id"),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("lead_follow_up_queue_due_idx").on(t.tenantId, t.status, t.dueAt),
    index("lead_follow_up_queue_lead_idx").on(t.leadId, t.status),
  ],
);

export type LeadFollowUpTemplate = typeof leadFollowUpTemplates.$inferSelect;
export type LeadFollowUpStep = typeof leadFollowUpSteps.$inferSelect;
export type LeadFollowUpQueueRow = typeof leadFollowUpQueue.$inferSelect;
