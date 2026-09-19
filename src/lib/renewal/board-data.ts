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
import { isInForceStatus } from "@/lib/policy/status";
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
  daysUntil: number;
  premium: string | null;
  proposedPremium: string | null;
  premiumDelta: number | null;
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

  const inForce = rows.filter(({ policy }) => isInForceStatus(policy.status));
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

  const horizon = addUtcDays(deskNow(), windowDays);
  const floor = addUtcDays(deskNow(), -14);

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
          policyId: policyTerms.policyId,
          role: policyTerms.role,
          premium: policyTerms.premium,
        })
        .from(policyTerms)
        .where(and(eq(policyTerms.tenantId, DEFAULT_TENANT_ID), inArray(policyTerms.policyId, policyIds)))
    : [];
  const currentByPolicy = new Map<string, string | null>();
  const proposedByPolicy = new Map<string, string | null>();
  for (const term of termRows) {
    if (term.role === "current") currentByPolicy.set(term.policyId, term.premium);
    if (term.role === "proposed") proposedByPolicy.set(term.policyId, term.premium);
  }

  const cards: RenewalBoardCard[] = [];
  for (const row of queueRows) {
    const exp = expirationDay(row.policy.expirationDate);
    if (!exp) continue;
    // Keep lost/bound cards even outside window; filter others to window.
    const stage = normalizeRenewalQueueStage(row.queue.stage) ?? row.queue.stage ?? "upcoming";
    const days = daysUntilExpiration(exp, deskNow());
    if (stage !== "lost" && stage !== "bound" && stage !== "archive" && stage !== "archived") {
      if (exp.getTime() < floor.getTime() || exp.getTime() > horizon.getTime()) continue;
      if (!isInForceStatus(row.policy.status) && stage === "upcoming") continue;
    }
    const built = buildRenewalRow(
      {
        id: row.policy.id,
        policyNumber: row.policy.policyNumber,
        status: row.policy.status,
        lineOfBusiness: row.policy.lineOfBusiness,
        expirationDate: row.policy.expirationDate,
        premium: row.policy.premium,
        partyName: partyName(row.contact, row.account),
        carrierName: row.carrier?.name ?? "Carrier TBD",
        currentPremium: currentByPolicy.get(row.policy.id) ?? row.policy.premium,
        proposedPremium: proposedByPolicy.get(row.policy.id) ?? null,
      },
      deskNow(),
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
      expirationDate: row.policy.expirationDate,
      daysUntil: days,
      premium: built.currentPremium,
      proposedPremium: built.proposedPremium,
      premiumDelta: built.delta,
      ownerId: row.policy.ownerId ?? row.contact?.ownerId ?? null,
      ownerName: null,
      partyKey: "",
      risk: "low",
      riskScore: 0,
      why: "",
      whyExtra: null,
      hasCurrentTerm: Boolean(built.currentPremium),
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
