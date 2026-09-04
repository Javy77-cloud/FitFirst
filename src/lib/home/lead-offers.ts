import { splitNamedInsured } from "@/lib/lifecycle/lead-match";

export const LEAD_OFFER_STATUSES = ["open", "claimed", "awarded", "withdrawn"] as const;
export type LeadOfferStatus = (typeof LEAD_OFFER_STATUSES)[number];

export const LEAD_OFFER_KINDS = ["referral", "inbound_email"] as const;
export type LeadOfferKind = (typeof LEAD_OFFER_KINDS)[number];

export const LEAD_OFFER_RELATIONS = ["know_client", "new_lead"] as const;
export type LeadOfferRelation = (typeof LEAD_OFFER_RELATIONS)[number];

export function parseLeadOfferStatus(raw: string | null | undefined): LeadOfferStatus {
  if (raw && (LEAD_OFFER_STATUSES as readonly string[]).includes(raw)) {
    return raw as LeadOfferStatus;
  }
  return "open";
}

export function parseLeadOfferKind(raw: string | null | undefined): LeadOfferKind {
  if (raw && (LEAD_OFFER_KINDS as readonly string[]).includes(raw)) {
    return raw as LeadOfferKind;
  }
  return "referral";
}

export function parseLeadOfferRelation(raw: string | null | undefined): LeadOfferRelation | null {
  if (raw && (LEAD_OFFER_RELATIONS as readonly string[]).includes(raw)) {
    return raw as LeadOfferRelation;
  }
  return null;
}

export function canClaimOffer(status: string, alreadyClaimed: boolean, kind?: string | null): boolean {
  if (parseLeadOfferKind(kind) === "inbound_email") return false;
  return parseLeadOfferStatus(status) === "open" && !alreadyClaimed;
}

export function canTakeOwnership(status: string, kind?: string | null): boolean {
  return parseLeadOfferKind(kind) === "inbound_email" && parseLeadOfferStatus(status) === "open";
}

export function canAwardOffer(status: string, kind?: string | null): boolean {
  if (parseLeadOfferKind(kind) === "inbound_email") return false;
  return parseLeadOfferStatus(status) === "open";
}

export function offerStatusLabel(status: string): string {
  const value = parseLeadOfferStatus(status);
  if (value === "awarded") return "Awarded";
  if (value === "withdrawn") return "Withdrawn";
  if (value === "claimed") return "Claimed";
  return "Open";
}

export function claimRelationLabel(relation: string | null | undefined): string | null {
  if (relation === "know_client") return "I know this client";
  if (relation === "new_lead") return "New lead";
  return null;
}

function emailLocalToName(email: string): string {
  return (email.split("@")[0] ?? "").replace(/[._+]+/g, " ").trim();
}

/** Parse "Name <email@x>" or a bare address into a Lead identity. Name-only never matches later. */
export function parseEmailFrom(raw: string | null | undefined): {
  firstName: string;
  lastName: string;
  email: string | null;
  displayName: string;
} {
  const value = (raw ?? "").trim();
  if (!value) return { firstName: "Unknown", lastName: "Lead", email: null, displayName: "" };

  const angled = /^(.*?)\s*<([^<>\s]+@[^<>\s]+)>\s*$/.exec(value);
  if (angled) {
    const email = angled[2].trim().toLowerCase();
    const name = angled[1].replace(/^["']|["']$/g, "").trim();
    const { firstName, lastName } = splitNamedInsured(name || emailLocalToName(email));
    return { firstName, lastName, email, displayName: name || email };
  }

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    const email = value.toLowerCase();
    const { firstName, lastName } = splitNamedInsured(emailLocalToName(email));
    return { firstName, lastName, email, displayName: email };
  }

  const { firstName, lastName } = splitNamedInsured(value);
  return { firstName, lastName, email: null, displayName: value };
}
