export const LEAD_OFFER_STATUSES = ["open", "awarded", "withdrawn"] as const;
export type LeadOfferStatus = (typeof LEAD_OFFER_STATUSES)[number];

export function parseLeadOfferStatus(raw: string | null | undefined): LeadOfferStatus {
  if (raw && (LEAD_OFFER_STATUSES as readonly string[]).includes(raw)) {
    return raw as LeadOfferStatus;
  }
  return "open";
}

export function canClaimOffer(status: string, alreadyClaimed: boolean): boolean {
  return parseLeadOfferStatus(status) === "open" && !alreadyClaimed;
}

export function canAwardOffer(status: string): boolean {
  return parseLeadOfferStatus(status) === "open";
}

export function offerStatusLabel(status: string): string {
  const value = parseLeadOfferStatus(status);
  if (value === "awarded") return "Awarded";
  if (value === "withdrawn") return "Withdrawn";
  return "Open";
}
