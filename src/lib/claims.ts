import {
  CLAIM_CAUSES,
  CLAIM_REPORT_CHANNELS,
  CLAIM_STATUSES,
  type ClaimCause,
  type ClaimReportChannel,
  type ClaimStatus,
} from "@/lib/domain";

export const OPEN_CLAIM_STATUSES: readonly ClaimStatus[] = ["inquiry", "referred_to_carrier"];

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

export function claimCountsLabel(summary: { total: number; open: number }): string {
  if (summary.total === 0) return "0 claims";
  const claimWord = summary.total === 1 ? "claim" : "claims";
  const openWord = summary.open === 1 ? "open claim" : "open claims";
  return `${summary.total} ${claimWord} · ${summary.open} ${openWord}`;
}
