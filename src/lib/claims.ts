import {
  CLAIM_CAUSES,
  CLAIM_REPORT_CHANNELS,
  CLAIM_STATUSES,
  type ClaimCause,
  type ClaimReportChannel,
  type ClaimStatus,
} from "@/lib/domain";

export const OPEN_CLAIM_STATUSES: readonly ClaimStatus[] = ["inquiry", "referred_to_carrier"];

export const CLAIM_PIPELINE: readonly ClaimStatus[] = CLAIM_STATUSES;

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  inquiry: "Inquiry",
  referred_to_carrier: "Referred to carrier",
  closed: "Closed",
};

export const CLAIM_CAUSE_LABELS: Record<ClaimCause, string> = {
  fire: "Fire",
  water: "Water",
  wind: "Wind",
  hail: "Hail",
  theft: "Theft",
  auto_accident: "Auto accident",
  liability: "Liability",
  other: "Other",
};

export const CLAIM_CHANNEL_LABELS: Record<ClaimReportChannel, string> = {
  phone: "Phone",
  in_office: "In office",
  email: "Email",
  portal: "Portal",
};

export const CLAIMS_DESK_COPY =
  "Handle the claim on the carrier website. FitFirst is a broker desk log — not a claims shop. We do not take FNOL for the carrier, set reserves, or issue payments.";

export const FNOL_INTAKE_COPY =
  "First notice for the agency log. Link the Policy and Contact, record what happened, and keep the carrier claim number when they have one. Then send the insured to the carrier site. FitFirst does not file FNOL, set reserves, or assign adjusters.";

export const CLAIM_SHOP_FIELDS = ["reserve", "reserves", "adjuster", "adjusterId", "payment"] as const;

export function isClaimStatus(value: string): value is ClaimStatus {
  return (CLAIM_STATUSES as readonly string[]).includes(value);
}

export function isClaimCause(value: string): value is ClaimCause {
  return (CLAIM_CAUSES as readonly string[]).includes(value);
}

export function isClaimChannel(value: string): value is ClaimReportChannel {
  return (CLAIM_REPORT_CHANNELS as readonly string[]).includes(value);
}

export function isOpenClaimStatus(status: string): boolean {
  return (OPEN_CLAIM_STATUSES as readonly string[]).includes(status);
}

export function claimStatusLabel(status: string): string {
  return isClaimStatus(status) ? CLAIM_STATUS_LABELS[status] : status;
}

export function claimCauseLabel(cause: string): string {
  return isClaimCause(cause) ? CLAIM_CAUSE_LABELS[cause] : cause;
}

export function claimChannelLabel(channel: string): string {
  return isClaimChannel(channel) ? CLAIM_CHANNEL_LABELS[channel] : channel;
}

export function summarizeClaims(rows: { status: string }[]): {
  total: number;
  open: number;
} {
  let open = 0;
  for (const row of rows) {
    if (isOpenClaimStatus(row.status)) open += 1;
  }
  return { total: rows.length, open };
}

export function summarizeClaimPipeline(rows: { status: string }[]): Record<ClaimStatus, number> {
  const counts: Record<ClaimStatus, number> = {
    inquiry: 0,
    referred_to_carrier: 0,
    closed: 0,
  };
  for (const row of rows) {
    if (isClaimStatus(row.status)) counts[row.status] += 1;
  }
  return counts;
}

export function nextClaimStatus(status: string): ClaimStatus | null {
  if (status === "inquiry") return "referred_to_carrier";
  if (status === "referred_to_carrier") return "closed";
  return null;
}

/** Link both sides. A picked policy fills contact when the form left contact blank. */
export function linkClaimParties(input: {
  policyId?: string | null;
  contactId?: string | null;
  policyContactId?: string | null;
}): { policyId: string | null; contactId: string | null } {
  const policyId = input.policyId?.trim() || null;
  const contactId = input.contactId?.trim() || input.policyContactId?.trim() || null;
  return { policyId, contactId };
}

export function resolveClaimProducerId(input: {
  policyOwnerId?: string | null;
  contactOwnerId?: string | null;
  explicitProducerId?: string | null;
}): string | null {
  return input.explicitProducerId?.trim() || input.policyOwnerId?.trim() || input.contactOwnerId?.trim() || null;
}

export function shouldNotifyProducer(flag?: string | boolean | null): boolean {
  if (flag === false || flag === "0" || flag === "false") return false;
  return true;
}

export function claimNotifyCopy(input: {
  cause: string;
  party: string;
  policyNumber?: string | null;
  carrierClaimNumber?: string | null;
  status: string;
}): { kind: "fnol"; title: string; body: string } {
  const party = input.party.trim() || "Insured";
  const policyBit = input.policyNumber?.trim() ? ` · ${input.policyNumber.trim()}` : "";
  const carrierBit = input.carrierClaimNumber?.trim()
    ? ` Carrier claim ${input.carrierClaimNumber.trim()}.`
    : "";
  return {
    kind: "fnol",
    title: `FNOL · ${party}${policyBit}`,
    body: `${claimCauseLabel(input.cause)} notice is ${claimStatusLabel(input.status).toLowerCase()}.${carrierBit} In-desk only — handle FNOL on the carrier site.`,
  };
}

/** Stub create payload — policy is optional so /claims/new can save a row. */
export function claimCreateValues(input: {
  policyId?: string | null;
  dateReported?: string;
  causeType?: string;
  status?: string;
  description?: string | null;
}) {
  return {
    policyId: input.policyId?.trim() || null,
    dateReported: input.dateReported?.trim() || new Date().toISOString().slice(0, 10),
    causeType: input.causeType?.trim() || "other",
    status: input.status?.trim() || "inquiry",
    description: input.description?.trim() || null,
  };
}

export function fnolIntakeValues(input: {
  policyId?: string | null;
  contactId?: string | null;
  policyContactId?: string | null;
  dateReported?: string;
  dateOfLoss?: string | null;
  causeType?: string;
  status?: string;
  description?: string | null;
  reportedHow?: string;
  carrierClaimNumber?: string | null;
  lossLocation?: string | null;
  reporterName?: string | null;
  reporterPhone?: string | null;
  notifyProducer?: string | boolean | null;
}) {
  const parties = linkClaimParties(input);
  return {
    ...parties,
    dateReported: input.dateReported?.trim() || new Date().toISOString().slice(0, 10),
    dateOfLoss: input.dateOfLoss?.trim() || null,
    causeType: input.causeType?.trim() || "other",
    status: input.status?.trim() || "inquiry",
    description: input.description?.trim() || null,
    reportedHow: input.reportedHow?.trim() || "phone",
    carrierClaimNumber: input.carrierClaimNumber?.trim() || null,
    lossLocation: input.lossLocation?.trim() || null,
    reporterName: input.reporterName?.trim() || null,
    reporterPhone: input.reporterPhone?.trim() || null,
    notifyProducer: shouldNotifyProducer(input.notifyProducer),
  };
}

export function claimCountsLabel(summary: { total: number; open: number }): string {
  if (summary.total === 0) return "0 claims";
  const claimWord = summary.total === 1 ? "claim" : "claims";
  const openWord = summary.open === 1 ? "open claim" : "open claims";
  return `${summary.total} ${claimWord} · ${summary.open} ${openWord}`;
}

export function claimHasShopFields(payload: Record<string, unknown>): boolean {
  return CLAIM_SHOP_FIELDS.some((key) => key in payload);
}
