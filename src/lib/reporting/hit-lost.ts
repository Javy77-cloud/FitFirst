import {
  LOST_BUSINESS_REASON_LABELS,
  isLostBusinessReason,
  type LostBusinessReason,
} from "@/lib/domain";

export type HitLostAttempt = {
  id: string;
  dealId: string;
  carrierId: string;
  carrierName: string;
  result: string | null;
  bindable: boolean;
  premium: number | null;
  lostReason: string | null;
};

export type HitLostQuote = {
  id: string;
  dealId: string;
  carrierId: string;
  carrierName: string;
  premium: number | null;
  lostReason: string | null;
};

export type HitLostPolicy = {
  dealId: string | null;
  carrierId: string | null;
  carrierName: string | null;
};

export type HitLostDeal = {
  id: string;
  stage: string;
};

export type CarrierPerfRow = {
  carrierId: string;
  carrierName: string;
  quoted: number;
  declined: number;
  bound: number;
  hitPct: number | null;
  avgQuotedPremium: number | null;
};

export type LostReasonRow = {
  reason: LostBusinessReason;
  label: string;
  count: number;
};

export type HitLostReport = {
  quotedCount: number;
  declinedCount: number;
  boundCount: number;
  shopsQuoted: number;
  shopsBound: number;
  quoteHitPct: number | null;
  shopHitPct: number | null;
  carriers: CarrierPerfRow[];
  lostReasons: LostReasonRow[];
  uncodedLost: number;
};

const SKIP = new Set(["floor_only", "takeout_only", "portal_closed", "maybe", "skip"]);

export function isQuotedResult(result: string | null | undefined): boolean {
  return result === "quoted";
}

export function isDeclinedResult(result: string | null | undefined): boolean {
  return result === "declined" || result === "lost" || result === "closed_lost";
}

export function isSkipResult(result: string | null | undefined): boolean {
  return result != null && SKIP.has(result);
}

export function hitPct(bound: number, quoted: number): number | null {
  if (quoted <= 0 || bound < 0) return null;
  const raw = Math.round((bound / quoted) * 1000) / 10;
  return Math.min(100, raw);
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
}

export function buildHitLostReport(input: {
  attempts: HitLostAttempt[];
  quotes: HitLostQuote[];
  policies: HitLostPolicy[];
  deals?: HitLostDeal[];
}): HitLostReport {
  const quotedDealIds = new Set<string>();
  const declinedDealIds = new Set<string>();
  const boundDealIds = new Set<string>();

  const quotedKeys = new Set<string>();
  const declinedKeys = new Set<string>();

  type Bucket = {
    carrierId: string;
    carrierName: string;
    quoted: number;
    declined: number;
    bound: number;
    premiums: number[];
  };
  const byCarrier = new Map<string, Bucket>();

  function bucket(carrierId: string, carrierName: string): Bucket {
    const existing = byCarrier.get(carrierId);
    if (existing) {
      if (carrierName && existing.carrierName === carrierId) existing.carrierName = carrierName;
      return existing;
    }
    const row: Bucket = {
      carrierId,
      carrierName: carrierName || carrierId,
      quoted: 0,
      declined: 0,
      bound: 0,
      premiums: [],
    };
    byCarrier.set(carrierId, row);
    return row;
  }

  for (const attempt of input.attempts) {
    const key = `${attempt.dealId}:${attempt.carrierId}`;
    if (isQuotedResult(attempt.result)) {
      quotedKeys.add(key);
      quotedDealIds.add(attempt.dealId);
      const b = bucket(attempt.carrierId, attempt.carrierName);
      b.quoted += 1;
      if (attempt.premium != null) b.premiums.push(attempt.premium);
    } else if (isDeclinedResult(attempt.result)) {
      declinedKeys.add(key);
      declinedDealIds.add(attempt.dealId);
      bucket(attempt.carrierId, attempt.carrierName).declined += 1;
    }
  }

  for (const quote of input.quotes) {
    const key = `${quote.dealId}:${quote.carrierId}`;
    if (quotedKeys.has(key)) continue;
    quotedKeys.add(key);
    quotedDealIds.add(quote.dealId);
    const b = bucket(quote.carrierId, quote.carrierName);
    b.quoted += 1;
    if (quote.premium != null) b.premiums.push(quote.premium);
  }

  const boundKeys = new Set<string>();
  for (const policy of input.policies) {
    if (!policy.dealId || !policy.carrierId) continue;
    const key = `${policy.dealId}:${policy.carrierId}`;
    if (boundKeys.has(key)) continue;
    boundKeys.add(key);
    boundDealIds.add(policy.dealId);
    if (!quotedKeys.has(key)) continue;
    bucket(policy.carrierId, policy.carrierName ?? policy.carrierId).bound += 1;
  }

  const quotedCount = quotedKeys.size;
  const declinedCount = declinedKeys.size;
  const boundCount = [...boundKeys].filter((key) => quotedKeys.has(key)).length;
  const shopsQuoted = quotedDealIds.size;
  const shopsBound = [...boundDealIds].filter((id) => quotedDealIds.has(id)).length;

  const reasonCounts = new Map<LostBusinessReason, number>();
  let uncodedLost = 0;

  function tallyReason(reason: string | null) {
    if (!reason) {
      uncodedLost += 1;
      return;
    }
    if (isLostBusinessReason(reason)) {
      reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
      return;
    }
    uncodedLost += 1;
  }

  for (const attempt of input.attempts) {
    if (isDeclinedResult(attempt.result)) tallyReason(attempt.lostReason);
  }
  for (const quote of input.quotes) {
    if (quote.lostReason) tallyReason(quote.lostReason);
  }

  const lostReasons: LostReasonRow[] = [...reasonCounts.entries()]
    .map(([reason, count]) => ({
      reason,
      label: LOST_BUSINESS_REASON_LABELS[reason],
      count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const carriers: CarrierPerfRow[] = [...byCarrier.values()]
    .filter((row) => row.quoted > 0 || row.declined > 0)
    .map((row) => ({
      carrierId: row.carrierId,
      carrierName: row.carrierName,
      quoted: row.quoted,
      declined: row.declined,
      bound: row.bound,
      hitPct: hitPct(row.bound, row.quoted),
      avgQuotedPremium: avg(row.premiums),
    }))
    .sort((a, b) => b.quoted - a.quoted || a.carrierName.localeCompare(b.carrierName));

  return {
    quotedCount,
    declinedCount,
    boundCount,
    shopsQuoted,
    shopsBound,
    quoteHitPct: hitPct(boundCount, quotedCount),
    shopHitPct: hitPct(shopsBound, shopsQuoted),
    carriers,
    lostReasons,
    uncodedLost,
  };
}
