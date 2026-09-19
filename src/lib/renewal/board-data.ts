import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  accounts,
  carriers,
  contacts,
  policies,
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
    });
  }

  cards.sort(
    (a, b) => a.daysUntil - b.daysUntil || a.policyNumber.localeCompare(b.policyNumber),
  );

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
    cards,
  };
}
