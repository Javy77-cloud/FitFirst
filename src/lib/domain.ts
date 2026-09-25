import { formatDisplayDate } from "@/lib/dates/display-format";
export const DEFAULT_TENANT_ID =
  process.env.TENANT_ID ?? "11111111-1111-4111-8111-111111111111";

export const CONFIDENCE_THRESHOLD = 0.8;

export const LINES = [
  "HO",
  "AUTO",
  "FLOOD",
  "UMBRELLA",
  "GL",
  "BOP",
  "LIFE",
  "HEALTH",
  "RV",
  "WC",
] as const;
export type LineOfBusiness = (typeof LINES)[number];

export const DEAL_STAGES = [
  "gathering",
  "markets",
  "quote_review",
  "shopping",
  "quoting",
  "comparing",
  "quote_sent",
  "bound",
  "policy_issued",
  "pending_inspection",
  "closed_won",
  "lost",
  "closed_lost",
  "archive",
] as const;
export type DealStage = (typeof DEAL_STAGES)[number];

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "converted",
  "lost",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const QUOTE_RESULTS = [
  "quoted",
  "declined",
  "floor_only",
  "takeout_only",
  "portal_closed",
] as const;
export type QuoteAttemptResult = (typeof QUOTE_RESULTS)[number];

/** Internal appetite capture after carrier paste. `maybe` does not feed match priors. */
export const APPETITE_CAPTURE_RESULTS = ["quoted", "declined", "maybe"] as const;
export type AppetiteCaptureResult = (typeof APPETITE_CAPTURE_RESULTS)[number];

export const APPETITE_CAPTURE_LABELS: Record<AppetiteCaptureResult, string> = {
  quoted: "Quoted",
  declined: "Declined",
  maybe: "Maybe",
};

/** Picklist on lost / declined quotes. Rule-based reporting — not free text. */
export const LOST_BUSINESS_REASONS = [
  "price",
  "deductible",
  "coverage_gap",
  "carrier_declined",
  "uw_roof",
  "uw_construction",
  "incumbent_stayed",
  "bound_elsewhere",
  "no_response",
  "timing",
  "credit_uw",
  "other",
] as const;
export type LostBusinessReason = (typeof LOST_BUSINESS_REASONS)[number];

export const LOST_BUSINESS_REASON_LABELS: Record<LostBusinessReason, string> = {
  price: "Premium too high",
  deductible: "Deductible too high",
  coverage_gap: "Coverage gap (flood, wind, etc.)",
  carrier_declined: "Carrier declined",
  uw_roof: "Underwriting — roof",
  uw_construction: "Underwriting — construction",
  incumbent_stayed: "Stayed with incumbent",
  bound_elsewhere: "Bound with competitor",
  no_response: "No response",
  timing: "Timing / not ready",
  credit_uw: "Credit / underwriting",
  other: "Other",
};

export function isLostBusinessReason(value: string | null | undefined): value is LostBusinessReason {
  return Boolean(value && (LOST_BUSINESS_REASONS as readonly string[]).includes(value));
}

export const FIT_BANDS = ["green", "yellow", "red"] as const;
export type FitBand = (typeof FIT_BANDS)[number];

export const DOC_TYPES = [
  "dec",
  "wind_mit",
  "four_point",
  "inspection",
  "photo",
  "floor_plan",
  "report",
  "current_policy",
  "permits",
  "hand_notes",
  "signed_app",
  "quote",
  "quote_pdf",
  "proposal_pdf",
  "policy_dec",
  "policy_complete",
  "policy_id",
  "acord",
  "flyer",
  "marketing",
  "appetite_guide",
  "cancellation",
  "aor",
  "agency_form",
  "proposal",
  "other",
] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  dec: "Dec pages",
  wind_mit: "Wind mit",
  four_point: "Four-Point",
  inspection: "Inspection",
  photo: "Photo",
  floor_plan: "Floor plan",
  report: "Reports",
  current_policy: "Current policy",
  permits: "Permits",
  hand_notes: "Hand notes",
  signed_app: "Signed app",
  quote: "Quotes",
  quote_pdf: "Quote PDF",
  proposal_pdf: "Branded proposal",
  policy_dec: "Issued declaration page",
  policy_complete: "Complete policy",
  policy_id: "ID card",
  acord: "ACORD form",
  flyer: "Carrier flyer",
  marketing: "Marketing",
  appetite_guide: "Appetite guide",
  cancellation: "Cancellation",
  aor: "Agent of record",
  agency_form: "Agency form",
  proposal: "Branded proposal",
  other: "Other",
};

export const SHARED_LIBRARY_DOC_TYPES = [
  "marketing",
  "appetite_guide",
  "flyer",
  "photo",
  "other",
] as const;

export const FORMS_LIBRARY_DOC_TYPES = [
  "acord",
  "cancellation",
  "aor",
  "agency_form",
  "signed_app",
  "other",
] as const;

/** Types an agent picks when attaching files to a Deal. */
export const DEAL_UPLOAD_DOC_TYPES = [
  "four_point",
  "wind_mit",
  "current_policy",
  "quote",
  "permits",
  "hand_notes",
  "dec",
  "signed_app",
  "inspection",
  "photo",
  "other",
] as const;
export type DealUploadDocType = (typeof DEAL_UPLOAD_DOC_TYPES)[number];

export const DOC_SLOTS = [
  "source_doc",
  "quote_pdf",
  "signed_app",
  "policy_file",
  "library_file",
  "proposal",
] as const;
export type DocSlot = (typeof DOC_SLOTS)[number];

export const SOURCE_DOC_TYPES = [
  "dec",
  "wind_mit",
  "four_point",
  "inspection",
  "photo",
  "floor_plan",
  "report",
  "current_policy",
  "permits",
  "hand_notes",
] as const;
export const POLICY_FILE_TYPES = ["policy_dec", "policy_complete", "policy_id"] as const;

export const POLICY_STATUSES = [
  "unpublished",
  "bound",
  "pending",
  "active",
  "lapsed",
  "cancelled",
  "non_renewed",
  "expired",
] as const;
export type PolicyStatus = (typeof POLICY_STATUSES)[number];

/** In-force for client status and the active/bound/pending count. */
export const IN_FORCE_POLICY_STATUSES = ["bound", "pending", "active"] as const;
export type InForcePolicyStatus = (typeof IN_FORCE_POLICY_STATUSES)[number];

export const CLIENT_STATUSES = ["client", "former_client", "not_a_client"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const BIND_TARGETS = ["contact", "account"] as const;

/** Consumed from agency-ops. Softphone / calendar UI stays on that slice. */
export const ACTIVITY_KINDS = ["task", "meeting", "call", "email", "sms"] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export const ACTIVITY_STATUSES = ["open", "completed", "cancelled"] as const;
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];

export const ACTIVITY_KIND_LABELS: Record<string, string> = {
  task: "Task",
  meeting: "Meeting",
  call: "Call",
  email: "Email",
  sms: "SMS",
};

/** Feel-pass alias used by calendar / rail / comms. */
export const ACTIVITY_KIND_LABEL = ACTIVITY_KIND_LABELS;

export const ACTIVITY_STATUS_LABELS: Record<string, string> = {
  open: "Open",
  completed: "Completed",
  cancelled: "Cancelled",
  incomplete: "Open",
  delayed: "Open",
  canceled: "Cancelled",
  rescheduled: "Open",
};

export function normalizeActivityStatus(status: string | null | undefined): ActivityStatus {
  const raw = (status ?? "open").trim().toLowerCase();
  if (raw === "incomplete" || raw === "delayed" || raw === "rescheduled") return "open";
  if (raw === "canceled") return "cancelled";
  if ((ACTIVITY_STATUSES as readonly string[]).includes(raw)) return raw as ActivityStatus;
  return "open";
}

export const ACTIVITY_LOG_EVENTS = [
  "created",
  "completed",
  "cancelled",
  "logged",
  "bind",
] as const;
export type ActivityLogEvent = (typeof ACTIVITY_LOG_EVENTS)[number];
export type BindTarget = (typeof BIND_TARGETS)[number];

/** Desk line tabs — consumed by Quote Sheet ingest. Home is first-class here. */
export const SHOP_LINES = [
  "home",
  "auto",
  "rec_rv",
  "flood",
  "umbrella",
  "life",
  "health",
  "workers_comp",
  "general_liability",
  "bop",
] as const;
export type ShopLine = (typeof SHOP_LINES)[number];

export const LOB_TO_SHOP_LINE: Record<string, ShopLine> = {
  HO: "home",
  AUTO: "auto",
  RV: "rec_rv",
  FLOOD: "flood",
  UMBRELLA: "umbrella",
  LIFE: "life",
  HEALTH: "health",
  WC: "workers_comp",
  GL: "general_liability",
  BOP: "bop",
};

export const SHOP_LINE_TO_LOB: Record<ShopLine, LineOfBusiness> = {
  home: "HO",
  auto: "AUTO",
  rec_rv: "RV",
  flood: "FLOOD",
  umbrella: "UMBRELLA",
  life: "LIFE",
  health: "HEALTH",
  workers_comp: "WC",
  general_liability: "GL",
  bop: "BOP",
};

export const ACCOUNT_KINDS = ["personal", "commercial"] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

export const QUOTE_FIELD_STATUSES = ["missing", "check", "confirmed"] as const;
export type QuoteFieldStatus = (typeof QUOTE_FIELD_STATUSES)[number];

export const QUOTE_FIELD_SOURCES = [
  "blank",
  "agent",
  "extracted",
  "seed",
  "javy",
  "public",
  "public-records",
  "property-records",
  "photo-ocr",
] as const;
export type QuoteFieldSource = (typeof QUOTE_FIELD_SOURCES)[number];

export type QuoteSheetFieldValue = {
  value: string;
  status: QuoteFieldStatus;
  source: QuoteFieldSource;
};

export const SUPER_COPY_KIND = "fitfirst.sheet" as const;

export const SHOP_LINE_LABELS: Record<ShopLine, string> = {
  home: "Homeowners",
  auto: "Auto",
  rec_rv: "Rec / RV",
  flood: "Flood",
  umbrella: "Umbrella",
  life: "Life",
  health: "Health",
  workers_comp: "Workers Comp",
  general_liability: "General Liability",
  bop: "Businessowners (BOP)",
};

export function isShopLine(value: string | null | undefined): value is ShopLine {
  return Boolean(value && (SHOP_LINES as readonly string[]).includes(value));
}

export function parseShopLine(value: string | null | undefined, fallback: ShopLine = "home"): ShopLine {
  return isShopLine(value) ? value : fallback;
}

/** Policy form the agent picks after dropping dec / 4-point / wind mit on the Deal. */
export const QUOTING_FORMS = [
  { id: "HO3", label: "HO3", shopLine: "home" as ShopLine, lob: "HO" },
  { id: "HO5", label: "HO5", shopLine: "home" as ShopLine, lob: "HO" },
  { id: "HO6", label: "HO6", shopLine: "home" as ShopLine, lob: "HO" },
  { id: "HO8", label: "HO8", shopLine: "home" as ShopLine, lob: "HO" },
  { id: "MHO", label: "MHO", shopLine: "home" as ShopLine, lob: "HO" },
  { id: "MDP", label: "MDP", shopLine: "home" as ShopLine, lob: "HO" },
  { id: "DP1", label: "DP1", shopLine: "home" as ShopLine, lob: "HO" },
  { id: "DP3", label: "DP3", shopLine: "home" as ShopLine, lob: "HO" },
  { id: "HO4", label: "HO4", shopLine: "home" as ShopLine, lob: "HO" },
  { id: "PA", label: "Auto", shopLine: "auto" as ShopLine, lob: "AUTO" },
  { id: "MOTORCYCLE", label: "Motorcycle", shopLine: "auto" as ShopLine, lob: "AUTO" },
  { id: "RV", label: "Recreational vehicle", shopLine: "rec_rv" as ShopLine, lob: "RV" },
  { id: "BOAT", label: "Boat/Watercraft", shopLine: "rec_rv" as ShopLine, lob: "RV" },
  { id: "UMBRELLA", label: "Umbrella", shopLine: "umbrella" as ShopLine, lob: "UMBRELLA" },
  { id: "GL", label: "General liability", shopLine: "general_liability" as ShopLine, lob: "GL" },
  { id: "EO", label: "Errors & Omissions", shopLine: "general_liability" as ShopLine, lob: "GL" },
  { id: "WC", label: "Workers comp", shopLine: "workers_comp" as ShopLine, lob: "WC" },
  { id: "BOP", label: "BOP", shopLine: "bop" as ShopLine, lob: "BOP" },
  { id: "CA", label: "Commercial Auto", shopLine: "auto" as ShopLine, lob: "AUTO" },
  { id: "FLOOD", label: "Flood", shopLine: "flood" as ShopLine, lob: "FLOOD" },
] as const;
export type QuotingFormId = (typeof QUOTING_FORMS)[number]["id"];

export const INTEGRATION_CATEGORIES = [
  "email",
  "email_campaigns",
  "calendar",
  "phone_sms",
  "video",
  "esign",
  "rater",
  "social",
] as const;
export type IntegrationCategory = (typeof INTEGRATION_CATEGORIES)[number];

export type IntegrationCatalogItem = {
  category: IntegrationCategory;
  provider: string;
  label: string;
  optional?: boolean;
};

/** Agency BYO catalog. FitFirst is plug-only — the agency pays. No FitFirst Twilio subscribe. */
export const INTEGRATION_CATALOG: readonly IntegrationCatalogItem[] = [
  { category: "email", provider: "google", label: "Google" },
  { category: "email", provider: "outlook", label: "Outlook" },
  { category: "email", provider: "zoho_mail", label: "Zoho Mail" },
  { category: "email", provider: "yahoo", label: "Yahoo" },
  { category: "email_campaigns", provider: "mailchimp", label: "Mailchimp" },
  { category: "email_campaigns", provider: "constant_contact", label: "Constant Contact" },
  { category: "email_campaigns", provider: "sendgrid", label: "SendGrid (transactional)" },
  { category: "calendar", provider: "google", label: "Google Calendar" },
  { category: "calendar", provider: "outlook", label: "Outlook Calendar" },
  { category: "calendar", provider: "zoho_calendar", label: "Zoho Calendar" },
  { category: "phone_sms", provider: "twilio", label: "Twilio" },
  { category: "phone_sms", provider: "eight_by_eight", label: "8x8" },
  { category: "phone_sms", provider: "ringcentral", label: "RingCentral" },
  { category: "phone_sms", provider: "lightspeed_voice", label: "Lightspeed Voice" },
  { category: "phone_sms", provider: "bandwidth", label: "Bandwidth", optional: true },
  { category: "video", provider: "zoom", label: "Zoom" },
  { category: "video", provider: "meet", label: "Google Meet" },
  { category: "esign", provider: "docusign", label: "DocuSign" },
  { category: "esign", provider: "dropbox_sign", label: "Dropbox Sign" },
  { category: "rater", provider: "ezlynx", label: "EZLynx" },
  { category: "rater", provider: "quoterush", label: "QuoteRush" },
  { category: "social", provider: "facebook", label: "Facebook" },
  { category: "social", provider: "instagram", label: "Instagram" },
  { category: "social", provider: "x", label: "X (Twitter)" },
  { category: "social", provider: "linkedin", label: "LinkedIn" },
  { category: "social", provider: "google_business_profile", label: "Google Business Profile" },
];

export const SEEDED_PIPELINE_SLUGS = ["p-c", "health", "life", "flood", "won-lost", "archive"] as const;

export const RISK_TYPES = ["property", "auto"] as const;
export type RiskType = (typeof RISK_TYPES)[number];

export type RiskSnapshot = {
  yearBuilt: number | null;
  roofYear: number | null;
  roofCovering: string | null;
  construction: string | null;
  openingProtection: string | null;
  occupancy: string | null;
  stories: number | null;
  pool: boolean | null;
  protectionClass: string | null;
  milesToCoast: number | null;
  city: string | null;
  county: string | null;
  coverageA: number | null;
  mobileHome: boolean | null;
  replacementCostEstimate: number | null;
  state: string | null;
};

export type AppetiteRuleInput = {
  carrierId: string;
  carrierName: string;
  lineOfBusiness: string;
  minCovA: number | null;
  maxCovA: number | null;
  minYearBuilt: number | null;
  maxRoofAge: number | null;
  allowedRoofCoverings: string[] | null;
  coastalAllowed: boolean;
  minMilesToCoast: number | null;
  maxMilesToCoast: number | null;
  mobileAllowed: boolean;
  requiresOpeningProtection: boolean;
  maxStories: number | null;
  allowedConstruction: string[] | null;
  allowedOccupancy: string[] | null;
  allowedCounties: string[] | null;
  excludedCounties: string[] | null;
  countyMinCovA: Record<string, number> | null;
  requireReplacementCost: boolean;
  rceFloorRatio: number | null;
  portalStatus: "open" | "closed" | "takeout_only";
  dontWriteNotes: string | null;
  writtenLines: string[];
  appointed?: boolean | null;
  /** Agent-facing published appetite (min Cov A, placement). Shown on Markets Why. */
  appetiteNotes?: string | null;
};

export type PriorAttempt = {
  carrierId: string;
  result: QuoteAttemptResult;
  why: string | null;
  bindable: boolean;
  snapYearBuilt: number | null;
  snapRoofYear: number | null;
  snapRoofCovering: string | null;
  snapConstruction: string | null;
  snapCounty: string | null;
  snapMilesToCoast: number | null;
  snapCoverageA: number | null;
  /** Set when the log is one quote marked dead or deleted. Not a book-wide appetite lesson. */
  dealId?: string | null;
  declineScope?: "deal" | "book" | null;
};

export function currentRoofAge(
  roofYear: number | null,
  asOfYear = new Date().getFullYear(),
): number | null {
  if (!roofYear) return null;
  return asOfYear - roofYear;
}

export function formatMoney(value: number | string | null | undefined): string {
  if (value == null || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatPct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** Restored from cb1393c agency branding + later template / document slices. */
export const AGENCY_BRAND = {
  name: "Javier Garcia Insurance",
  phone: "321-429-1182",
  reviewLinkPlaceholder: "[Google review link]",
} as const;

export const CONTACT_LANGUAGES = ["english", "spanish", "creole", ""] as const;
export type ContactLanguage = (typeof CONTACT_LANGUAGES)[number];

export const EMAIL_LOCALES = ["en", "es"] as const;
export type EmailLocale = (typeof EMAIL_LOCALES)[number];

export const SEND_FROM_PROVIDERS = [
  "google",
  "outlook",
  "yahoo",
  "zoho_mail",
  "imap",
] as const;
export type SendFromProvider = (typeof SEND_FROM_PROVIDERS)[number];

export const SEND_FROM_LABELS: Record<SendFromProvider, string> = {
  google: "Google",
  outlook: "Outlook",
  yahoo: "Yahoo",
  zoho_mail: "Zoho Mail",
  imap: "IMAP",
};

export const EMAIL_TEMPLATE_KINDS = [
  "google_review",
  "checkin_4mo",
  "renewal_awareness",
  "custom",
] as const;
export type EmailTemplateKind = (typeof EMAIL_TEMPLATE_KINDS)[number];

export const EMAIL_TRIGGER_EVENTS = ["closed_won", "policy_renewal"] as const;
export type EmailTriggerEvent = (typeof EMAIL_TRIGGER_EVENTS)[number];

export const EMAIL_DELAY_UNITS = ["days", "months"] as const;
export type EmailDelayUnit = (typeof EMAIL_DELAY_UNITS)[number];

export const EMAIL_JOB_STATUSES = ["queued", "sent", "failed"] as const;
export type EmailJobStatus = (typeof EMAIL_JOB_STATUSES)[number];

export const EMAIL_JOB_HOLD = "connect_email_to_send";

export const MERGE_FIELDS = [
  { key: "contact_first_name", label: "Contact first name" },
  { key: "agency_name", label: "Agency name" },
  { key: "policy_type", label: "Policy type" },
  { key: "won_date", label: "Won date" },
  { key: "review_link", label: "Review link" },
  { key: "agent_phone", label: "Agent phone" },
  { key: "signature", label: "Email signature" },
] as const;

export const DESK_ROLES = ["admin", "agent"] as const;
export type DeskRole = (typeof DESK_ROLES)[number];

export const COLOR_PRESETS = ["agency", "terracotta", "forest", "slate"] as const;
export type ColorPreset = (typeof COLOR_PRESETS)[number];

export const FONT_PRESETS = ["plex", "system"] as const;
export type FontPreset = (typeof FONT_PRESETS)[number];

export const DENSITY_PRESETS = ["comfortable", "compact"] as const;
export type DensityPreset = (typeof DENSITY_PRESETS)[number];

export const COLOR_PRESET_LABELS: Record<ColorPreset, string> = {
  agency: "Agency navy (default)",
  terracotta: "Terracotta",
  forest: "Forest",
  slate: "Slate",
};

/** Ink + accent hex for branded proposal PDFs. Matches desk tokens. */
export const COLOR_PRESET_INK: Record<ColorPreset, { primary: string; accent: string; wash: string }> = {
  agency: { primary: "#0c2340", accent: "#1d6fb8", wash: "#c5ddf4" },
  terracotta: { primary: "#7c2d12", accent: "#b4532a", wash: "#ffedd5" },
  forest: { primary: "#14532d", accent: "#1f7a4d", wash: "#e4f5ec" },
  slate: { primary: "#1c2430", accent: "#5c6b7a", wash: "#e8eef4" },
};

export const FONT_PRESET_LABELS: Record<FontPreset, string> = {
  plex: "IBM Plex (desk default)",
  system: "System UI",
};

export const DENSITY_PRESET_LABELS: Record<DensityPreset, string> = {
  comfortable: "Comfortable",
  compact: "Compact",
};

export type ColumnLayout = Record<string, string[]>;

export const LIST_COLUMN_CATALOG: Record<string, { key: string; label: string }[]> = {
  leads: [
    { key: "name", label: "Name" },
    { key: "firstName", label: "First name" },
    { key: "middleName", label: "Middle name" },
    { key: "lastName", label: "Last name" },
    { key: "dateOfBirth", label: "Date of birth" },
    { key: "status", label: "Status" },
    { key: "stage", label: "Deal stage" },
    { key: "source", label: "Source" },
    { key: "line", label: "Insurance type desired" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "mailingAddress", label: "Address" },
    { key: "city", label: "City" },
    { key: "state", label: "State" },
    { key: "zip", label: "ZIP" },
    { key: "preferredLanguage", label: "Preferred language" },
    { key: "notes", label: "Notes" },
    { key: "created", label: "Created" },
    { key: "action", label: "Shop" },
  ],
  contacts: [
    { key: "name", label: "Name" },
    { key: "firstName", label: "First name" },
    { key: "lastName", label: "Last name" },
    { key: "status", label: "Status" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "mailingAddress", label: "Mailing address" },
    { key: "city", label: "City" },
    { key: "state", label: "State" },
    { key: "zip", label: "ZIP" },
    { key: "dateOfBirth", label: "Date of birth" },
    { key: "ssn", label: "SSN" },
    { key: "language", label: "Language" },
    { key: "maritalStatus", label: "Marital status" },
    { key: "notes", label: "Notes" },
    { key: "emailOptOut", label: "Email opt-out" },
    { key: "smsOptOut", label: "SMS opt-out" },
    { key: "assigned", label: "Assigned" },
    { key: "lifetime", label: "Lifetime" },
    { key: "inForce", label: "In-force" },
  ],
  deals: [
    { key: "title", label: "Deal" },
    { key: "stage", label: "Stage" },
    { key: "line", label: "Line" },
    { key: "subType", label: "Life / Health type" },
    { key: "state", label: "State" },
    { key: "city", label: "City" },
    { key: "zip", label: "ZIP" },
    { key: "address", label: "Property address" },
    { key: "shopLines", label: "Shop lines" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "assigned", label: "Assigned" },
    { key: "premium", label: "Coverage $" },
    { key: "updated", label: "Updated" },
    { key: "esign", label: "E-sign" },
    { key: "comms", label: "Comms" },
  ],
  accounts: [
    { key: "name", label: "Account" },
    { key: "status", label: "Status" },
    { key: "ein", label: "EIN" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "mailingAddress", label: "Mailing address" },
    { key: "city", label: "City" },
    { key: "state", label: "State" },
    { key: "zip", label: "ZIP" },
    { key: "employees", label: "Employees" },
    { key: "lifetime", label: "Lifetime" },
    { key: "inForce", label: "In-force" },
  ],
  policies: [
    { key: "number", label: "Policy" },
    { key: "status", label: "Status" },
    { key: "insured", label: "Insured" },
    { key: "line", label: "Line" },
    { key: "subType", label: "Sub-type" },
    { key: "carrier", label: "Carrier" },
    { key: "premium", label: "Premium" },
    { key: "coverageA", label: "Cov A" },
    { key: "billingFrequency", label: "Premium frequency" },
    { key: "premises", label: "Premises" },
    { key: "premisesCity", label: "Premises city" },
    { key: "effective", label: "Effective" },
    { key: "expires", label: "X-Date" },
    { key: "esign", label: "E-sign" },
    { key: "assigned", label: "Assigned" },
  ],
  carriers: [
    { key: "name", label: "Carrier" },
    { key: "naic", label: "NAIC" },
    { key: "amBest", label: "AM Best" },
    { key: "territory", label: "Territory" },
    { key: "agencyCode", label: "Agency code" },
    { key: "portalLogin", label: "Portal" },
    { key: "csPhone", label: "Customer service" },
    { key: "uw", label: "Underwriter" },
    { key: "uwEmail", label: "UW email" },
    { key: "uwPhone", label: "UW phone" },
    { key: "amName", label: "Account manager" },
    { key: "claimsPhone", label: "Claims phone" },
    { key: "billingPhone", label: "Billing phone" },
    { key: "comm", label: "NB / renewal %" },
    { key: "submission", label: "Preferred submission" },
    { key: "binding", label: "Binding authority" },
    { key: "agentPhone", label: "Agent phone" },
    { key: "website", label: "Website / portal" },
    { key: "info", label: "Carrier info" },
    { key: "appetite", label: "Appetite notes" },
    { key: "lines", label: "Lines" },
  ],
  tasks: [
    { key: "title", label: "Task" },
    { key: "due", label: "Due" },
    { key: "status", label: "Status" },
    { key: "kind", label: "Kind" },
    { key: "contact", label: "Contact" },
    { key: "policy", label: "Policy" },
    { key: "related", label: "Related" },
  ],
};

export function defaultColumnLayout(): ColumnLayout {
  return Object.fromEntries(
    Object.entries(LIST_COLUMN_CATALOG).map(([list, cols]) => [list, cols.map((c) => c.key)]),
  );
}

export function resolveColumnKeys(listKey: string, layout?: ColumnLayout | null): string[] {
  const catalog = LIST_COLUMN_CATALOG[listKey] ?? [];
  const allowed = new Set(catalog.map((c) => c.key));
  const picked = (layout?.[listKey] ?? []).filter((key) => allowed.has(key));
  return picked.length > 0 ? picked : catalog.map((c) => c.key);
}

export const FOLDER_KINDS = [
  "agency_library",
  "shared_library",
  "forms_library",
  "account",
  "deal",
  "policy",
  "custom",
] as const;
export type FolderKind = (typeof FOLDER_KINDS)[number];

export const FOLDER_KIND_LABELS: Record<FolderKind, string> = {
  agency_library: "Agency library",
  shared_library: "Library",
  forms_library: "Forms",
  account: "Account",
  deal: "Deal",
  policy: "Policy",
  custom: "Folder",
};

export const DOCUMENT_LIBRARIES = ["forms", "shared"] as const;
export type DocumentLibrary = (typeof DOCUMENT_LIBRARIES)[number];

export const DOCUMENT_LIBRARY_LABELS: Record<DocumentLibrary, string> = {
  forms: "Forms",
  shared: "Library",
};

export const CAMPAIGN_AUDIENCE_TYPES = ["tag", "pipeline_stage"] as const;
export type CampaignAudienceType = (typeof CAMPAIGN_AUDIENCE_TYPES)[number];

export const CAMPAIGN_STATUSES = ["draft", "queued", "stub_sent"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const ESIGN_PROVIDERS = ["docusign", "dropbox_sign", "zoho_sign"] as const;
export type EsignProvider = (typeof ESIGN_PROVIDERS)[number];

/** Settings stubs agents can mark as BYO. Zoho Sign is not offered here. */
export const ESIGN_SETTINGS_PROVIDERS = ["none", "docusign", "dropbox_sign"] as const;
export type EsignSettingsProvider = (typeof ESIGN_SETTINGS_PROVIDERS)[number];

export const ESIGN_SETTINGS_PROVIDER_LABEL: Record<EsignSettingsProvider, string> = {
  none: "Not connected",
  docusign: "DocuSign (BYO)",
  dropbox_sign: "Dropbox Sign (BYO)",
};

export const ESIGN_STATUSES = ["draft", "sent", "signed"] as const;
export type EsignStatus = (typeof ESIGN_STATUSES)[number];

export const SMS_PROVIDERS = ["none", "twilio", "eight_by_eight"] as const;
export type SmsProvider = (typeof SMS_PROVIDERS)[number];

export const TELEPHONY_PROVIDERS = ["none", "twilio", "eight_by_eight", "vonage", "byo"] as const;
export type TelephonyProvider = (typeof TELEPHONY_PROVIDERS)[number];

export const TELEPHONY_PROVIDER_LABEL: Record<TelephonyProvider, string> = {
  none: "Not connected",
  twilio: "Twilio (agency-paid)",
  eight_by_eight: "8x8 (agency-paid)",
  vonage: "Vonage (agency-paid)",
  byo: "Bring-your-own SIP / trunk",
};

export const CARRIER_SUBMISSION_METHODS = ["portal", "email", "download", "phone"] as const;
export type CarrierSubmissionMethod = (typeof CARRIER_SUBMISSION_METHODS)[number];

export const CARRIER_BINDING = ["none", "limited", "full"] as const;
export type CarrierBinding = (typeof CARRIER_BINDING)[number];

export const CARRIER_BINDING_LABEL: Record<CarrierBinding, string> = {
  none: "No binding authority",
  limited: "Limited (quoted only)",
  full: "Full bind",
};

export function formatDay(value: Date | string | null | undefined): string {
  // Desk display default M-D-Y. Pass personal format via formatDisplayDate when prefs are loaded.
  return formatDisplayDate(value);
}

export function clientStatusLabel(status: ClientStatus): string {
  if (status === "client") return "Client";
  if (status === "former_client") return "Former Client";
  return "Not a client";
}

export {
  APPOINTMENT_LINES,
  SELLING_AGENCIES,
  WRITTEN_LINE_LABELS,
  appointmentLine,
  writtenLineLabel,
  writesDealLine,
  MATCH_REASONS,
  MERGE_ENTITY_TYPES,
  MERGE_STATUSES,
  RECORD_STATUSES,
  MATCH_REASON_LABELS,
  formatDate,
  CLAIM_STATUSES,
  CLAIM_REPORT_CHANNELS,
  CLAIM_CAUSES,
  CLAIM_ACTIVITY_TYPES,
  USER_ROLES,
  COMMISSION_STATUSES,
  ASK_STATUSES,
  ASK_KINDS,
  ASK_ENTITY_TYPES,
  OWNER_ENTITY_TYPES,
  COMMISSION_RANGES,
  COMMISSION_VIEWS,
  DEFAULT_COMMISSION_RATE_PCT,
  DEFAULT_PRODUCER_SPLIT_PCT,
  sellingAgencyLabel,
  formatRatePct,
  LOCATION_LINES,
  OCCUPANCIES,
  OCCUPANCY_LABELS,
  isLocationLine,
  occupancyLabel,
  lineLabel,
  VEHICLE_USES,
  VEHICLE_USE_LABELS,
  vehicleUseLabel,
  formatDob,
  formatVehicleTitle,
  TASK_PIPELINE_STAGES,
  ACTIVITY_PRIORITIES,
  ACTIVITY_STATUS_ALIASES,
  CALL_DIRECTIONS,
  CALL_OUTCOMES,
  MEETING_LOG_EVENTS,
  formatDuration,
  statusLabel,
  pipelineLabel,
  CERTIFIABLE_LINES,
  isCertifiableLine,
  TRACKING_STATUSES,
  SERVICE_REQUEST_STATUSES,
  SERVICE_REQUEST_STATUS_LABELS,
  isServiceRequestStatus,
  serviceRequestStatusLabel,
  CERTIFICATE_REQUEST_STATUSES,
  CERTIFICATE_REQUEST_STATUS_LABELS,
  certificateRequestStatusLabel,
  SERVICING_DOC_KEYS,
  SERVICING_DOC_LABELS,
  SERVICING_CHECK_KEYS,
  SERVICING_CHECK_LABELS,
  SERVICING_CHECK_STATUSES,
  isServicingCheckKey,
  isServicingCheckStatus,
  SERVICE_REQUEST_EVENT_ACTIONS,
  CARRIER_DOWNLOAD_PROVIDERS,
  CARRIER_DOWNLOAD_LABELS,
  CARRIER_DOWNLOAD_NOT_CONNECTED,
  CARRIER_DOWNLOAD_STUB_REASON,
  SERVICE_REQUEST_NEXT_STEPS,
  serviceRequestNextStep,
  INTEREST_KINDS,
  INTEREST_KIND_LABELS,
  isInterestKind,
  interestKindLabel,
  PERSONAL_LINES,
  isPersonalLinesCode,
  SERVICING_TASK_KINDS,
  SERVICE_REQUEST_TASK_KIND,
  servicingTaskKind,
  servicingDocKeyFromTaskKind,
  PERSONAL_INTEREST_KINDS,
  COMMERCIAL_INTEREST_KINDS,
  WORK_DESKS,
  WORK_DESK_LABELS,
  isWorkDesk,
  workDeskLabel,
  TERM_ROLES,
  TERM_ROLE_LABELS,
  isTermRole,
  termRoleLabel,
  SUSPENSE_DOC_KEYS,
  LOSS_RUN_STUB_DISCLAIMER,
  NOTICE_KINDS,
  NOTICE_KIND_LABELS,
  NOTICE_STATUSES,
  NOTICE_STATUS_LABELS,
  isNoticeKind,
  isNoticeStatus,
  noticeKindLabel,
  noticeStatusLabel,
  NOTICE_NEXT_STEPS,
  noticeNextStep,
  NOTICE_DIARY_DISCLAIMER,
  CLAIM_DIARY_KINDS,
  CLAIM_DIARY_KIND_LABELS,
  CLAIM_DIARY_STATUSES,
  CLAIM_DIARY_STATUS_LABELS,
  isClaimDiaryKind,
  isClaimDiaryStatus,
  claimDiaryKindLabel,
  claimDiaryStatusLabel,
  CLAIM_DIARY_DISCLAIMER,
  ENDORSEMENT_FORM_CODES,
  ENDORSEMENT_FORM_LABELS,
  ENDORSEMENT_DRAFT_STATUSES,
  ENDORSEMENT_DRAFT_STATUS_LABELS,
  isEndorsementFormCode,
  isEndorsementDraftStatus,
  endorsementFormLabel,
  endorsementDraftStatusLabel,
  ENDORSEMENT_DRAFT_NEXT_STEPS,
  endorsementDraftNextStep,
  ENDORSEMENT_DRAFT_DISCLAIMER,
  SUSPENSE_AGE_BUCKETS,
  SUSPENSE_AGE_LABELS,
  isSuspenseAgeBucket,
  suspenseAgeLabel,
  SERVICE_TIMELINE_EVENTS,
  SERVICE_TIMELINE_EVENT_LABELS,
  isServiceTimelineEvent,
  serviceTimelineEventLabel,
  SERVICE_TIMELINE_DISCLAIMER,
  HOLDER_CONTACT_STATUSES,
  HOLDER_CONTACT_STATUS_LABELS,
  isHolderContactStatus,
  holderContactStatusLabel,
  HOLDER_CONTACT_DISCLAIMER,
  RENEWAL_QUEUE_STAGES,
  RENEWAL_QUEUE_STAGE_LABELS,
  isRenewalQueueStage,
  renewalQueueStageLabel,
  RENEWAL_QUEUE_NEXT_STEPS,
  renewalQueueNextStep,
  RENEWAL_QUEUE_DISCLAIMER,
  INSPECTION_KINDS,
  INSPECTION_KIND_LABELS,
  INSPECTION_STATUSES,
  INSPECTION_STATUS_LABELS,
  isInspectionKind,
  isInspectionStatus,
  inspectionKindLabel,
  inspectionStatusLabel,
  INSPECTION_NEXT_STEPS,
  inspectionNextStep,
  INSPECTION_DISCLAIMER,
  BILL_TYPES,
  BILL_TYPE_LABELS,
  INSTALLMENT_STATUSES,
  INSTALLMENT_STATUS_LABELS,
  isBillType,
  isInstallmentStatus,
  billTypeLabel,
  installmentStatusLabel,
  INSTALLMENT_NEXT_STEPS,
  installmentNextStep,
  INSTALLMENT_DISCLAIMER,
} from "./domain-ams";
export type {
  AppointmentLine,
  SellingAgency,
  MatchReason,
  MergeEntityType,
  MergeStatus,
  ClaimStatus,
  ClaimReportChannel,
  ClaimCause,
  ClaimActivityType,
  UserRole,
  CommissionStatus,
  AskStatus,
  AskKind,
  AskEntityType,
  OwnerEntityType,
  CommissionRange,
  CommissionView,
  LocationLine,
  Occupancy,
  VehicleUse,
  TaskPipelineStage,
  ActivityPriority,
  CallDirection,
  CallOutcome,
  MeetingLogEvent,
  CertifiableLine,
  TrackingStatus,
  ServiceRequestStatus,
  CertificateRequestStatus,
  ServicingDocKey,
  ServicingCheckKey,
  ServicingCheckStatus,
  ServiceRequestEventAction,
  CarrierDownloadProvider,
  InterestKind,
  WorkDesk,
  TermRole,
  SuspenseDocKey,
  NoticeKind,
  NoticeStatus,
  ClaimDiaryKind,
  ClaimDiaryStatus,
  EndorsementFormCode,
  EndorsementDraftStatus,
  SuspenseAgeBucket,
  ServiceTimelineEvent,
  HolderContactStatus,
  RenewalQueueStage,
  InspectionKind,
  InspectionStatus,
  BillType,
  InstallmentStatus,
} from "./domain-ams";

export {
  POLICY_CHANGE_KINDS,
  isInForceStatus,
  isEndedStatus,
  policyStatusLabel,
} from "./policy/status";
export type { PolicyChangeKind } from "./policy/status";

export {
  WORK_STATUSES,
  WORK_FLAGS,
  WORK_REMINDER_KIND,
  WORK_PING_KIND,
  PORTAL_REQUEST_KIND,
  PORTAL_PING_KIND,
  workStatusLabel,
  workFlagLabel,
} from "./work-queue/types";
export type { WorkStatus, WorkFlag } from "./work-queue/types";
