import type { PolicyChangeKind } from "@/lib/policy/status";

export const PORTAL_KINDS = ["personal", "commercial"] as const;
export type PortalKind = (typeof PORTAL_KINDS)[number];

export const PORTAL_REQUEST_KINDS = ["coi", "policy_change"] as const;
export type PortalRequestKind = (typeof PORTAL_REQUEST_KINDS)[number];

export const PORTAL_REQUEST_STATUSES = ["open", "reused", "queued", "done"] as const;
export type PortalRequestStatus = (typeof PORTAL_REQUEST_STATUSES)[number];

export type CoiRequestPayload = {
  holderName: string;
  holderAddress: string;
  jobLocation: string | null;
  reusedCertificateId?: string;
  reusedCertificateNumber?: string;
};

export type PolicyChangePayload = {
  changeKind: PolicyChangeKind;
  effectiveDate: string;
  reason: string;
  reasonLabel: string;
  summary: string;
  policyNumber: string;
};

export type PortalRequestPayload = CoiRequestPayload | PolicyChangePayload;

export function isPortalKind(value: string): value is PortalKind {
  return (PORTAL_KINDS as readonly string[]).includes(value);
}

export function isPortalRequestKind(value: string): value is PortalRequestKind {
  return (PORTAL_REQUEST_KINDS as readonly string[]).includes(value);
}

export function normalizeHolderName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}
