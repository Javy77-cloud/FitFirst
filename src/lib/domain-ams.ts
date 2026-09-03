/** Additive constants consumed by later desk slices. Re-exported from domain.ts. */

export const APPOINTMENT_LINES = ["HO", "AUTO", "FLOOD", "UMBRELLA"] as const;
export type AppointmentLine = (typeof APPOINTMENT_LINES)[number];

export const SELLING_AGENCIES = ["AFA", "First Connect", "Agentero", "Agility", "BackNine"] as const;
export type SellingAgency = (typeof SELLING_AGENCIES)[number];

export const WRITTEN_LINE_LABELS: Record<string, string> = {
  HO: "Home",
  AUTO: "Auto",
  FLOOD: "Flood",
  UMBRELLA: "Umbrella",
  GL: "General liability",
  BOP: "BOP",
  LANDLORD: "Landlord",
  LIFE: "Life",
  HEALTH: "Health",
  WC: "Workers Comp",
};

export function appointmentLine(lineOfBusiness: string): string {
  const raw = lineOfBusiness.trim().toUpperCase();
  if (raw === "HO3" || raw === "HO5" || raw === "HO6" || raw === "HOME" || raw === "HOMEOWNERS") {
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

export function writesDealLine(writtenLines: string[], dealLine: string): boolean {
  if (!writtenLines.length) return true;
  const want = appointmentLine(dealLine);
  return writtenLines.some((line) => appointmentLine(line) === want);
}

export const MATCH_REASONS = ["email", "phone", "name_dob", "name_address"] as const;
export type MatchReason = (typeof MATCH_REASONS)[number];

export const MERGE_ENTITY_TYPES = ["contact", "lead"] as const;
export type MergeEntityType = (typeof MERGE_ENTITY_TYPES)[number];

export const MERGE_STATUSES = ["open", "merged", "dismissed"] as const;
export type MergeStatus = (typeof MERGE_STATUSES)[number];

export const RECORD_STATUSES = ["active", "archived"] as const;

export const MATCH_REASON_LABELS: Record<MatchReason, string> = {
  email: "Same email",
  phone: "Same phone",
  name_dob: "Same name + date of birth",
  name_address: "Same name + address",
};

export function formatDate(value: Date | string | null | undefined): string {
  if (value == null || value === "") return "—";
  const iso = value instanceof Date ? value.toISOString() : value;
  return iso.slice(0, 10);
}

export const CLAIM_STATUSES = ["inquiry", "referred_to_carrier", "closed"] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const CLAIM_REPORT_CHANNELS = ["phone", "in_office", "email", "portal"] as const;
export type ClaimReportChannel = (typeof CLAIM_REPORT_CHANNELS)[number];

export const CLAIM_CAUSES = [
  "fire",
  "water",
  "wind",
  "hail",
  "theft",
  "auto_accident",
  "liability",
  "other",
] as const;
export type ClaimCause = (typeof CLAIM_CAUSES)[number];

export const CLAIM_ACTIVITY_TYPES = [
  "opened",
  "note_added",
  "file_added",
  "status_changed",
  "fields_updated",
] as const;
export type ClaimActivityType = (typeof CLAIM_ACTIVITY_TYPES)[number];

export const USER_ROLES = ["admin", "agent"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const COMMISSION_STATUSES = ["pending", "payable", "paid", "held"] as const;
export type CommissionStatus = (typeof COMMISSION_STATUSES)[number];

export const ASK_STATUSES = ["open", "done"] as const;
export type AskStatus = (typeof ASK_STATUSES)[number];

export const ASK_KINDS = ["question", "payout"] as const;
export type AskKind = (typeof ASK_KINDS)[number];

export const ASK_ENTITY_TYPES = ["commission", "policy"] as const;
export type AskEntityType = (typeof ASK_ENTITY_TYPES)[number];

export const OWNER_ENTITY_TYPES = ["lead", "contact", "deal", "policy"] as const;
export type OwnerEntityType = (typeof OWNER_ENTITY_TYPES)[number];

export const COMMISSION_RANGES = [
  "all",
  "pending",
  "paid",
  "last_30",
  "last_quarter",
  "fiscal_year",
  "upcoming",
] as const;
export type CommissionRange = (typeof COMMISSION_RANGES)[number];

export const COMMISSION_VIEWS = ["mine", "agency"] as const;
export type CommissionView = (typeof COMMISSION_VIEWS)[number];

export const DEFAULT_COMMISSION_RATE_PCT = 10;
export const DEFAULT_PRODUCER_SPLIT_PCT = 100;

export function sellingAgencyLabel(value: string | null | undefined): string {
  if (!value) return "—";
  const map: Record<string, string> = {
    afa: "AFA",
    first_connect: "First Connect",
    agentero: "Agentero",
    agility: "Agility",
    backnine: "BackNine",
  };
  return map[value] ?? value;
}

export function formatRatePct(value: number | string | null | undefined): string {
  if (value == null || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(Number.isInteger(n) ? 0 : 2)}%`;
}

export const LOCATION_LINES = ["HO", "LANDLORD", "FLOOD", "BOP", "GL"] as const;
export type LocationLine = (typeof LOCATION_LINES)[number];

export const OCCUPANCIES = ["owner", "tenant", "vacant", "commercial"] as const;
export type Occupancy = (typeof OCCUPANCIES)[number];

export const OCCUPANCY_LABELS: Record<Occupancy, string> = {
  owner: "Owner-occupied",
  tenant: "Tenant (landlord)",
  vacant: "Vacant",
  commercial: "Commercial",
};

export function isLocationLine(line: string): line is LocationLine {
  return (LOCATION_LINES as readonly string[]).includes(line);
}

export function occupancyLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return OCCUPANCY_LABELS[value as Occupancy] ?? value;
}

export function lineLabel(line: string | null | undefined): string {
  if (!line) return "—";
  switch (line) {
    case "GL":
      return "Commercial General Liability";
    case "WC":
      return "Workers Compensation and Employers' Liability";
    default:
      return WRITTEN_LINE_LABELS[line] ?? line;
  }
}

export const VEHICLE_USES = ["commute", "pleasure", "business", "farm"] as const;
export type VehicleUse = (typeof VEHICLE_USES)[number];

export const VEHICLE_USE_LABELS: Record<VehicleUse, string> = {
  commute: "Commute",
  pleasure: "Pleasure",
  farm: "Farm",
  business: "Business",
};

export function vehicleUseLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return value in VEHICLE_USE_LABELS ? VEHICLE_USE_LABELS[value as VehicleUse] : value;
}

export function formatDob(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const iso = typeof value === "string" ? value : value.toISOString();
  return iso.slice(0, 10);
}

export function formatVehicleTitle(vehicle: {
  year: number | null;
  make: string | null;
  model: string | null;
}): string {
  const parts = [vehicle.year, vehicle.make, vehicle.model].filter((part) => part != null && part !== "");
  return parts.length ? parts.join(" ") : "Vehicle (year/make/model blank)";
}

export const TASK_PIPELINE_STAGES = ["todo", "doing", "waiting", "done"] as const;
export type TaskPipelineStage = (typeof TASK_PIPELINE_STAGES)[number];

export const ACTIVITY_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type ActivityPriority = (typeof ACTIVITY_PRIORITIES)[number];

export const CALL_DIRECTIONS = ["outbound", "inbound"] as const;
export type CallDirection = (typeof CALL_DIRECTIONS)[number];

export const CALL_OUTCOMES = [
  "connected",
  "no_answer",
  "voicemail",
  "busy",
  "wrong_number",
] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];

export const MEETING_LOG_EVENTS = [
  "scheduled",
  "started",
  "completed",
  "no_show",
  "canceled",
] as const;
export type MeetingLogEvent = (typeof MEETING_LOG_EVENTS)[number];

export const ACTIVITY_STATUS_ALIASES: Record<string, string> = {
  open: "open",
  completed: "completed",
  cancelled: "cancelled",
  canceled: "cancelled",
};

export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || !Number.isFinite(totalSeconds) || totalSeconds < 0) return "—";
  const s = Math.round(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function statusLabel(status: string): string {
  const mapped = ACTIVITY_STATUS_ALIASES[status] ?? status;
  return mapped.replaceAll("_", " ");
}

export function pipelineLabel(stage: string): string {
  switch (stage) {
    case "todo":
      return "To do";
    case "doing":
      return "Doing";
    case "waiting":
      return "Waiting";
    case "done":
      return "Done";
    default:
      return stage.replaceAll("_", " ");
  }
}

export const CERTIFIABLE_LINES = ["GL", "WC"] as const;
export type CertifiableLine = (typeof CERTIFIABLE_LINES)[number];

export function isCertifiableLine(line: string): line is CertifiableLine {
  return (CERTIFIABLE_LINES as readonly string[]).includes(line);
}

export const TRACKING_STATUSES = ["quoted", "declined", "skip", "bound"] as const;
export type TrackingStatus = (typeof TRACKING_STATUSES)[number];
