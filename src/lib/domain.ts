export const DEFAULT_TENANT_ID =
  process.env.TENANT_ID ?? "11111111-1111-4111-8111-111111111111";

export const CONFIDENCE_THRESHOLD = 0.8;

export const LINES = [
  "HO",
  "AUTO",
  "FLOOD",
  "UMBRELLA",
  "GL",
  "LIFE",
  "HEALTH",
] as const;
export type LineOfBusiness = (typeof LINES)[number];

/** First-wave personal lines that get an explicit appointment row per carrier. */
export const APPOINTMENT_LINES = ["HO", "AUTO", "FLOOD", "UMBRELLA"] as const;
export type AppointmentLine = (typeof APPOINTMENT_LINES)[number];

export const SELLING_AGENCIES = ["AFA", "First Connect", "Agentero"] as const;
export type SellingAgency = (typeof SELLING_AGENCIES)[number];

export const WRITTEN_LINE_LABELS: Record<string, string> = {
  HO: "Home",
  AUTO: "Auto",
  FLOOD: "Flood",
  UMBRELLA: "Umbrella",
  GL: "General liability",
  LIFE: "Life",
  HEALTH: "Health",
};

export function appointmentLine(lineOfBusiness: string): string {
  const raw = lineOfBusiness.trim().toUpperCase();
  if (
    raw === "HO3" ||
    raw === "HO5" ||
    raw === "HO6" ||
    raw === "HOME" ||
    raw === "HOMEOWNERS"
  ) {
    return "HO";
  }
  if (raw === "PA" || raw === "PERSONAL_AUTO") return "AUTO";
  if (raw === "PU" || raw === "PUP") return "UMBRELLA";
  return raw;
}

export function writtenLineLabel(code: string): string {
  const line = appointmentLine(code);
  return WRITTEN_LINE_LABELS[line] ?? line;
}

export const DEAL_STAGES = [
  "shopping",
  "quoting",
  "comparing",
  "quote_sent",
  "closed_won",
  "bound",
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

export const FIT_BANDS = ["green", "yellow", "red"] as const;
export type FitBand = (typeof FIT_BANDS)[number];

export const DOC_TYPES = [
  "dec",
  "wind_mit",
  "four_point",
  "inspection",
  "photo",
  "quote_pdf",
  "policy_dec",
  "policy_complete",
  "policy_id",
  "other",
] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const DOC_SLOTS = ["source_doc", "quote_pdf", "policy_file"] as const;
export type DocSlot = (typeof DOC_SLOTS)[number];

export const SOURCE_DOC_TYPES = ["dec", "wind_mit", "four_point", "inspection", "photo"] as const;
export const POLICY_FILE_TYPES = ["policy_dec", "policy_complete", "policy_id"] as const;

export const POLICY_STATUSES = [
  "bound",
  "pending",
  "active",
  "cancelled",
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
};

export const QUOTE_FIELD_STATUSES = ["missing", "check", "confirmed"] as const;
export type QuoteFieldStatus = (typeof QUOTE_FIELD_STATUSES)[number];

export const QUOTE_FIELD_SOURCES = ["blank", "agent", "extracted", "seed", "javy"] as const;
export type QuoteFieldSource = (typeof QUOTE_FIELD_SOURCES)[number];

export type QuoteSheetFieldValue = {
  value: string;
  status: QuoteFieldStatus;
  source: QuoteFieldSource;
};

export const SUPER_COPY_KIND = "fitfirst.sheet" as const;

export const SHOP_LINE_LABELS: Record<ShopLine, string> = {
  home: "Home",
  auto: "Auto",
  rec_rv: "Rec / RV",
  flood: "Flood",
  umbrella: "Umbrella",
  life: "Life",
  health: "Health",
  workers_comp: "Workers Comp",
  general_liability: "General Liability",
};

export const SEEDED_PIPELINE_SLUGS = ["p-c", "health", "life", "won-lost", "flood"] as const;

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

export function formatDay(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
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
  workStatusLabel,
  workFlagLabel,
} from "./work-queue/types";
export type { WorkStatus, WorkFlag } from "./work-queue/types";
