import { and, desc, eq, gte } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  activities,
  activityLogs,
  claims,
  deals,
  experienceReviews,
  policies,
  renewalQueue,
} from "@/lib/db/schema";
import { REVIEW_EVENT } from "@/lib/renewal/chase";
import { addUtcDays, deskNow } from "@/lib/home/as-of";
import {
  isLoggedCallPulseCandidate,
  isReviewMoment,
  rotateReviewPrompt,
  shouldOfferReview,
  type PendingReviewPrompt,
  type ReviewMoment,
} from "@/lib/health/reviews";
import { partyLabel } from "@/lib/desk/policy-name";
import { contacts, accounts } from "@/lib/db/schema";

const LOOKBACK_DAYS = 5;

function asDate(value: Date | string | null | undefined): Date | null {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

type Candidate = {
  moment: ReviewMoment;
  contactId: string | null;
  policyId: string | null;
  dealId: string | null;
  activityId: string | null;
  at: Date;
  label: string;
};

function entityKey(row: {
  moment: string;
  contactId: string | null;
  policyId: string | null;
  dealId: string | null;
  activityId: string | null;
}) {
  return [
    row.moment,
    row.policyId || row.dealId || row.contactId || row.activityId || "none",
  ].join(":");
}

export async function loadPendingReviewPrompt(
  reviewerUserId: string | null,
): Promise<PendingReviewPrompt | null> {
  if (!reviewerUserId) return null;
  try {
    return await loadPendingReviewPromptUnsafe(reviewerUserId);
  } catch {
    return null;
  }
}

async function loadPendingReviewPromptUnsafe(
  reviewerUserId: string,
): Promise<PendingReviewPrompt | null> {
  const since = addUtcDays(deskNow(), -LOOKBACK_DAYS);

  const [recentComms, recentBinds, recentClaims, existing, renewingPolicies, wedgeReviews] = await Promise.all([
    db
      .select({
        id: activities.id,
        kind: activities.kind,
        title: activities.title,
        contactId: activities.contactId,
        policyId: activities.policyId,
        dealId: activities.dealId,
        createdAt: activities.createdAt,
        status: activities.status,
      })
      .from(activities)
      .where(
        and(
          eq(activities.tenantId, DEFAULT_TENANT_ID),
          gte(activities.createdAt, since),
          eq(activities.kind, "call"),
          eq(activities.status, "completed"),
        ),
      )
      .orderBy(desc(activities.createdAt))
      .limit(40)
      .catch(() => []),
    db
      .select({
        id: deals.id,
        title: deals.title,
        contactId: deals.contactId,
        boundAt: deals.boundAt,
        wonAt: deals.wonAt,
      })
      .from(deals)
      .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), gte(deals.boundAt, since)))
      .orderBy(desc(deals.boundAt))
      .limit(12)
      .catch(() => []),
    db
      .select({
        id: claims.id,
        contactId: claims.contactId,
        policyId: claims.policyId,
        status: claims.status,
        updatedAt: claims.updatedAt,
      })
      .from(claims)
      .where(and(eq(claims.tenantId, DEFAULT_TENANT_ID), gte(claims.updatedAt, since)))
      .orderBy(desc(claims.updatedAt))
      .limit(12)
      .catch(() => []),
    db
      .select({
        moment: experienceReviews.moment,
        skipped: experienceReviews.skipped,
        stars: experienceReviews.stars,
        contactId: experienceReviews.contactId,
        policyId: experienceReviews.policyId,
        dealId: experienceReviews.dealId,
        activityId: experienceReviews.activityId,
      })
      .from(experienceReviews)
      .where(
        and(
          eq(experienceReviews.tenantId, DEFAULT_TENANT_ID),
          eq(experienceReviews.reviewerUserId, reviewerUserId),
        ),
      )
      .catch(() => []),
    db
      .select({
        policyId: renewalQueue.policyId,
        stage: renewalQueue.stage,
        updatedAt: renewalQueue.updatedAt,
      })
      .from(renewalQueue)
      .where(eq(renewalQueue.tenantId, DEFAULT_TENANT_ID))
      .catch(() => []),
    db
      .select({
        contactId: activityLogs.contactId,
        policyId: activityLogs.policyId,
        eventType: activityLogs.eventType,
      })
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.tenantId, DEFAULT_TENANT_ID),
          eq(activityLogs.eventType, REVIEW_EVENT),
          gte(activityLogs.occurredAt, since),
        ),
      )
      .catch(() => []),
  ]);

  const candidates: Candidate[] = [];
  for (const row of renewingPolicies) {
    if (row.stage !== "bound") continue;
    const at = asDate(row.updatedAt);
    if (!at || at.getTime() < since.getTime()) continue;
    candidates.push({
      moment: "renewal_close",
      contactId: null,
      policyId: row.policyId,
      dealId: null,
      activityId: null,
      at,
      label: "Renewal close",
    });
  }

  for (const row of recentComms) {
    // Schedule reminder creates kind=call with status open + dueAt — never pulse those.
    if (!isLoggedCallPulseCandidate(row)) continue;
    const at = asDate(row.createdAt);
    if (!at) continue;
    candidates.push({
      moment: "logged_call",
      contactId: row.contactId,
      policyId: row.policyId,
      dealId: row.dealId,
      activityId: row.id,
      at,
      label: row.title || "Logged call",
    });
  }
  for (const row of recentBinds) {
    const at = asDate(row.boundAt) ?? deskNow();
    candidates.push({
      moment: "bind",
      contactId: row.contactId,
      policyId: null,
      dealId: row.id,
      activityId: null,
      at,
      label: row.title || "Bind",
    });
  }
  for (const row of recentClaims) {
    const status = (row.status || "").toLowerCase();
    if (!/close|settled|paid|wrap|complete/.test(status)) continue;
    const at = asDate(row.updatedAt);
    if (!at) continue;
    candidates.push({
      moment: "claim_wrap",
      contactId: row.contactId,
      policyId: row.policyId,
      dealId: null,
      activityId: null,
      at,
      label: "Claim wrap",
    });
  }

  const skipCounts = new Map<string, number>();
  const rated = new Set<string>();
  const wedgeParties = new Set(
    wedgeReviews.flatMap((row) =>
      [row.contactId ? `c:${row.contactId}` : null, row.policyId ? `p:${row.policyId}` : null].filter(
        (key): key is string => Boolean(key),
      ),
    ),
  );
  for (const row of existing) {
    if (!isReviewMoment(row.moment)) continue;
    const key = entityKey(row);
    if (row.skipped) skipCounts.set(key, (skipCounts.get(key) ?? 0) + 1);
    else if (row.stars) rated.add(key);
  }

  const seen = new Set<string>();
  const eligible = candidates
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .filter((row) => {
      const key = entityKey(row);
      if (seen.has(key)) return false;
      seen.add(key);
      const alreadyOnCard =
        (row.contactId && wedgeParties.has(`c:${row.contactId}`)) ||
        (row.policyId && wedgeParties.has(`p:${row.policyId}`));
      return shouldOfferReview({
        alreadyRated: rated.has(key) || Boolean(alreadyOnCard),
        skipCount: skipCounts.get(key) ?? 0,
      });
    });

  const pick = eligible[0];
  if (!pick) return null;

  let entityLabel = pick.label;
  if (pick.contactId) {
    const [contact] = await db
      .select({ firstName: contacts.firstName, lastName: contacts.lastName, accountId: contacts.accountId })
      .from(contacts)
      .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), eq(contacts.id, pick.contactId)));
    if (contact) {
      let account = null;
      if (contact.accountId) {
        [account] = await db
          .select({ name: accounts.name })
          .from(accounts)
          .where(eq(accounts.id, contact.accountId));
      }
      entityLabel = partyLabel(contact, account) || pick.label;
    }
  } else if (pick.policyId) {
    const [policy] = await db
      .select({ policyNumber: policies.policyNumber })
      .from(policies)
      .where(eq(policies.id, pick.policyId));
    if (policy) entityLabel = policy.policyNumber;
  }

  const prompt = rotateReviewPrompt(`${pick.moment}:${pick.policyId ?? pick.dealId ?? pick.contactId ?? pick.activityId}`);
  return {
    moment: pick.moment,
    promptId: prompt.id,
    promptText: prompt.text,
    entityLabel,
    contactId: pick.contactId,
    policyId: pick.policyId,
    dealId: pick.dealId,
    activityId: pick.activityId,
    skipCount: skipCounts.get(entityKey(pick)) ?? 0,
  };
}
