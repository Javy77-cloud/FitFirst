import { and, eq, inArray } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { activityLogs, documents, quotes } from "@/lib/db/schema";
import type { DealListRow } from "@/lib/db/queries";
import { inferDealProducts, dealProductDef } from "@/lib/deals/deal-products";
import { visibleDealTitle } from "@/lib/deals/deal-title";
import {
  bestQuotePremium,
  isPendingQuoteStatus,
  isQuoteSentStatus,
  stackProductLines,
  type StackProductLine,
} from "@/lib/deals/card-glance";
import { listProductStageChips } from "@/lib/deals/product-stages";
import { resolveDealStampStage } from "@/lib/deals/status-stamp";
import { humanizeDealStage } from "@/lib/deals/package-lines";
import { bookFamily } from "@/lib/desk/policy-line";
import { insuredContactName } from "@/lib/crm/lists";
import {
  buildVelocityClocks,
  clientHealthScore,
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
  silenceDays,
  sparkBuckets,
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
  docsSubmitted: boolean;
  quoteCount: number;
  pendingQuotes: number;
  stamps: string[];
  productLines: StackProductLine[];
  value: number;
  valueMetric: "coverage_a" | "premium";
  heat: HeatState;
  urgencyScore: number;
  phase: VelocityPhase;
  clocks: Record<VelocityPhase, VelocityClock>;
  daysInPhase: number;
  commGapDays: number;
  silenceDays: number;
  lastCommAt: string | null;
  lastQuoteAt: string | null;
  quoteSent: boolean;
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
  spark: number[];
  updatedAt: string | null;
  inboxCue?: string | null;
  inboxHref?: string | null;
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

export type DealQuoteGlance = {
  count: number;
  bestPremium: number | null;
  pending: number;
  quoteSent: boolean;
  inspection: boolean;
};

type DealQuoteRowGlance = {
  premium: number | null;
  agentStatus: string | null;
  stub: boolean;
  shopLine: string | null;
  notes: string | null;
  quoteRunId: string | null;
};

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
      quoteGlanceByDeal: new Map<string, DealQuoteGlance>(),
      quoteRowsByDeal: new Map<string, DealQuoteRowGlance[]>(),
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
        agentStatus: quotes.agentStatus,
        stub: quotes.stub,
        shopLine: quotes.shopLine,
        notes: quotes.notes,
        quoteRunId: quotes.quoteRunId,
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
  const premiumsByDeal = new Map<string, number[]>();
  const quoteGlanceByDeal = new Map<string, DealQuoteGlance>();
  const quoteRowsByDeal = new Map<string, DealQuoteRowGlance[]>();

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
    const premiumNumber = Number(row.premium);
    const hasPremium = Number.isFinite(premiumNumber) && premiumNumber > 0;
    const status = row.agentStatus;
    const statusKey = (status ?? "").trim().toLowerCase();
    const emptyStub = Boolean(row.stub) && !hasPremium && (statusKey === "" || statusKey === "new");
    if (hasPremium) {
      const list = premiumsByDeal.get(row.dealId) ?? [];
      list.push(premiumNumber);
      premiumsByDeal.set(row.dealId, list);
    }
    if (emptyStub) continue;
    const rows = quoteRowsByDeal.get(row.dealId) ?? [];
    rows.push({
      premium: hasPremium ? premiumNumber : null,
      agentStatus: status,
      stub: Boolean(row.stub),
      shopLine: row.shopLine,
      notes: row.notes,
      quoteRunId: row.quoteRunId,
    });
    quoteRowsByDeal.set(row.dealId, rows);
    const glance = quoteGlanceByDeal.get(row.dealId) ?? {
      count: 0,
      bestPremium: null,
      pending: 0,
      quoteSent: false,
      inspection: false,
    };
    glance.count += 1;
    if (isPendingQuoteStatus(status)) glance.pending += 1;
    if (isQuoteSentStatus(status)) glance.quoteSent = true;
    if ((status ?? "").trim().toLowerCase() === "waiting_on_inspection") glance.inspection = true;
    quoteGlanceByDeal.set(row.dealId, glance);
  }
  for (const [dealId, premiums] of premiumsByDeal) {
    const best = bestQuotePremium(premiums);
    if (best != null) premiumByDeal.set(dealId, best);
    const glance = quoteGlanceByDeal.get(dealId);
    if (glance) glance.bestPremium = best;
  }
  for (const row of logRows) {
    if (!row.dealId || !isPlatformCommKind(row.kind)) continue;
    const at = parseDate(row.occurredAt);
    if (!at) continue;
    const prev = lastCommByDeal.get(row.dealId);
    if (!prev || at.getTime() > prev.getTime()) lastCommByDeal.set(row.dealId, at);
  }

  return {
    lastCommByDeal,
    lastDocByDeal,
    lastQuoteByDeal,
    premiumByDeal,
    hasDocs,
    hasQuotes,
    quoteGlanceByDeal,
    quoteRowsByDeal,
  };
}

export function presentRadarCards(
  rows: DealListRow[],
  touches: Awaited<ReturnType<typeof loadDealVelocityTouches>>,
  users: Map<string, string>,
  now = new Date(),
): RadarDealCard[] {
  return rows
    .map((row) => {
      const deal = row.deal;
      const createdAt = parseDate(deal.createdAt) ?? now;
      const lastCommAt = touches.lastCommByDeal.get(deal.id) ?? null;
      const lastQuoteAt = touches.lastQuoteByDeal.get(deal.id) ?? null;
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
        lastQuoteAt,
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
      const gap = silenceDays({
        lastCommAt,
        lastQuoteAt,
        quotesReady: quoted,
        openedAt: createdAt,
        now,
      });
      const heat = heatForDeal({ silenceDays: gap, closed });
      const score = urgencyScore({
        heat,
        commGapDays: gap,
        daysInPhase,
        value: value.amount,
        phase,
        productCount: products.length,
        closed,
      });
      const pos = radarPosition({ daysInPhase, silenceDays: gap });
      const glance = touches.quoteGlanceByDeal.get(deal.id);
      const stageStamp = resolveDealStampStage(deal.pipelineStageSlug, deal.pipelineStage, deal.boundAt);
      const stageLabel = humanizeDealStage(deal.pipelineStageSlug || deal.pipelineStage);
      const chips = listProductStageChips({
        shopProducts: deal.shopProducts,
        shopLines: deal.shopLines,
        lineOfBusiness: deal.lineOfBusiness,
        quotingLine: deal.quotingLine,
        quotingForm: deal.quotingForm,
        policySubType: deal.policySubType,
        shopFlow: deal.shopFlow,
        pipelineStage: deal.pipelineStageSlug || deal.pipelineStage,
      });
      const stageNotices = deal.shopFlow?.productStages ?? {};
      const productLines = stackProductLines({
        products: chips.map((chip) => ({
          product: chip.product,
          label: chip.label,
          stage: chip.stage,
          noticeType: stageNotices[chip.product]?.noticeType,
          inspectionStatus: stageNotices[chip.product]?.inspectionStatus,
        })),
        quotes: touches.quoteRowsByDeal.get(deal.id) ?? [],
        quoteRuns: deal.shopFlow?.quoteRuns,
      });
      const stamps = [...new Set(productLines.flatMap((line) => line.stamps))];
      const quoteSent = stamps.includes("Quote sent");
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
        productLabels: products.map((id) => dealProductDef(id)?.label ?? id),
        stageStamp,
        stageLabel,
        ownerId: deal.ownerId ?? null,
        ownerName: deal.ownerId ? users.get(deal.ownerId) ?? null : null,
        coverageA: row.risk?.coverageA ?? deal.coverageAmount ?? null,
        premium: glance?.bestPremium ?? touches.premiumByDeal.get(deal.id) ?? null,
        docsSubmitted: docs,
        quoteCount: glance?.count ?? 0,
        pendingQuotes: glance?.pending ?? 0,
        stamps,
        productLines,
        value: value.amount,
        valueMetric: value.metric,
        heat,
        urgencyScore: score,
        phase,
        clocks,
        daysInPhase,
        commGapDays: gap,
        silenceDays: gap,
        lastCommAt: lastCommAt?.toISOString() ?? null,
        lastQuoteAt: lastQuoteAt?.toISOString() ?? null,
        quoteSent: quoted,
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
        primaryAction: primaryDealAction({
          dealId: deal.id,
          phase,
          heat,
          quoteSent,
          stageStamp,
          inspection: stamps.includes("Inspection"),
        }),
        phone: row.contact?.phone ?? row.lead?.phone ?? null,
        email: row.contact?.email ?? row.lead?.email ?? null,
        contactId: deal.contactId,
        leadId: deal.leadId,
        accountId: deal.accountId,
        href: `/deals/${deal.id}`,
        x: pos.x,
        y: pos.y,
        closed,
        updatedAt: parseDate(deal.updatedAt)?.toISOString() ?? createdAt.toISOString(),
        spark: sparkBuckets(
          [lastCommAt, touches.lastDocByDeal.get(deal.id) ?? null, touches.lastQuoteByDeal.get(deal.id) ?? null, createdAt].filter(
            (at): at is Date => Boolean(at),
          ),
          now,
        ),
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
