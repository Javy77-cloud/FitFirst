/**
 * Take Client staying off `handled` once the renewed term's effective date
 * is reached, so the next cycle starts on `upcoming`.
 */
import { and, eq, inArray } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { policies, policyTerms, renewalQueue } from "@/lib/db/schema";
import { businessDateKey } from "@/lib/policies/current-term";
import {
  CLIENT_STAYING_AFTER_RENEWAL_STAGE,
  clientStayingTermHasStarted,
  type RenewalAgreedWindow,
} from "@/lib/policies/renewal-agreed";
import { RENEWAL_HANDLED_STAGE } from "@/lib/renewal/handled";

async function moveHandledToUpcoming(policyId: string): Promise<boolean> {
  const updated = await db
    .update(renewalQueue)
    .set({ stage: CLIENT_STAYING_AFTER_RENEWAL_STAGE, updatedAt: new Date() })
    .where(
      and(
        eq(renewalQueue.tenantId, DEFAULT_TENANT_ID),
        eq(renewalQueue.policyId, policyId),
        eq(renewalQueue.stage, RENEWAL_HANDLED_STAGE),
      ),
    )
    .returning({ id: renewalQueue.id });
  return updated.length > 0;
}

/**
 * Term-advance and day-of term start. `force` clears as soon as the renewed
 * term effective is already today or earlier, including a mark made in the
 * same request.
 */
export async function releaseClientStayingForPolicy(
  policyId: string,
  options?: { asOf?: Date; force?: boolean },
): Promise<boolean> {
  if (!policyId) return false;
  if (options?.force) return moveHandledToUpcoming(policyId);

  const asOf = options?.asOf ?? new Date();
  const [policy] = await db
    .select({
      effectiveDate: policies.effectiveDate,
      expirationDate: policies.expirationDate,
      renewalDate: policies.renewalDate,
      updatedAt: renewalQueue.updatedAt,
    })
    .from(renewalQueue)
    .innerJoin(policies, eq(policies.id, renewalQueue.policyId))
    .where(
      and(
        eq(renewalQueue.tenantId, DEFAULT_TENANT_ID),
        eq(renewalQueue.policyId, policyId),
        eq(renewalQueue.stage, RENEWAL_HANDLED_STAGE),
      ),
    );
  if (!policy) return false;

  const priors = await db
    .select({ termExpiration: policyTerms.termExpiration })
    .from(policyTerms)
    .where(
      and(
        eq(policyTerms.tenantId, DEFAULT_TENANT_ID),
        eq(policyTerms.policyId, policyId),
        eq(policyTerms.role, "prior"),
      ),
    );
  const priorExpiration = latestDate(priors.map((row) => row.termExpiration));
  const window: RenewalAgreedWindow = {
    effectiveDate: policy.effectiveDate,
    expirationDate: policy.expirationDate,
    renewalDate: policy.renewalDate,
    priorExpiration,
    handledAt: policy.updatedAt,
  };
  if (!clientStayingTermHasStarted(window, asOf)) return false;
  return moveHandledToUpcoming(policyId);
}

/** Missed term-start days: every handled row whose renew-into date has arrived. */
export async function releaseExpiredClientStaying(asOf: Date = new Date()): Promise<number> {
  const rows = await db
    .select({
      policyId: renewalQueue.policyId,
      updatedAt: renewalQueue.updatedAt,
      effectiveDate: policies.effectiveDate,
      expirationDate: policies.expirationDate,
      renewalDate: policies.renewalDate,
    })
    .from(renewalQueue)
    .innerJoin(policies, eq(policies.id, renewalQueue.policyId))
    .where(
      and(eq(renewalQueue.tenantId, DEFAULT_TENANT_ID), eq(renewalQueue.stage, RENEWAL_HANDLED_STAGE)),
    );
  if (rows.length === 0) return 0;

  const ids = rows.map((row) => row.policyId);
  const priors = await db
    .select({
      policyId: policyTerms.policyId,
      termExpiration: policyTerms.termExpiration,
    })
    .from(policyTerms)
    .where(
      and(
        eq(policyTerms.tenantId, DEFAULT_TENANT_ID),
        inArray(policyTerms.policyId, ids),
        eq(policyTerms.role, "prior"),
      ),
    );
  const priorByPolicy = new Map<string, Date | string>();
  for (const prior of priors) {
    const key = businessDateKey(prior.termExpiration);
    if (!key) continue;
    const prev = priorByPolicy.get(prior.policyId);
    const prevKey = prev ? businessDateKey(prev) : null;
    if (!prevKey || key > prevKey) priorByPolicy.set(prior.policyId, prior.termExpiration);
  }

  let released = 0;
  for (const row of rows) {
    const started = clientStayingTermHasStarted(
      {
        effectiveDate: row.effectiveDate,
        expirationDate: row.expirationDate,
        renewalDate: row.renewalDate,
        priorExpiration: priorByPolicy.get(row.policyId) ?? null,
        handledAt: row.updatedAt,
      },
      asOf,
    );
    if (!started) continue;
    if (await moveHandledToUpcoming(row.policyId)) released += 1;
  }
  return released;
}

function latestDate(values: Array<Date | string | null | undefined>): string | null {
  let best: string | null = null;
  for (const value of values) {
    const key = businessDateKey(value);
    if (!key) continue;
    if (!best || key > best) best = key;
  }
  return best;
}
