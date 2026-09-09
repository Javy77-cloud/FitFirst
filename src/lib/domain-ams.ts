/** Additive constants consumed by later desk slices. Re-exported from domain.ts. */

export const APPOINTMENT_LINES = ["HO", "AUTO", "FLOOD", "UMBRELLA"] as const;
export type AppointmentLine = (typeof APPOINTMENT_LINES)[number];

export const SELLING_AGENCIES = ["AFA", "Agentero", "Agility", "BackNine", "First Connect"] as const;
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
  "fnol_logged",
  "note_added",
  "file_added",
  "status_changed",
  "fields_updated",
  "producer_notified",
  "diary_added",
  "diary_completed",
] as const;
export type ClaimActivityType = (typeof CLAIM_ACTIVITY_TYPES)[number];

export const USER_ROLES = ["admin", "agent"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const COMMISSION_STATUSES = ["pending", "payable", "paid", "held"] as const;
export type CommissionStatus = (typeof COMMISSION_STATUSES)[number];

export const ASK_STATUSES = ["open", "done", "resolved"] as const;
export type AskStatus = (typeof ASK_STATUSES)[number];

export const ASK_KINDS = ["question", "payout", "status"] as const;
export type AskKind = (typeof ASK_KINDS)[number];

export const ASK_ENTITY_TYPES = [
  "commission",
  "policy",
  "contact",
  "lead",
  "deal",
  "account",
  "carrier",
] as const;
export type AskEntityType = (typeof ASK_ENTITY_TYPES)[number];

export const OWNER_ENTITY_TYPES = ["lead", "contact", "deal", "policy"] as const;
export type OwnerEntityType = (typeof OWNER_ENTITY_TYPES)[number];

export const COMMISSION_RANGES = [
  "all",
  "pending",
  "paid",
  "last_30",
  "last_year",
  "last_6_months",
  "last_3_months",
  "last_month",
  "last_quarter",
  "fiscal_year",
  "next_month",
  "next_3_months",
  "next_6_months",
  "next_quarter",
  "next_year",
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
  incomplete: "open",
  delayed: "open",
  rescheduled: "open",
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

export const SERVICE_REQUEST_STATUSES = [
  "requested",
  "in_progress",
  "filed",
  "withdrawn",
] as const;
export type ServiceRequestStatus = (typeof SERVICE_REQUEST_STATUSES)[number];

export const SERVICE_REQUEST_STATUS_LABELS: Record<ServiceRequestStatus, string> = {
  requested: "Requested",
  in_progress: "In progress",
  filed: "Filed",
  withdrawn: "Withdrawn",
};

export function isServiceRequestStatus(value: string): value is ServiceRequestStatus {
  return (SERVICE_REQUEST_STATUSES as readonly string[]).includes(value);
}

export function serviceRequestStatusLabel(status: string): string {
  return isServiceRequestStatus(status) ? SERVICE_REQUEST_STATUS_LABELS[status] : status;
}

export const CERTIFICATE_REQUEST_STATUSES = ["requested", "issued", "withdrawn"] as const;
export type CertificateRequestStatus = (typeof CERTIFICATE_REQUEST_STATUSES)[number];

export const CERTIFICATE_REQUEST_STATUS_LABELS: Record<CertificateRequestStatus, string> = {
  requested: "Requested",
  issued: "Issued stub",
  withdrawn: "Withdrawn",
};

export function certificateRequestStatusLabel(status: string): string {
  return status in CERTIFICATE_REQUEST_STATUS_LABELS
    ? CERTIFICATE_REQUEST_STATUS_LABELS[status as CertificateRequestStatus]
    : status;
}

export const SERVICING_DOC_KEYS = ["dec", "id_card", "aor"] as const;
export type ServicingDocKey = (typeof SERVICING_DOC_KEYS)[number];

export const SERVICING_DOC_LABELS: Record<ServicingDocKey, string> = {
  dec: "Dec on file",
  id_card: "ID cards",
  aor: "AOR packet",
};

export const SERVICING_CHECK_KEYS = ["renewal_docs", "inspection", "mortgagee", "id_cards"] as const;
export type ServicingCheckKey = (typeof SERVICING_CHECK_KEYS)[number];

export const SERVICING_CHECK_LABELS: Record<ServicingCheckKey, string> = {
  renewal_docs: "Renewal docs due",
  inspection: "Inspection",
  mortgagee: "Mortgagee",
  id_cards: "ID cards",
};

export const SERVICING_CHECK_STATUSES = ["complete", "incomplete"] as const;
export type ServicingCheckStatus = (typeof SERVICING_CHECK_STATUSES)[number];

export function isServicingCheckKey(value: string): value is ServicingCheckKey {
  return (SERVICING_CHECK_KEYS as readonly string[]).includes(value);
}

export function isServicingCheckStatus(value: string): value is ServicingCheckStatus {
  return (SERVICING_CHECK_STATUSES as readonly string[]).includes(value);
}

export const SERVICE_REQUEST_EVENT_ACTIONS = [
  "requested",
  "started",
  "filed",
  "withdrawn",
  "note",
] as const;
export type ServiceRequestEventAction = (typeof SERVICE_REQUEST_EVENT_ACTIONS)[number];

export const CARRIER_DOWNLOAD_PROVIDERS = ["ivans", "al3"] as const;
export type CarrierDownloadProvider = (typeof CARRIER_DOWNLOAD_PROVIDERS)[number];

export const CARRIER_DOWNLOAD_LABELS: Record<CarrierDownloadProvider, string> = {
  ivans: "IVANS",
  al3: "AL3 / carrier download",
};

export const CARRIER_DOWNLOAD_NOT_CONNECTED = "not_connected";
export const CARRIER_DOWNLOAD_STUB_REASON =
  "needs carrier download / IVANS later";

export const SERVICE_REQUEST_NEXT_STEPS: Record<ServiceRequestStatus, string> = {
  requested: "Queued. Start when the change packet is ready.",
  in_progress: "Working. File when the carrier confirms — same Policy, no rewrite.",
  filed: "On the Policy. Activity log recorded.",
  withdrawn: "Withdrawn. Policy unchanged.",
};

export function serviceRequestNextStep(status: string): string {
  return isServiceRequestStatus(status) ? SERVICE_REQUEST_NEXT_STEPS[status] : "";
}

export const INTEREST_KINDS = [
  "mortgagee",
  "additional_interest",
  "loss_payee",
  "certificate_holder",
] as const;
export type InterestKind = (typeof INTEREST_KINDS)[number];

export const INTEREST_KIND_LABELS: Record<InterestKind, string> = {
  mortgagee: "Mortgagee",
  additional_interest: "Additional interest",
  loss_payee: "Loss payee",
  certificate_holder: "Certificate holder",
};

export const PERSONAL_INTEREST_KINDS = ["mortgagee", "additional_interest", "loss_payee"] as const;
export const COMMERCIAL_INTEREST_KINDS = [
  "additional_interest",
  "certificate_holder",
  "loss_payee",
] as const;

export const WORK_DESKS = ["producer", "csr"] as const;
export type WorkDesk = (typeof WORK_DESKS)[number];

export const WORK_DESK_LABELS: Record<WorkDesk, string> = {
  producer: "Producer",
  csr: "CSR",
};

export function isWorkDesk(value: string): value is WorkDesk {
  return (WORK_DESKS as readonly string[]).includes(value);
}

export function workDeskLabel(value: string): string {
  return isWorkDesk(value) ? WORK_DESK_LABELS[value] : value.replaceAll("_", " ");
}

export const TERM_ROLES = ["prior", "current", "proposed"] as const;
export type TermRole = (typeof TERM_ROLES)[number];

export const TERM_ROLE_LABELS: Record<TermRole, string> = {
  prior: "Prior term",
  current: "Current term",
  proposed: "Proposed renewal",
};

export function isTermRole(value: string): value is TermRole {
  return (TERM_ROLES as readonly string[]).includes(value);
}

export function termRoleLabel(role: string): string {
  return isTermRole(role) ? TERM_ROLE_LABELS[role] : role.replaceAll("_", " ");
}

export const SUSPENSE_DOC_KEYS = ["id_card", "aor"] as const;
export type SuspenseDocKey = (typeof SUSPENSE_DOC_KEYS)[number];

export const LOSS_RUN_STUB_DISCLAIMER =
  "Desk claims summary stub — not a carrier loss run. Handle the claim on the carrier website.";

export const NOTICE_KINDS = ["cancellation", "non_renewal", "reinstatement"] as const;
export type NoticeKind = (typeof NOTICE_KINDS)[number];

export const NOTICE_KIND_LABELS: Record<NoticeKind, string> = {
  cancellation: "Cancellation notice",
  non_renewal: "Non-renewal notice",
  reinstatement: "Reinstatement notice",
};

export const NOTICE_STATUSES = ["drafted", "mailed", "withdrawn"] as const;
export type NoticeStatus = (typeof NOTICE_STATUSES)[number];

export const NOTICE_STATUS_LABELS: Record<NoticeStatus, string> = {
  drafted: "Drafted",
  mailed: "Mailed",
  withdrawn: "Withdrawn",
};

export function isNoticeKind(value: string): value is NoticeKind {
  return (NOTICE_KINDS as readonly string[]).includes(value);
}

export function isNoticeStatus(value: string): value is NoticeStatus {
  return (NOTICE_STATUSES as readonly string[]).includes(value);
}

export function noticeKindLabel(kind: string): string {
  return isNoticeKind(kind) ? NOTICE_KIND_LABELS[kind] : kind.replaceAll("_", " ");
}

export function noticeStatusLabel(status: string): string {
  return isNoticeStatus(status) ? NOTICE_STATUS_LABELS[status] : status.replaceAll("_", " ");
}

export const NOTICE_NEXT_STEPS: Record<NoticeStatus, string> = {
  drafted: "Desk draft only. Mail when the carrier notice is ready. Does not cancel the Policy.",
  mailed: "Logged as mailed. Policy status stays as-is until a service request is filed.",
  withdrawn: "Withdrawn. Policy unchanged.",
};

export function noticeNextStep(status: string): string {
  return isNoticeStatus(status) ? NOTICE_NEXT_STEPS[status] : "";
}

export const NOTICE_DIARY_DISCLAIMER =
  "Notice diary only. Mailing a notice does not file a cancellation, non-renewal, or reinstatement on the Policy.";

export const CLAIM_DIARY_KINDS = [
  "follow_up",
  "insured_call",
  "carrier_status",
  "docs_requested",
  "diary_note",
] as const;
export type ClaimDiaryKind = (typeof CLAIM_DIARY_KINDS)[number];

export const CLAIM_DIARY_KIND_LABELS: Record<ClaimDiaryKind, string> = {
  follow_up: "Follow-up",
  insured_call: "Call insured",
  carrier_status: "Carrier status check",
  docs_requested: "Docs requested",
  diary_note: "Diary note",
};

export const CLAIM_DIARY_STATUSES = ["open", "completed"] as const;
export type ClaimDiaryStatus = (typeof CLAIM_DIARY_STATUSES)[number];

export const CLAIM_DIARY_STATUS_LABELS: Record<ClaimDiaryStatus, string> = {
  open: "Open",
  completed: "Completed",
};

export function isClaimDiaryKind(value: string): value is ClaimDiaryKind {
  return (CLAIM_DIARY_KINDS as readonly string[]).includes(value);
}

export function isClaimDiaryStatus(value: string): value is ClaimDiaryStatus {
  return (CLAIM_DIARY_STATUSES as readonly string[]).includes(value);
}

export function claimDiaryKindLabel(kind: string): string {
  return isClaimDiaryKind(kind) ? CLAIM_DIARY_KIND_LABELS[kind] : kind.replaceAll("_", " ");
}

export function claimDiaryStatusLabel(status: string): string {
  return isClaimDiaryStatus(status)
    ? CLAIM_DIARY_STATUS_LABELS[status]
    : status.replaceAll("_", " ");
}

export const CLAIM_DIARY_DISCLAIMER =
  "Claim diary only. Completing a follow-up does not file FNOL, change claim status, or talk to a carrier API.";

export const ENDORSEMENT_FORM_CODES = [
  "mortgagee",
  "coverage_change",
  "additional_interest",
  "other",
] as const;
export type EndorsementFormCode = (typeof ENDORSEMENT_FORM_CODES)[number];

export const ENDORSEMENT_FORM_LABELS: Record<EndorsementFormCode, string> = {
  mortgagee: "Mortgagee / additional interest wording",
  coverage_change: "Coverage change wording",
  additional_interest: "Additional insured wording",
  other: "Other endorsement wording",
};

export const ENDORSEMENT_DRAFT_STATUSES = ["drafted", "ready", "withdrawn"] as const;
export type EndorsementDraftStatus = (typeof ENDORSEMENT_DRAFT_STATUSES)[number];

export const ENDORSEMENT_DRAFT_STATUS_LABELS: Record<EndorsementDraftStatus, string> = {
  drafted: "Drafted",
  ready: "Ready to file",
  withdrawn: "Withdrawn",
};

export function isEndorsementFormCode(value: string): value is EndorsementFormCode {
  return (ENDORSEMENT_FORM_CODES as readonly string[]).includes(value);
}

export function isEndorsementDraftStatus(value: string): value is EndorsementDraftStatus {
  return (ENDORSEMENT_DRAFT_STATUSES as readonly string[]).includes(value);
}

export function endorsementFormLabel(code: string): string {
  return isEndorsementFormCode(code) ? ENDORSEMENT_FORM_LABELS[code] : code.replaceAll("_", " ");
}

export function endorsementDraftStatusLabel(status: string): string {
  return isEndorsementDraftStatus(status)
    ? ENDORSEMENT_DRAFT_STATUS_LABELS[status]
    : status.replaceAll("_", " ");
}

export const ENDORSEMENT_DRAFT_NEXT_STEPS: Record<EndorsementDraftStatus, string> = {
  drafted: "Desk wording only. Mark ready when the packet is complete. Does not file.",
  ready: "Wording is ready. File still happens on the service request — this stub does not change the Policy.",
  withdrawn: "Withdrawn. Policy unchanged.",
};

export function endorsementDraftNextStep(status: string): string {
  return isEndorsementDraftStatus(status) ? ENDORSEMENT_DRAFT_NEXT_STEPS[status] : "";
}

export const ENDORSEMENT_DRAFT_DISCLAIMER =
  "Endorsement draft stub only. Marking ready does not file the change and does not update the Policy.";

export const SUSPENSE_AGE_BUCKETS = ["current", "watch", "aging", "stale"] as const;
export type SuspenseAgeBucket = (typeof SUSPENSE_AGE_BUCKETS)[number];

export const SUSPENSE_AGE_LABELS: Record<SuspenseAgeBucket, string> = {
  current: "Current (0–7 days open)",
  watch: "Watch (8–14 days open)",
  aging: "Aging (15–29 days open)",
  stale: "Stale (30+ days open)",
};

export function isSuspenseAgeBucket(value: string): value is SuspenseAgeBucket {
  return (SUSPENSE_AGE_BUCKETS as readonly string[]).includes(value);
}

export function suspenseAgeLabel(bucket: string): string {
  return isSuspenseAgeBucket(bucket) ? SUSPENSE_AGE_LABELS[bucket] : bucket.replaceAll("_", " ");
}

export const SERVICE_TIMELINE_EVENTS = [
  "service_requested",
  "service_start",
  "service_file",
  "service_withdraw",
  "service_note",
  "coi_requested",
  "coi_issued",
  "renewal_followup",
  "renewal_queue_moved",
  "packet_task",
  "interest_added",
  "interest_removed",
  "holder_contact_saved",
  "holder_contact_archived",
  "suspense_closed",
  "notice_drafted",
  "notice_mailed",
  "notice_withdrawn",
  "endorsement_drafted",
  "endorsement_draft_ready",
  "endorsement_draft_withdrawn",
  "inspection_requested",
  "inspection_scheduled",
  "inspection_completed",
  "inspection_waived",
  "installment_scheduled",
  "installment_due",
  "installment_received",
  "installment_past_due",
  "installment_waived",
] as const;
export type ServiceTimelineEvent = (typeof SERVICE_TIMELINE_EVENTS)[number];

export const SERVICE_TIMELINE_EVENT_LABELS: Record<ServiceTimelineEvent, string> = {
  service_requested: "Service requested",
  service_start: "Service started",
  service_file: "Service filed",
  service_withdraw: "Service withdrawn",
  service_note: "Servicing note",
  coi_requested: "COI requested",
  coi_issued: "COI stub issued",
  renewal_followup: "Renewal follow-up",
  renewal_queue_moved: "Renewal queue",
  packet_task: "Packet task",
  interest_added: "Interest added",
  interest_removed: "Interest removed",
  holder_contact_saved: "Holder contact saved",
  holder_contact_archived: "Holder contact archived",
  suspense_closed: "Suspense collected",
  notice_drafted: "Notice drafted",
  notice_mailed: "Notice mailed",
  notice_withdrawn: "Notice withdrawn",
  endorsement_drafted: "Endorsement drafted",
  endorsement_draft_ready: "Endorsement ready",
  endorsement_draft_withdrawn: "Endorsement withdrawn",
  inspection_requested: "Inspection requested",
  inspection_scheduled: "Inspection scheduled",
  inspection_completed: "Inspection completed",
  inspection_waived: "Inspection waived",
  installment_scheduled: "Installment scheduled",
  installment_due: "Installment due",
  installment_received: "Installment received",
  installment_past_due: "Installment past due",
  installment_waived: "Installment waived",
};

export function isServiceTimelineEvent(value: string): value is ServiceTimelineEvent {
  return (SERVICE_TIMELINE_EVENTS as readonly string[]).includes(value);
}

export function serviceTimelineEventLabel(eventType: string): string {
  return isServiceTimelineEvent(eventType)
    ? SERVICE_TIMELINE_EVENT_LABELS[eventType]
    : eventType.replaceAll("_", " ");
}

export const SERVICE_TIMELINE_DISCLAIMER =
  "Service timeline reads the activity log on this Policy. A servicing note does not file a change and does not bind.";

export const HOLDER_CONTACT_STATUSES = ["active", "archived"] as const;
export type HolderContactStatus = (typeof HOLDER_CONTACT_STATUSES)[number];

export const HOLDER_CONTACT_STATUS_LABELS: Record<HolderContactStatus, string> = {
  active: "Active",
  archived: "Archived",
};

export function isHolderContactStatus(value: string): value is HolderContactStatus {
  return (HOLDER_CONTACT_STATUSES as readonly string[]).includes(value);
}

export function holderContactStatusLabel(status: string): string {
  return isHolderContactStatus(status)
    ? HOLDER_CONTACT_STATUS_LABELS[status]
    : status.replaceAll("_", " ");
}

export const HOLDER_CONTACT_DISCLAIMER =
  "Holder contacts are desk records only. Saving or archiving a contact does not issue a COI and does not file an endorsement.";

export const RENEWAL_QUEUE_STAGES = [
  "upcoming",
  "quoting",
  "offered",
  "accepted",
  "lost",
] as const;
export type RenewalQueueStage = (typeof RENEWAL_QUEUE_STAGES)[number];

export const RENEWAL_QUEUE_STAGE_LABELS: Record<RenewalQueueStage, string> = {
  upcoming: "Upcoming",
  quoting: "Quoting",
  offered: "Offered",
  accepted: "Accepted (stub)",
  lost: "Lost",
};

export function isRenewalQueueStage(value: string): value is RenewalQueueStage {
  return (RENEWAL_QUEUE_STAGES as readonly string[]).includes(value);
}

export function renewalQueueStageLabel(stage: string): string {
  return isRenewalQueueStage(stage)
    ? RENEWAL_QUEUE_STAGE_LABELS[stage]
    : stage.replaceAll("_", " ");
}

export const RENEWAL_QUEUE_NEXT_STEPS: Record<RenewalQueueStage, string> = {
  upcoming: "On the renewal list. Move to quoting when you start the market check — no rater.",
  quoting: "Desk quoting stub. Compare current vs proposed on the Policy. Does not bind.",
  offered: "Proposal logged in-desk. Accept does not write a new Policy.",
  accepted: "Stub only. The same Policy stays in force. No bind from this queue.",
  lost: "Logged as lost. Policy status stays as-is.",
};

export function renewalQueueNextStep(stage: string): string {
  return isRenewalQueueStage(stage) ? RENEWAL_QUEUE_NEXT_STEPS[stage] : "";
}

export const RENEWAL_QUEUE_DISCLAIMER =
  "Renewal pipeline queue stub only. Moving a card does not bind, rewrite, or cancel the Policy. No rater. Quotes are not Policies.";

export const INSPECTION_KINDS = ["four_point", "wind_mit", "roof", "photo"] as const;
export type InspectionKind = (typeof INSPECTION_KINDS)[number];

export const INSPECTION_KIND_LABELS: Record<InspectionKind, string> = {
  four_point: "4-point",
  wind_mit: "Wind mitigation",
  roof: "Roof",
  photo: "Photo / site",
};

export const INSPECTION_STATUSES = ["requested", "scheduled", "completed", "waived"] as const;
export type InspectionStatus = (typeof INSPECTION_STATUSES)[number];

export const INSPECTION_STATUS_LABELS: Record<InspectionStatus, string> = {
  requested: "Requested",
  scheduled: "Scheduled",
  completed: "Completed",
  waived: "Waived",
};

export function isInspectionKind(value: string): value is InspectionKind {
  return (INSPECTION_KINDS as readonly string[]).includes(value);
}

export function isInspectionStatus(value: string): value is InspectionStatus {
  return (INSPECTION_STATUSES as readonly string[]).includes(value);
}

export function inspectionKindLabel(kind: string): string {
  return isInspectionKind(kind) ? INSPECTION_KIND_LABELS[kind] : kind.replaceAll("_", " ");
}

export function inspectionStatusLabel(status: string): string {
  return isInspectionStatus(status) ? INSPECTION_STATUS_LABELS[status] : status.replaceAll("_", " ");
}

export const INSPECTION_NEXT_STEPS: Record<InspectionStatus, string> = {
  requested: "Queued. Schedule when the vendor is booked. Does not file an endorsement.",
  scheduled: "On the calendar. Complete or waive after the visit. Policy stays in force.",
  completed: "Logged complete. Upload the report on the Deal or Policy files — this diary does not file.",
  waived: "Waived. Policy unchanged.",
};

export function inspectionNextStep(status: string): string {
  return isInspectionStatus(status) ? INSPECTION_NEXT_STEPS[status] : "";
}

export const INSPECTION_DISCLAIMER =
  "Inspection diary only. Scheduling, completing, or waiving does not file an endorsement and does not bind.";

export const BILL_TYPES = ["agency_bill", "direct_bill"] as const;
export type BillType = (typeof BILL_TYPES)[number];

export const BILL_TYPE_LABELS: Record<BillType, string> = {
  agency_bill: "Agency bill",
  direct_bill: "Direct bill",
};

export const INSTALLMENT_STATUSES = [
  "scheduled",
  "due",
  "received",
  "past_due",
  "waived",
] as const;
export type InstallmentStatus = (typeof INSTALLMENT_STATUSES)[number];

export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  scheduled: "Scheduled",
  due: "Due",
  received: "Received (stub)",
  past_due: "Past due",
  waived: "Waived",
};

export function isBillType(value: string): value is BillType {
  return (BILL_TYPES as readonly string[]).includes(value);
}

export function isInstallmentStatus(value: string): value is InstallmentStatus {
  return (INSTALLMENT_STATUSES as readonly string[]).includes(value);
}

export function billTypeLabel(value: string): string {
  return isBillType(value) ? BILL_TYPE_LABELS[value] : value.replaceAll("_", " ");
}

export function installmentStatusLabel(status: string): string {
  return isInstallmentStatus(status)
    ? INSTALLMENT_STATUS_LABELS[status]
    : status.replaceAll("_", " ");
}

export const INSTALLMENT_NEXT_STEPS: Record<InstallmentStatus, string> = {
  scheduled: "On the installment diary. Mark due when the carrier statement posts. No Stripe.",
  due: "Owed on the desk diary. Mark received after the carrier or insured pays — this does not collect.",
  received: "Logged as received. No money moved. Policy status stays as-is.",
  past_due: "Past due on the diary. Follow up in-desk. Does not cancel the Policy.",
  waived: "Waived. Policy unchanged.",
};

export function installmentNextStep(status: string): string {
  return isInstallmentStatus(status) ? INSTALLMENT_NEXT_STEPS[status] : "";
}

export const INSTALLMENT_DISCLAIMER =
  "Installment diary only. Marking received does not collect a payment, does not talk to Stripe, and does not change Policy status.";

export function isInterestKind(value: string): value is InterestKind {
  return (INTEREST_KINDS as readonly string[]).includes(value);
}

export function interestKindLabel(kind: string): string {
  return isInterestKind(kind) ? INTEREST_KIND_LABELS[kind] : kind.replaceAll("_", " ");
}

export const PERSONAL_LINES = ["HO", "AUTO", "FLOOD", "UMBRELLA", "LANDLORD"] as const;

export function isPersonalLinesCode(lineOfBusiness: string): boolean {
  return (PERSONAL_LINES as readonly string[]).includes(appointmentLine(lineOfBusiness));
}

export const SERVICING_TASK_KINDS: Record<ServicingDocKey, string> = {
  dec: "servicing_dec",
  id_card: "servicing_id_card",
  aor: "servicing_aor",
};

export const SERVICE_REQUEST_TASK_KIND = "service_request";

export function servicingTaskKind(key: ServicingDocKey): string {
  return SERVICING_TASK_KINDS[key];
}

export function servicingDocKeyFromTaskKind(kind: string): ServicingDocKey | null {
  const found = (SERVICING_DOC_KEYS as readonly string[]).find(
    (key) => SERVICING_TASK_KINDS[key as ServicingDocKey] === kind,
  );
  return (found as ServicingDocKey | undefined) ?? null;
}
