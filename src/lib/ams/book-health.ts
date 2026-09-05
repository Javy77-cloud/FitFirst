import { isEndedStatus, isInForceStatus } from "@/lib/policy/status";
import { scoreRenewalRisk, type RenewalRiskBand } from "@/lib/renewal-risk/score";
import {
  appointmentLine,
  SERVICING_DOC_LABELS,
  type ServicingDocKey,
} from "@/lib/domain-ams";
import { missingServicingDocs, type ServicingFile } from "./checklist";
import { daysUntilExpiration, expirationDay } from "./renewals";
import { DESK_AS_OF } from "@/lib/home/as-of";

export type BookPolicy = {
  id: string;
  policyNumber: string;
  status: string;
  lineOfBusiness: string;
  expirationDate: Date | string | null;
  partyName: string;
  partyKey?: string;
  ownerId?: string | null;
  ownerName?: string;
  premium?: string | null;
  currentPremium?: string | null;
  proposedPremium?: string | null;
  premiumChangePct?: number | null;
};

export type BookHealthCounts = {
  active: number;
  lapsed: number;
  other: number;
  total: number;
};

export type MissingDocRow = {
  policyId: string;
  policyNumber: string;
  partyName: string;
  missing: ServicingDocKey[];
  labels: string[];
};

export type OwnedBookPolicy = BookPolicy & {
  ownerId: string | null;
  ownerName: string;
};

export type ProducerBookRow = {
  ownerId: string | null;
  ownerName: string;
  counts: BookHealthCounts;
  missingCount: number;
};

export type ProducerRollup = {
  ownerId: string | null;
  ownerName: string;
  active: number;
  lapsed: number;
  lapseRisk: number;
  monoline: number;
  missingDec: number;
};

export type MonolineGapRow = {
  partyKey: string;
  partyName: string;
  ownerName: string;
  line: string;
  policyId: string;
  policyNumber: string;
};

export type LapseRiskRow = {
  policyId: string;
  policyNumber: string;
  partyName: string;
  ownerName: string;
  daysToRenewal: number | null;
  score: number;
  band: RenewalRiskBand;
  label: string;
};

export function isLapsedBookStatus(status: string): boolean {
  const raw = status.toLowerCase();
  if (isEndedStatus(raw)) return true;
  return raw === "lapsed" || raw === "expired" || raw === "cancelled" || raw === "canceled";
}

export function bookHealthCounts(policies: { status: string }[]): BookHealthCounts {
  let active = 0;
  let lapsed = 0;
  let other = 0;
  for (const policy of policies) {
    if (isInForceStatus(policy.status)) active += 1;
    else if (isLapsedBookStatus(policy.status)) lapsed += 1;
    else other += 1;
  }
  return { active, lapsed, other, total: policies.length };
}

export function missingDocRows(
  policies: BookPolicy[],
  filesByPolicy: Map<string, ServicingFile[]>,
): MissingDocRow[] {
  const rows: MissingDocRow[] = [];
  for (const policy of policies) {
    if (!isInForceStatus(policy.status)) continue;
    const missing = missingServicingDocs(filesByPolicy.get(policy.id) ?? []);
    if (missing.length === 0) continue;
    rows.push({
      policyId: policy.id,
      policyNumber: policy.policyNumber,
      partyName: policy.partyName,
      missing,
      labels: missing.map((key) => SERVICING_DOC_LABELS[key]),
    });
  }
  rows.sort((a, b) => b.missing.length - a.missing.length || a.policyNumber.localeCompare(b.policyNumber));
  return rows;
}

export function filterOwnedBook(
  policies: OwnedBookPolicy[],
  ownerId?: string | null,
): OwnedBookPolicy[] {
  if (!ownerId) return policies;
  if (ownerId === "unassigned") return policies.filter((policy) => !policy.ownerId);
  return policies.filter((policy) => policy.ownerId === ownerId);
}

export function producerBookRows(
  policies: OwnedBookPolicy[],
  filesByPolicy: Map<string, ServicingFile[]>,
): { agency: BookHealthCounts; producers: ProducerBookRow[] } {
  const agency = bookHealthCounts(policies);
  const grouped = new Map<string, OwnedBookPolicy[]>();
  for (const policy of policies) {
    const key = policy.ownerId ?? "unassigned";
    const list = grouped.get(key) ?? [];
    list.push(policy);
    grouped.set(key, list);
  }
  const missing = missingDocRows(policies, filesByPolicy);
  const missingByOwner = new Map<string, number>();
  for (const row of missing) {
    const policy = policies.find((item) => item.id === row.policyId);
    const key = policy?.ownerId ?? "unassigned";
    missingByOwner.set(key, (missingByOwner.get(key) ?? 0) + 1);
  }
  const producers: ProducerBookRow[] = [...grouped.entries()].map(([key, rows]) => ({
    ownerId: key === "unassigned" ? null : key,
    ownerName: rows[0]?.ownerName || "Unassigned",
    counts: bookHealthCounts(rows),
    missingCount: missingByOwner.get(key) ?? 0,
  }));
  producers.sort(
    (a, b) => b.counts.active - a.counts.active || a.ownerName.localeCompare(b.ownerName),
  );
  return { agency, producers };
}

export function missingDecRows(rows: MissingDocRow[]): MissingDocRow[] {
  return rows.filter((row) => row.missing.includes("dec"));
}

export function monolineGaps(policies: BookPolicy[]): MonolineGapRow[] {
  const byParty = new Map<string, BookPolicy[]>();
  for (const policy of policies) {
    if (!isInForceStatus(policy.status)) continue;
    const key = policy.partyKey || policy.partyName;
    const list = byParty.get(key) ?? [];
    list.push(policy);
    byParty.set(key, list);
  }
  const rows: MonolineGapRow[] = [];
  for (const [partyKey, list] of byParty) {
    const lines = new Set(list.map((row) => appointmentLine(row.lineOfBusiness)));
    if (lines.size !== 1) continue;
    const policy = list[0];
    rows.push({
      partyKey,
      partyName: policy.partyName,
      ownerName: policy.ownerName ?? "Unassigned",
      line: appointmentLine(policy.lineOfBusiness),
      policyId: policy.id,
      policyNumber: policy.policyNumber,
    });
  }
  rows.sort((a, b) => a.partyName.localeCompare(b.partyName));
  return rows;
}

export function lapseRiskRows(
  policies: BookPolicy[],
  asOf = DESK_AS_OF,
): LapseRiskRow[] {
  const inForceByParty = new Map<string, BookPolicy[]>();
  for (const policy of policies) {
    const key = policy.partyKey || policy.partyName;
    const list = inForceByParty.get(key) ?? [];
    list.push(policy);
    inForceByParty.set(key, list);
  }
  const rows: LapseRiskRow[] = [];
  for (const policy of policies) {
    if (!isInForceStatus(policy.status)) continue;
    const exp = expirationDay(policy.expirationDate);
    const days = exp ? daysUntilExpiration(exp, asOf) : null;
    const household = inForceByParty.get(policy.partyKey || policy.partyName) ?? [policy];
    const scored = scoreRenewalRisk({
      daysToRenewal: days,
      premiumChangePct: policy.premiumChangePct ?? null,
      inForceCount: household.filter((row) => isInForceStatus(row.status)).length,
      hasLapseHistory: household.some((row) => isLapsedBookStatus(row.status)),
      daysSinceContact: null,
    });
    if (!scored.flagged) continue;
    rows.push({
      policyId: policy.id,
      policyNumber: policy.policyNumber,
      partyName: policy.partyName,
      ownerName: policy.ownerName ?? "Unassigned",
      daysToRenewal: days,
      score: scored.score,
      band: scored.band,
      label: scored.label,
    });
  }
  rows.sort((a, b) => b.score - a.score || (a.daysToRenewal ?? 999) - (b.daysToRenewal ?? 999));
  return rows;
}

export function producerRollups(
  policies: BookPolicy[],
  missingDecIds: Set<string>,
  lapseRiskIds: Set<string>,
  monolinePartyKeys: Set<string>,
): { agency: ProducerRollup; producers: ProducerRollup[] } {
  const byOwner = new Map<string, ProducerRollup>();
  const agency: ProducerRollup = {
    ownerId: null,
    ownerName: "Agency",
    active: 0,
    lapsed: 0,
    lapseRisk: 0,
    monoline: 0,
    missingDec: 0,
  };

  for (const policy of policies) {
    const key = policy.ownerId ?? "unassigned";
    const existing = byOwner.get(key) ?? {
      ownerId: policy.ownerId ?? null,
      ownerName: policy.ownerName ?? "Unassigned",
      active: 0,
      lapsed: 0,
      lapseRisk: 0,
      monoline: 0,
      missingDec: 0,
    };
    if (isInForceStatus(policy.status)) existing.active += 1;
    else if (isLapsedBookStatus(policy.status)) existing.lapsed += 1;
    if (lapseRiskIds.has(policy.id)) existing.lapseRisk += 1;
    if (missingDecIds.has(policy.id)) existing.missingDec += 1;
    const partyKey = policy.partyKey || policy.partyName;
    if (isInForceStatus(policy.status) && monolinePartyKeys.has(partyKey)) {
      existing.monoline += 1;
    }
    byOwner.set(key, existing);
  }

  for (const row of byOwner.values()) {
    agency.active += row.active;
    agency.lapsed += row.lapsed;
    agency.lapseRisk += row.lapseRisk;
    agency.monoline += row.monoline;
    agency.missingDec += row.missingDec;
  }

  const producers = [...byOwner.values()].sort(
    (a, b) => b.active - a.active || a.ownerName.localeCompare(b.ownerName),
  );
  return { agency, producers };
}
