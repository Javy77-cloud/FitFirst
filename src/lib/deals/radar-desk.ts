import { and, eq, inArray } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { activityLogs, documents, quotes } from "@/lib/db/schema";
import type { DealListRow } from "@/lib/db/queries";
import { inferDealProducts, dealProductDef } from "@/lib/deals/deal-products";
import { visibleDealTitle } from "@/lib/deals/deal-title";
import { resolveDealStampStage } from "@/lib/deals/status-stamp";
import { humanizeDealStage } from "@/lib/deals/package-lines";
import { bookFamily } from "@/lib/desk/policy-line";
import { insuredContactName } from "@/lib/crm/lists";
import {
  buildVelocityClocks,
  clientHealthScore,
  commGapDays,
  dealValue,
  formatClockDays,
  heatForDeal,
  isClosedShoppingDeal,
  isPlatformCommKind,
  parseDate,
  policyHealthScore,
  primaryDealAction,
  radarPosition,
  resolveActivePhase,
  urgencyScore,
  type HeatState,
  type VelocityClock,
  type VelocityPhase,
} from "@/lib/deals/velocity";

export type RadarDealCard = {
  id: string;
  title: string;
  insured: string;
  lineOfBusiness: string;
  family: "pc" | "life" | "health";
  productLabels: string[];
  stageStamp: ReturnType<typeof resolveDealStampStage>;
  stageLabel: string;
  ownerId: string | null;
  ownerName: string | null;
  coverageA: number | null;
  premium: number | null;
  value: number;
  valueMetric: "coverage_a" | "premium";
  heat: HeatState;
  urgencyScore: number;
  phase: VelocityPhase;
  clocks: Record<VelocityPhase, VelocityClock>;
  daysInPhase: number;
  commGapDays: number;
  lastCommAt: string | null;
  clockLabel: string;
  clientHealth: number;
  policyHealth: number;
  primaryAction: ReturnType<typeof primaryDealAction>;
  phone: string | null;
  email: string | null;
  contactId: string | null;
  leadId: string | null;
  accountId: string | null;
  href: string;
  x: number;
  y: number;
  closed: boolean;
};

function detailsReady(row: DealListRow): boolean {
  return Boolean(
    row.deal.primaryNamedInsured?.trim() ||
      row.contact?.firstName ||
      row.contact?.lastName ||
      row.lead?.firstName ||
      row.lead?.lastName,
  );
}

function riskReady(row: DealListRow): boolean {
  const risk = row.risk;
  if (!risk) return false;
  return Boolean(risk.address1 || risk.coverageA || risk.yearBuilt || risk.vin);
}

export async function loadDealVelocityTouches(dealIds: string[]) {
  if (dealIds.length === 0) {
    return {
      lastCommByDeal: new Map<string, Date>(),
      lastDocByDeal: new Map<string, Date>(),
      lastQuoteByDeal: new Map<string, Date>(),
      premiumByDeal: new Map<string, number>(),
      hasDocs: new Set<string>(),
      hasQuotes: new Set<string>(),
    };
  }
  const tenant = DEFAULT_TENANT_ID;
  const [docRows, quoteRows, logRows] = await Promise.all([
    db
      .select({
        dealId: documents.dealId,
        createdAt: documents.createdAt,
        slot: documents.slot,
      })
      .from(documents)
      .where(and(eq(documents.tenantId, tenant), inArray(documents.dealId, dealIds))),
    db
      .select({
        dealId: quotes.dealId,
        createdAt: quotes.createdAt,
        premium: quotes.premium,
        coverageA: quotes.coverageA,
      })
      .from(quotes)
      .where(and(eq(quotes.tenantId, tenant), inArray(quotes.dealId, dealIds))),
    db
      .select({
        dealId: activityLogs.dealId,
        occurredAt: activityLogs.occurredAt,
        kind: activityLogs.kind,
        eventType: activityLogs.eventType,
      })
      .from(activityLogs)
      .where(and(eq(activityLogs.tenantId, tenant), inArray(activityLogs.dealId, dealIds))),
  ]);

  const lastCommByDeal = new Map<string, Date>();
  const lastDocByDeal = new Map<string, Date>();
  const lastQuoteByDeal = new Map<string, Date>();
  const premiumByDeal = new Map<string, number>();
  const hasDocs = new Set<string>();
  const hasQuotes = new Set<string>();

  for (const row of docRows) {
    if (!row.dealId) continue;
    hasDocs.add(row.dealId);
    const at = parseDate(row.createdAt);
    if (!at) continue;
    const prev = lastDocByDeal.get(row.dealId);
    if (!prev || at.getTime() > prev.getTime()) lastDocByDeal.set(row.dealId, at);
  }
  for (const row of quoteRows) {
    hasQuotes.add(row.dealId);
    const at = parseDate(row.createdAt);
    if (at) {
      const prev = lastQuoteByDeal.get(row.dealId);
      if (!prev || at.getTime() > prev.getTime()) lastQuoteByDeal.set(row.dealId, at);
    }
    const prem = Number(row.premium);
    if (Number.isFinite(prem) && prem > 0) {
      const prev = premiumByDeal.get(row.dealId) ?? 0;
      if (prem > prev) premiumByDeal.set(row.dealId, prem);
    }
  }
  for (const row of logRows) {
    if (!row.dealId || !isPlatformCommKind(row.kind)) continue;
    const at = parseDate(row.occurredAt);
    if (!at) continue;
    const prev = lastCommByDeal.get(row.dealId);
    if (!prev || at.getTime() > prev.getTime()) lastCommByDeal.set(row.dealId, at);
  }

  return { lastCommByDeal, lastDocByDeal, lastQuoteByDeal, premiumByDeal, hasDocs, hasQuotes };
}

export function presentRadarCards(
  rows: DealListRow[],
  touches: Awaited<ReturnType<typeof loadDealVelocityTouches>>,
  users: Map<string, string>,
  now = new Date(),
): RadarDealCard[] {
  const values = rows.map((row) =>
    dealValue(row.risk?.coverageA ?? row.deal.coverageAmount, touches.premiumByDeal.get(row.deal.id)).amount,
  );
  const maxValue = Math.max(1, ...values);

  return rows
    .map((row) => {
      const deal = row.deal;
      const createdAt = parseDate(deal.createdAt) ?? now;
      const lastCommAt = touches.lastCommByDeal.get(deal.id) ?? null;
      const details = detailsReady(row);
      const docs = touches.hasDocs.has(deal.id);
      const risk = riskReady(row);
      const quoted = touches.hasQuotes.has(deal.id) || Boolean(deal.quotingUnlocked);
      const value = dealValue(row.risk?.coverageA ?? deal.coverageAmount, touches.premiumByDeal.get(deal.id));
      const products = inferDealProducts(deal);
      const closed = isClosedShoppingDeal(deal);
      const clocks = buildVelocityClocks({
        createdAt,
        updatedAt: parseDate(deal.updatedAt),
        leadCreatedAt: parseDate(row.lead?.createdAt),
        boundAt: parseDate(deal.boundAt),
        archivedAt: parseDate(deal.archivedAt),
        pipelineStage: deal.pipelineStage,
        pipelineStageSlug: deal.pipelineStageSlug,
        detailsReady: details,
        docsReady: docs,
        riskReady: risk,
        quotesReady: quoted,
        coverageA: value.metric === "coverage_a" ? value.amount : row.risk?.coverageA,
        premium: value.metric === "premium" ? value.amount : touches.premiumByDeal.get(deal.id),
        productCount: products.length,
        lastCommAt,
        lastDocAt: touches.lastDocByDeal.get(deal.id) ?? null,
        lastQuoteAt: touches.lastQuoteByDeal.get(deal.id) ?? null,
        detailsReadyAt: details ? parseDate(deal.updatedAt) : null,
        now,
      });
      const phase = resolveActivePhase({
        detailsReady: details,
        docsReady: docs,
        riskReady: risk,
        quotesReady: quoted,
      });
      const daysInPhase = clocks[phase].days;
      const gap = commGapDays({ lastCommAt, openedAt: createdAt, now });
      const heat = heatForDeal({ commGapDays: gap, closed, value: value.amount, daysInPhase });
      const score = urgencyScore({
        heat,
        commGapDays: gap,
        daysInPhase,
        value: value.amount,
        phase,
        productCount: products.length,
        closed,
      });
      const pos = radarPosition({ daysInPhase, value: value.amount, maxValue });
      return {
        id: deal.id,
        title: visibleDealTitle(deal),
        insured: insuredContactName({
          primaryNamedInsured: deal.primaryNamedInsured,
          secondaryNamedInsured: deal.secondaryNamedInsured,
          contact: row.contact,
          lead: row.lead,
        }),
        lineOfBusiness: deal.lineOfBusiness,
        family: bookFamily(deal.lineOfBusiness),
        productLabels: products.map((id) => dealProductDef(id).label),
        stageStamp: resolveDealStampStage(deal.pipelineStageSlug, deal.pipelineStage, deal.boundAt),
        stageLabel: humanizeDealStage(deal.pipelineStageSlug || deal.pipelineStage),
        ownerId: deal.ownerId ?? null,
        ownerName: deal.ownerId ? users.get(deal.ownerId) ?? null : null,
        coverageA: row.risk?.coverageA ?? deal.coverageAmount ?? null,
        premium: touches.premiumByDeal.get(deal.id) ?? null,
        value: value.amount,
        valueMetric: value.metric,
        heat,
        urgencyScore: score,
        phase,
        clocks,
        daysInPhase,
        commGapDays: gap,
        lastCommAt: lastCommAt?.toISOString() ?? null,
        clockLabel: `${clocks[phase].label} · ${formatClockDays(daysInPhase)}`,
        clientHealth: clientHealthScore({
          commGapDays: gap,
          detailsReady: details,
          docsReady: docs,
          quotesReady: quoted,
        }),
        policyHealth: policyHealthScore({
          detailsReady: details,
          docsReady: docs,
          riskReady: risk,
          quotesReady: quoted,
          commGapDays: gap,
        }),
        primaryAction: primaryDealAction({ dealId: deal.id, phase, heat }),
        phone: row.contact?.phone ?? row.lead?.phone ?? null,
        email: row.contact?.email ?? row.lead?.email ?? null,
        contactId: deal.contactId,
        leadId: deal.leadId,
        accountId: deal.accountId,
        href: `/deals/${deal.id}`,
        x: pos.x,
        y: pos.y,
        closed,
      } satisfies RadarDealCard;
    })
    .sort((a, b) => b.urgencyScore - a.urgencyScore || b.value - a.value || a.title.localeCompare(b.title));
}

export function ownerScorecards(cards: RadarDealCard[]) {
  const open = cards.filter((card) => !card.closed);
  const cold = open.filter((card) => card.heat === "cold").length;
  const gaps = open.filter((card) => card.phase === "post_quote_gap").map((card) => card.commGapDays);
  const mid = gaps.length
    ? [...gaps].sort((a, b) => a - b)[Math.floor((gaps.length - 1) / 2)] ?? 0
    : 0;
  return {
    open: open.length,
    cold,
    coldRate: open.length ? Math.round((cold / open.length) * 100) : 0,
    medianPostQuoteGap: Math.round(mid * 10) / 10,
    hot: open.filter((card) => card.heat === "hot").length,
  };
}

export function agentVelocityScores(cards: RadarDealCard[]): Map<string, number> {
  const byOwner = new Map<string, number[]>();
  for (const card of cards) {
    if (!card.ownerId || card.closed) continue;
    const list = byOwner.get(card.ownerId) ?? [];
    list.push(card.urgencyScore);
    byOwner.set(card.ownerId, list);
  }
  const scores = new Map<string, number>();
  for (const [ownerId, list] of byOwner) {
    const avg = list.reduce((sum, n) => sum + n, 0) / list.length;
    scores.set(ownerId, avg);
  }
  return scores;
}
