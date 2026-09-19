import { and, eq, inArray, or } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { activityLogs, claims, contacts, policies, policyEvents, users } from "@/lib/db/schema";
import { deskNow } from "@/lib/home/as-of";
import { parseMoney } from "@/lib/renewal/compare";
import {
  CHASE_EVENT,
  CHASE_MARK,
  parseChaseBand,
  REVIEW_EVENT,
  REVIEW_SKIP_EVENT,
} from "@/lib/renewal/chase";
import {
  averageHealthStars,
  derivedHealthStars,
  healthFlagFromRatings,
  riskLevelFromScore,
} from "@/lib/renewal/health";
import { countRatingsUnder3, parseReviewScores } from "@/lib/renewal/mini-review";
import { renewalUrgencyBand, renewalWhyLine } from "@/lib/renewal/urgency";
import { isEndedStatus, isInForceStatus } from "@/lib/policy/status";
import { daysUntil, scoreRenewalRisk } from "@/lib/renewal-risk/score";
import type { RenewalBoardCard } from "@/lib/renewal/board-data";

const CONTACT_KINDS = new Set(["call", "email", "sms", "meeting"]);

function partyKey(card: Pick<RenewalBoardCard, "contactId" | "accountId" | "policyId">): string {
  if (card.contactId) return `c:${card.contactId}`;
  if (card.accountId) return `a:${card.accountId}`;
  return `p:${card.policyId}`;
}

function claimWrapped(status: string): boolean {
  return /wrap|closed|paid|complete|settled/i.test(status);
}

function isLoggedCall(kind: string, eventType: string): boolean {
  return kind === "call" && (eventType === "logged" || eventType === "completed");
}

export async function enrichRenewalCards(cards: RenewalBoardCard[]): Promise<RenewalBoardCard[]> {
  if (cards.length === 0) return cards;
  const asOf = deskNow();
  const policyIds = cards.map((card) => card.policyId);
  const contactIds = [...new Set(cards.map((card) => card.contactId).filter(Boolean))] as string[];
  const accountIds = [...new Set(cards.map((card) => card.accountId).filter(Boolean))] as string[];
  const ownerIds = [...new Set(cards.map((card) => card.ownerId).filter(Boolean))] as string[];

  const logFilters = [
    inArray(activityLogs.policyId, policyIds),
    ...(contactIds.length ? [inArray(activityLogs.contactId, contactIds)] : []),
    ...(accountIds.length ? [inArray(activityLogs.accountId, accountIds)] : []),
  ];

  const [logRows, policyRows, claimRows, ownerRows, tenureRows, eventRows] = await Promise.all([
    db
      .select({
        kind: activityLogs.kind,
        eventType: activityLogs.eventType,
        body: activityLogs.body,
        subject: activityLogs.subject,
        occurredAt: activityLogs.occurredAt,
        direction: activityLogs.direction,
        contactId: activityLogs.contactId,
        accountId: activityLogs.accountId,
        policyId: activityLogs.policyId,
      })
      .from(activityLogs)
      .where(and(eq(activityLogs.tenantId, DEFAULT_TENANT_ID), or(...logFilters))),
    db
      .select({
        id: policies.id,
        contactId: policies.contactId,
        accountId: policies.accountId,
        status: policies.status,
        effectiveDate: policies.effectiveDate,
        originalEffectiveDate: policies.originalEffectiveDate,
        endedAt: policies.endedAt,
      })
      .from(policies)
      .where(
        and(
          eq(policies.tenantId, DEFAULT_TENANT_ID),
          or(
            inArray(policies.id, policyIds),
            ...(contactIds.length ? [inArray(policies.contactId, contactIds)] : []),
            ...(accountIds.length ? [inArray(policies.accountId, accountIds)] : []),
          ),
        ),
      ),
    db
      .select({
        policyId: claims.policyId,
        contactId: claims.contactId,
        status: claims.status,
      })
      .from(claims)
      .where(
        and(
          eq(claims.tenantId, DEFAULT_TENANT_ID),
          or(
            inArray(claims.policyId, policyIds),
            ...(contactIds.length ? [inArray(claims.contactId, contactIds)] : []),
          ),
        ),
      ),
    ownerIds.length
      ? db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(and(eq(users.tenantId, DEFAULT_TENANT_ID), inArray(users.id, ownerIds)))
      : Promise.resolve([] as { id: string; name: string }[]),
    contactIds.length
      ? db
          .select({ id: contacts.id, tenureStart: contacts.tenureStart })
          .from(contacts)
          .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), inArray(contacts.id, contactIds)))
      : Promise.resolve([] as { id: string; tenureStart: Date | null }[]),
    db
      .select({
        policyId: policyEvents.policyId,
        kind: policyEvents.kind,
        createdAt: policyEvents.createdAt,
      })
      .from(policyEvents)
      .where(and(eq(policyEvents.tenantId, DEFAULT_TENANT_ID), inArray(policyEvents.policyId, policyIds))),
  ]);

  const ownerName = new Map(ownerRows.map((row) => [row.id, row.name]));

  return cards.map((card) => {
    const key = partyKey(card);
    const household = policyRows.filter(
      (row) =>
        (card.contactId && row.contactId === card.contactId) ||
        (card.accountId && row.accountId === card.accountId) ||
        row.id === card.policyId,
    );
    const partyLogs = logRows.filter(
      (row) =>
        (card.contactId && row.contactId === card.contactId) ||
        (card.accountId && row.accountId === card.accountId) ||
        row.policyId === card.policyId,
    );
    const contactLogs = partyLogs
      .filter((row) => CONTACT_KINDS.has(row.kind))
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
    const last = contactLogs[0];
    const lastContactDays = last ? daysUntil(last.occurredAt, asOf) : null;
    const outbound = contactLogs.find((row) => row.direction === "outbound" || row.eventType === "queued" || row.eventType === "sent");
    const inbound = contactLogs.find((row) => row.direction === "inbound" || row.eventType === "received");
    const daysSinceOurTouch = outbound ? daysUntil(outbound.occurredAt, asOf) : lastContactDays;
    const daysSinceTheirReply = inbound ? daysUntil(inbound.occurredAt, asOf) : null;
    const tenureStart =
      (card.contactId && tenureRows.find((row) => row.id === card.contactId)?.tenureStart) ||
      household
        .map((row) => row.originalEffectiveDate ?? row.effectiveDate)
        .filter((date): date is Date => date instanceof Date)
        .sort((a, b) => a.getTime() - b.getTime())[0] ||
      null;
    const tenureDays = tenureStart ? daysUntil(tenureStart, asOf) : null;
    const yearAgo = new Date(asOf.getTime());
    yearAgo.setUTCFullYear(yearAgo.getUTCFullYear() - 1);
    const cancelCount = household.filter((row) => isEndedStatus(row.status) || Boolean(row.endedAt)).length;
    const householdIds = new Set(household.map((row) => row.id));
    const addCount = household.filter((row) => row.effectiveDate && row.effectiveDate >= yearAgo && isInForceStatus(row.status)).length
      + eventRows.filter((row) => row.policyId && householdIds.has(row.policyId) && /add|new|endorse/i.test(row.kind) && row.createdAt >= yearAgo).length;
    const current = parseMoney(card.premium);
    const proposed = parseMoney(card.proposedPremium);
    const premiumChangePct =
      current != null && proposed != null && current !== 0 ? (proposed - current) / current : null;
    const inForceCount = household.filter((row) => isInForceStatus(row.status)).length;
    const riskScore = scoreRenewalRisk({
      daysToRenewal: card.daysUntil,
      premiumChangePct,
      inForceCount: inForceCount || 1,
      hasLapseHistory: household.some((row) => isEndedStatus(row.status)),
      daysSinceContact: lastContactDays,
      daysSinceOurTouch,
      daysSinceTheirReply,
      tenureDays,
      cancelCount,
      addCount,
    });
    const policyRisk = scoreRenewalRisk({
      daysToRenewal: card.daysUntil,
      premiumChangePct,
      inForceCount: 1,
      hasLapseHistory: false,
      daysSinceContact: lastContactDays,
      daysSinceOurTouch,
      daysSinceTheirReply,
    });
    const risk = riskLevelFromScore(riskScore);
    const topFactor =
      riskScore.factors
        .filter((factor) => factor.id !== "days_to_renewal" && factor.points > 0)
        .sort((a, b) => b.points - a.points)[0]?.detail ?? null;
    const band = renewalUrgencyBand(card.daysUntil);
    const chasedThisBand = partyLogs.some((row) => {
      if (row.eventType !== CHASE_EVENT && row.eventType !== "queued") return false;
      const mark = parseChaseBand(`${row.body ?? ""} ${row.subject ?? ""}`);
      return mark === band || (row.body ?? "").includes(CHASE_MARK[band]);
    });
    const reviewLogs = partyLogs.filter((row) => row.eventType === REVIEW_EVENT);
    const skipCount = partyLogs.filter((row) => row.eventType === REVIEW_SKIP_EVENT).length;
    const ratingScores = reviewLogs.flatMap((row) => parseReviewScores(row.body));
    const ratingsUnder3 = countRatingsUnder3(ratingScores);
    const ratedStars = averageHealthStars(ratingScores);
    const healthStars = ratedStars ?? derivedHealthStars(riskScore.score);
    const policyReviewScores = reviewLogs
      .filter((row) => row.policyId === card.policyId)
      .flatMap((row) => parseReviewScores(row.body));
    const policyRated = averageHealthStars(policyReviewScores);
    const policyHealthStars = policyRated ?? derivedHealthStars(policyRisk.score);
    const healthFlagged = healthFlagFromRatings(ratingsUnder3);
    const wrappedClaim = claimRows.some(
      (row) =>
        claimWrapped(row.status) &&
        (row.policyId === card.policyId || (card.contactId && row.contactId === card.contactId)),
    );
    const loggedCall = partyLogs.some((row) => isLoggedCall(row.kind, row.eventType));
    const bindOrClose = card.stage === "bound" || card.stage === "lost";
    const triggerReady = chasedThisBand || bindOrClose || wrappedClaim || loggedCall;
    const reviewDue = triggerReady && reviewLogs.length === 0 && skipCount < 2;
    const hasCurrentTerm = card.premium != null && card.premium !== "";
    const hasProposedTerm = card.proposedPremium != null && card.proposedPremium !== "";

    return {
      ...card,
      ownerName: (card.ownerId && ownerName.get(card.ownerId)) || card.ownerName,
      partyKey: key,
      risk,
      riskScore: riskScore.score,
      whyExtra: topFactor,
      why: renewalWhyLine({
        daysUntil: card.daysUntil,
        premiumDelta: card.premiumDelta,
        whyExtra: topFactor,
      }),
      hasCurrentTerm,
      hasProposedTerm,
      canCompare: hasCurrentTerm && hasProposedTerm,
      chasedThisBand,
      reviewDue,
      reviewSkipCount: skipCount,
      healthStars,
      policyHealthStars,
      healthSource: ratedStars != null ? "rated" : "model",
      healthFlagged,
      lastContactDays,
    };
  });
}
