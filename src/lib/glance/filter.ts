import {
  IN_FORCE_STATUSES,
  OPEN_QUOTE_STAGES,
  QUOTE_SENT_STAGES,
} from "@/lib/home/aggregate";
import { addUtcDays } from "@/lib/home/as-of";
import { parseGlanceTab, type GlanceTab } from "./tabs";

export type GlanceRecord = {
  id: string;
  tab: GlanceTab;
  kind: string;
  title: string;
  status: string;
  href: string;
  party: string;
  ownerId: string | null;
  ownerName: string | null;
  detail: string;
  when: Date | null;
  premium?: number | null;
};

export type GlanceDeal = {
  id: string;
  title: string;
  pipelineStage: string;
  lineOfBusiness: string;
  ownerId: string | null;
  ownerName?: string | null;
  party: string;
  updatedAt: Date;
  archivedAt?: Date | null;
};

export type GlancePolicy = {
  id: string;
  policyNumber: string;
  status: string;
  lineOfBusiness: string;
  ownerId: string | null;
  ownerName?: string | null;
  party: string;
  premium: number;
  expirationDate: Date;
};

export type GlanceClaim = {
  id: string;
  status: string;
  causeType: string | null;
  carrierClaimNumber: string | null;
  description: string | null;
  dateReported: Date | null;
  policyNumber: string | null;
  party: string;
  ownerId: string | null;
  ownerName?: string | null;
};

export type GlanceServiceItem = {
  id: string;
  kind: "task" | "endorsement" | "work";
  title: string;
  status: string;
  href: string;
  party: string;
  ownerId: string | null;
  ownerName?: string | null;
  detail: string;
  when: Date | null;
};

export function isOpenShopStage(stage: string): boolean {
  const s = stage.toLowerCase();
  return OPEN_QUOTE_STAGES.has(s) || QUOTE_SENT_STAGES.has(s);
}

export function isRenewalPolicy(status: string, expiration: Date, asOf: Date, days = 60): boolean {
  if (!IN_FORCE_STATUSES.has(status.toLowerCase())) return false;
  return expiration > asOf && expiration <= addUtcDays(asOf, days);
}

export function salesRows(deals: GlanceDeal[]): GlanceRecord[] {
  return deals
    .filter((deal) => !deal.archivedAt && isOpenShopStage(deal.pipelineStage))
    .map((deal) => ({
      id: deal.id,
      tab: "sales" as const,
      kind: "deal",
      title: deal.title,
      status: deal.pipelineStage.replaceAll("_", " "),
      href: `/deals/${deal.id}`,
      party: deal.party,
      ownerId: deal.ownerId,
      ownerName: deal.ownerName ?? null,
      detail: deal.lineOfBusiness,
      when: deal.updatedAt,
    }));
}

export function serviceRows(items: GlanceServiceItem[]): GlanceRecord[] {
  return items.map((item) => ({
    id: item.id,
    tab: "service" as const,
    kind: item.kind,
    title: item.title,
    status: item.status.replaceAll("_", " "),
    href: item.href,
    party: item.party,
    ownerId: item.ownerId,
    ownerName: item.ownerName ?? null,
    detail: item.detail,
    when: item.when,
  }));
}

export function claimsRows(claims: GlanceClaim[]): GlanceRecord[] {
  return claims.map((claim) => ({
    id: claim.id,
    tab: "claims" as const,
    kind: "claim",
    title: claim.carrierClaimNumber ?? claim.causeType ?? "Claim notice",
    status: claim.status.replaceAll("_", " "),
    href: `/claims/${claim.id}`,
    party: claim.party,
    ownerId: claim.ownerId,
    ownerName: claim.ownerName ?? null,
    detail: [claim.policyNumber, claim.description].filter(Boolean).join(" · "),
    when: claim.dateReported,
  }));
}

export function renewalRows(policies: GlancePolicy[], asOf: Date, days = 60): GlanceRecord[] {
  return policies
    .filter((policy) => isRenewalPolicy(policy.status, policy.expirationDate, asOf, days))
    .map((policy) => ({
      id: policy.id,
      tab: "renewals" as const,
      kind: "policy",
      title: policy.policyNumber,
      status: policy.status,
      href: `/policies/${policy.id}`,
      party: policy.party,
      ownerId: policy.ownerId,
      ownerName: policy.ownerName ?? null,
      detail: `${policy.lineOfBusiness} · expires ${policy.expirationDate.toISOString().slice(0, 10)}`,
      when: policy.expirationDate,
      premium: policy.premium,
    }));
}

export function filterOwned(rows: GlanceRecord[], opts: { isAdmin: boolean; userId: string | null }): GlanceRecord[] {
  if (opts.isAdmin) return rows;
  if (!opts.userId) return [];
  return rows.filter((row) => row.ownerId === opts.userId);
}

export function rowsForTab(
  tab: GlanceTab | string | null | undefined,
  input: {
    deals: GlanceDeal[];
    service: GlanceServiceItem[];
    claims: GlanceClaim[];
    policies: GlancePolicy[];
    asOf: Date;
  },
): GlanceRecord[] {
  const next = parseGlanceTab(typeof tab === "string" ? tab : tab ?? undefined);
  if (next === "sales") return salesRows(input.deals);
  if (next === "service") return serviceRows(input.service);
  if (next === "claims") return claimsRows(input.claims);
  return renewalRows(input.policies, input.asOf);
}
