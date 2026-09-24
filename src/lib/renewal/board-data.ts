import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  accounts,
  carriers,
  contacts,
  policies,
  policyTerms,
  renewalQueue,
} from "@/lib/db/schema";
import { resolveCurrentTerm, type TermCandidate } from "@/lib/policies/current-term";
import { addUtcDays, deskNow } from "@/lib/home/as-of";
import {
  buildRenewalRow,
  daysUntilExpiration,
  expirationDay,
} from "@/lib/ams/renewals";
import {
  RENEWAL_QUEUE_STAGES,
  normalizeRenewalQueueStage,
  type RenewalQueueStage,
} from "@/lib/domain-ams";
import { ensureRenewalsPipeline } from "@/lib/wire/ensure-pipelines";
import type { PipelineStageView } from "@/lib/wire/pipeline-cards";
import { partyLabel } from "@/lib/desk/policy-name";
import { buildPolicyLabel } from "@/lib/policy/auto-label";
import { getAgencyPolicyLabelTemplate } from "@/lib/policy/auto-label-prefs";
import { enrichRenewalCards } from "@/lib/renewal/board-enrich";
import type { HealthChipView } from "@/lib/health/model";
import { loadRenewalHealthMap } from "@/lib/health/load";
import { daysUntilRenewal } from "@/lib/policies/renewal-date";
import { renewalWhyLine, type RenewalRiskLevel } from "@/lib/renewal/urgency";

export type RenewalBoardCard = {
  queueId: string;
  policyId: string;
  stage: string;
  /** Same agency auto-label (or override) as Policy details. */
  displayName: string;
  policyNumber: string;
  clientName: string;
  contactId: string | null;
  accountId: string | null;
  email: string | null;
  phone: string | null;
  lineOfBusiness: string;
  policySubType: string | null;
  insuranceType: string | null;
  commissionFamily: string | null;
  carrierName: string;
  expirationDate: Date | string | null;
  /** Policy renewalDate — Client staying 90-day gate (no expiration fallback). */
  renewalDate: Date | string | null;
  daysUntil: number;
  premium: string | null;
  proposedPremium: string | null;
  premiumDelta: number | null;
  /** Fraction (0.033 = +3.3%); null when current premium is zero. */
  premiumDeltaPct: number | null;
  ownerId: string | null;
  ownerName: string | null;
  partyKey: string;
  risk: RenewalRiskLevel;
  riskScore: number;
  why: string;
  whyExtra: string | null;
  hasCurrentTerm: boolean;
  hasProposedTerm: boolean;
  canCompare: boolean;
  chasedThisBand: boolean;
  reviewDue: boolean;
  reviewSkipCount: number;
  healthStars: number;
  policyHealthStars: number;
  healthSource: "rated" | "model";
  healthFlagged: boolean;
  lastContactDays: number | null;
  /** Last-night weighted model — strip + drawer only, not a second card face. */
  policyHealth: HealthChipView | null;
  clientHealth: HealthChipView | null;
  autopilotQueued: boolean;
  autopilotEscalated: boolean;
  inboxCue?: string | null;
  inboxHref?: string | null;
};

function partyName(
  contact: { firstName: string; lastName: string } | null,
  account: { name: string } | null,
) {
  return partyLabel(contact, account) || "Unnamed";
}

/** Ensure in-force policies in the window have a renewals board row (upcoming). */
export async function ensureRenewalsBoardRows(windowDays = 180) {
  const horizon = addUtcDays(deskNow(), windowDays);
  const floor = addUtcDays(deskNow(), -14);
  const rows = await db
    .select({
      policy: policies,
      contact: contacts,
      account: accounts,
    })
    .from(policies)
    .leftJoin(contacts, eq(policies.contactId, contacts.id))
    .leftJoin(accounts, eq(policies.accountId, accounts.id))
    .where(
      and(
        eq(policies.tenantId, DEFAULT_TENANT_ID),
        gte(policies.expirationDate, floor),
        lte(policies.expirationDate, horizon),
      ),
    );

  const inForce = rows.filter(({ policy }) => {
    const resolved = resolveCurrentTerm(
      {
        status: policy.status,
        lineOfBusiness: policy.lineOfBusiness,
        policyNumber: policy.policyNumber,
        effectiveDate: policy.effectiveDate,
        expirationDate: policy.expirationDate,
        renewalDate: policy.renewalDate,
        premium: policy.premium,
      },
      deskNow(),
    );
    return resolved.countsAsInForce;
  });
  if (inForce.length === 0) return { ensured: 0 };

  const ids = inForce.map(({ policy }) => policy.id);
  const existing = await db
    .select({ policyId: renewalQueue.policyId })
    .from(renewalQueue)
    .where(and(eq(renewalQueue.tenantId, DEFAULT_TENANT_ID), inArray(renewalQueue.policyId, ids)));
  const have = new Set(existing.map((row) => row.policyId));
  const missing = inForce.filter(({ policy }) => !have.has(policy.id));
  for (const { policy } of missing) {
    await db.insert(renewalQueue).values({
      tenantId: DEFAULT_TENANT_ID,
      policyId: policy.id,
      stage: "upcoming",
      notes: "Auto-queued for the renewals board. Desk stub only.",
    });
  }
  return { ensured: missing.length };
}

export async function loadRenewalsBoard(windowDays = 180): Promise<{
  stages: RenewalQueueStage[];
  stageRows: PipelineStageView[];
  pipelineId: string | null;
  cards: RenewalBoardCard[];
}> {
  await ensureRenewalsBoardRows(windowDays);
  const labelTemplate = await getAgencyPolicyLabelTemplate();
  const renewalsPipeline = await ensureRenewalsPipeline().catch(() => null);

  const queueRows = await db
    .select({
      queue: renewalQueue,
      policy: policies,
      contact: contacts,
      account: accounts,
      carrier: carriers,
    })
    .from(renewalQueue)
    .innerJoin(policies, eq(renewalQueue.policyId, policies.id))
    .leftJoin(contacts, eq(policies.contactId, contacts.id))
    .leftJoin(accounts, eq(policies.accountId, accounts.id))
    .leftJoin(carriers, eq(policies.carrierId, carriers.id))
    .where(eq(renewalQueue.tenantId, DEFAULT_TENANT_ID));

  const policyIds = queueRows.map((row) => row.policy.id);
  const termRows = policyIds.length
    ? await db
        .select({
          id: policyTerms.id,
          policyId: policyTerms.policyId,
          role: policyTerms.role,
          premium: policyTerms.premium,
          termEffective: policyTerms.termEffective,
          termExpiration: policyTerms.termExpiration,
        })
        .from(policyTerms)
        .where(and(eq(policyTerms.tenantId, DEFAULT_TENANT_ID), inArray(policyTerms.policyId, policyIds)))
    : [];
  const termsByPolicy = new Map<string, TermCandidate[]>();
  for (const term of termRows) {
    const list = termsByPolicy.get(term.policyId) ?? [];
    list.push({
      id: term.id,
      role: term.role,
      effective: term.termEffective,
      expiration: term.termExpiration,
      premium: term.premium,
    });
    termsByPolicy.set(term.policyId, list);
  }

  const cards: RenewalBoardCard[] = [];
  for (const row of queueRows) {
    const asOf = deskNow();
    const resolved = resolveCurrentTerm(
      {
        status: row.policy.status,
        lineOfBusiness: row.policy.lineOfBusiness,
        policyNumber: row.policy.policyNumber,
        carrierName: row.carrier?.name,
        namedInsured: partyName(row.contact, row.account),
        effectiveDate: row.policy.effectiveDate,
        expirationDate: row.policy.expirationDate,
        renewalDate: row.policy.renewalDate,
        premium: row.policy.premium,
        sourceDocumentId: row.policy.sourceDocumentId,
        terms: termsByPolicy.get(row.policy.id) ?? [],
      },
      asOf,
    );
    const exp = expirationDay(resolved.bookExpiration ?? row.policy.expirationDate);
    if (!exp) continue;
    // Keep lost/bound cards even outside window; filter others to window.
    const stage = normalizeRenewalQueueStage(row.queue.stage) ?? row.queue.stage ?? "upcoming";
    const days =
      daysUntilRenewal(
        {
          renewalDate: row.policy.renewalDate,
          bookExpiration: resolved.bookExpiration,
          expirationDate: row.policy.expirationDate,
        },
        asOf,
      ) ?? daysUntilExpiration(exp, asOf);
    if (stage !== "lost" && stage !== "bound" && stage !== "archive" && stage !== "archived") {
      if (days < -14 || days > windowDays) continue;
      if (!resolved.countsAsInForce && stage === "upcoming") continue;
    }
    const built = buildRenewalRow(
      {
        id: row.policy.id,
        policyNumber: row.policy.policyNumber,
        status: resolved.countsAsInForce ? row.policy.status : resolved.band,
        lineOfBusiness: row.policy.lineOfBusiness,
        expirationDate: resolved.bookExpiration ?? row.policy.expirationDate,
        premium: resolved.current?.premium ?? row.policy.premium,
        partyName: partyName(row.contact, row.account),
        carrierName: row.carrier?.name ?? "Carrier TBD",
        currentPremium: resolved.current?.premium ?? row.policy.premium,
        proposedPremium: resolved.upcoming?.premium ?? null,
      },
      asOf,
    );
    if (!built) continue;
    const ownerName = partyName(row.contact, row.account);
    const autoLabel = buildPolicyLabel(labelTemplate, {
      ownerName,
      carrier: row.carrier?.name,
      policyType: row.policy.policyType,
      policyNumber: row.policy.policyNumber,
      lineOfBusiness: row.policy.lineOfBusiness,
      formType: row.policy.formType,
      policySubType: row.policy.policySubType,
      status: row.policy.status,
      effectiveDate: row.policy.effectiveDate,
      expirationDate: row.policy.expirationDate,
    });
    const displayName =
      row.policy.labelOverride?.trim() || autoLabel || row.policy.policyNumber;
    cards.push({
      queueId: row.queue.id,
      policyId: row.policy.id,
      stage,
      displayName,
      policyNumber: row.policy.policyNumber,
      clientName: built.partyName,
      contactId: row.contact?.id ?? row.policy.contactId ?? null,
      accountId: row.account?.id ?? row.policy.accountId ?? null,
      email: row.contact?.email ?? row.account?.email ?? null,
      phone: row.contact?.phone ?? row.account?.phone ?? null,
      lineOfBusiness: row.policy.lineOfBusiness,
      policySubType: row.policy.policySubType ?? null,
      insuranceType: row.policy.insuranceType ?? null,
      commissionFamily: row.policy.commissionFamily ?? null,
      carrierName: row.carrier?.name ?? "Carrier TBD",
      expirationDate: resolved.bookExpiration ?? row.policy.expirationDate,
      renewalDate: row.policy.renewalDate ?? resolved.renewalAnchor ?? null,
      daysUntil: days,
      premium: built.currentPremium,
      proposedPremium: built.proposedPremium,
      premiumDelta: built.delta,
      premiumDeltaPct: built.pct,
      ownerId: row.policy.ownerId ?? row.contact?.ownerId ?? null,
      ownerName: null,
      partyKey: "",
      risk: "low",
      riskScore: 0,
      why: "",
      whyExtra: null,
      hasCurrentTerm: Boolean(resolved.current),
      hasProposedTerm: Boolean(built.proposedPremium),
      canCompare: Boolean(built.currentPremium && built.proposedPremium),
      chasedThisBand: false,
      reviewDue: false,
      reviewSkipCount: 0,
      healthStars: 4,
      policyHealthStars: 4,
      healthSource: "model",
      healthFlagged: false,
      lastContactDays: null,
      policyHealth: null,
      clientHealth: null,
      autopilotQueued: false,
      autopilotEscalated: false,
    });
  }

  cards.sort(
    (a, b) => a.daysUntil - b.daysUntil || a.policyNumber.localeCompare(b.policyNumber),
  );
  const enriched = await enrichRenewalCards(cards);
  const inboxCues = await import("@/lib/notifications/load-inbox").then((mod) =>
    mod.loadInboxCues().catch(() => []),
  );
  for (const card of enriched) {
    const cue = inboxCues.find(
      (row) => row.policyId === card.policyId || row.contactId === card.contactId,
    );
    if (!cue) continue;
    card.inboxCue = cue.why;
    card.inboxHref = cue.href;
  }
  const health = await loadRenewalHealthMap(enriched).catch(() => new Map());
  for (const card of enriched) {
    const row = health.get(card.policyId);
    if (!row) continue;
    card.policyHealth = row.policyHealth;
    card.clientHealth = row.clientHealth;
    if (!card.ownerId && row.ownerId) card.ownerId = row.ownerId;
    if (!card.ownerName && row.ownerName) card.ownerName = row.ownerName;
    card.risk = row.clientHealth.band;
    card.whyExtra = row.clientHealth.why;
    card.why = renewalWhyLine({
      daysUntil: card.daysUntil,
      premiumDelta: card.premiumDelta,
      whyExtra: row.clientHealth.why,
    });
  }

  const stageRows = renewalsPipeline?.stages ?? RENEWAL_QUEUE_STAGES.map((slug, sortOrder) => ({
    id: slug,
    slug,
    name: slug,
    sortOrder,
    color: "slate",
    seeded: true,
  }));
  const stages = (
    stageRows.length > 0
      ? stageRows.map((row) => row.slug)
      : [...RENEWAL_QUEUE_STAGES]
  ) as RenewalQueueStage[];

  return {
    stages,
    stageRows,
    pipelineId: renewalsPipeline?.id ?? null,
    cards: enriched,
  };
}
