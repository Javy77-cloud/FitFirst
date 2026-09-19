import { and, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  activityLogs,
  carriers,
  contacts,
  deals,
  documents,
  policies,
  quotes,
} from "@/lib/db/schema";
import { daysUntilExpiration, expirationDay } from "@/lib/ams/renewals";
import { addUtcDays, deskNow } from "@/lib/home/as-of";
import { isInForceStatus } from "@/lib/policy/status";
import { docExpiryWarning, isExpiringDocType } from "@/lib/policy/document-depth";
import { partyLabel } from "@/lib/desk/policy-name";
import {
  commitmentNudgeUrgency,
  commitmentNudgeWhy,
  isOvernightDecline,
  isRenewalSilenceWindow,
  isRenewalSilent,
  quoteDeclinedUrgency,
  quoteDeclinedWhy,
  renewalSilenceUrgency,
  renewalSilenceWhy,
  sortPanelCards,
  staleDocsUrgency,
  staleDocsWhy,
  STALE_DOCS_GATHERING_DAYS,
  type PanelCard,
} from "@/lib/notifications/panel";
import { loadOpenCommitments } from "@/lib/notifications/load-commitments";
import { isDocumentsSourceDoc } from "@/lib/deals/quote-docs";

const OUTREACH_KINDS = ["call", "email", "sms", "meeting"] as const;

function entityLine(name: string, product: string | null | undefined): string {
  const line = (product ?? "").trim();
  return line ? `${name} · ${line}` : name;
}

export async function loadQuoteDeclinedSignals(asOf = deskNow()): Promise<PanelCard[]> {
  const since = new Date(asOf.getTime() - 18 * 60 * 60 * 1000);
  const declined = await db
    .select({
      quoteId: quotes.id,
      dealId: quotes.dealId,
      createdAt: quotes.createdAt,
      shopLine: quotes.shopLine,
      carrierName: carriers.name,
      dealTitle: deals.title,
      dealStage: deals.pipelineStage,
      contactFirst: contacts.firstName,
      contactLast: contacts.lastName,
    })
    .from(quotes)
    .innerJoin(deals, eq(quotes.dealId, deals.id))
    .innerJoin(carriers, eq(quotes.carrierId, carriers.id))
    .leftJoin(contacts, eq(deals.contactId, contacts.id))
    .where(
      and(
        eq(quotes.tenantId, DEFAULT_TENANT_ID),
        eq(quotes.riskOutcome, "declined"),
        gte(quotes.createdAt, since),
        isNull(deals.archivedAt),
      ),
    );

  const overnight = declined.filter((row) => isOvernightDecline(row.createdAt, asOf));
  if (overnight.length === 0) return [];

  const dealIds = [...new Set(overnight.map((row) => row.dealId))];
  const siblings = await db
    .select({
      dealId: quotes.dealId,
      riskOutcome: quotes.riskOutcome,
      bindable: quotes.bindable,
    })
    .from(quotes)
    .where(and(eq(quotes.tenantId, DEFAULT_TENANT_ID), inArray(quotes.dealId, dealIds)));

  const remainingByDeal = new Map<string, number>();
  for (const row of siblings) {
    const dead = row.riskOutcome === "declined" || row.riskOutcome === "no_market";
    if (dead) continue;
    remainingByDeal.set(row.dealId, (remainingByDeal.get(row.dealId) ?? 0) + 1);
  }

  return overnight.map((row) => {
    const remaining = remainingByDeal.get(row.dealId) ?? 0;
    const name =
      partyLabel(
        row.contactFirst || row.contactLast
          ? { firstName: row.contactFirst ?? "", lastName: row.contactLast ?? "" }
          : null,
        null,
      ) || row.dealTitle;
    return {
      key: `quote_declined:${row.quoteId}`,
      kind: "quote_declined" as const,
      urgency: quoteDeclinedUrgency(remaining),
      entityLine: entityLine(name, row.shopLine || "Quote"),
      why: quoteDeclinedWhy({
        carrierName: row.carrierName,
        declinedAt: row.createdAt,
        remainingMarkets: remaining,
      }),
      primary: {
        id: "retry_markets",
        label: remaining > 0 ? "Retry carriers" : "Open Markets",
        href: `/deals/${row.dealId}?tab=markets`,
        action: "retry_markets",
      },
      href: `/deals/${row.dealId}?tab=markets`,
      entityType: "deal",
      entityId: row.dealId,
      deadline: row.createdAt,
      source: "live" as const,
      dealId: row.dealId,
      quoteId: row.quoteId,
      remainingMarkets: remaining,
    };
  });
}

export async function loadRenewalSilenceSignals(asOf = deskNow()): Promise<PanelCard[]> {
  const floor = addUtcDays(asOf, -1);
  const horizon = addUtcDays(asOf, 52);
  const rows = await db
    .select({
      policyId: policies.id,
      policyNumber: policies.policyNumber,
      lineOfBusiness: policies.lineOfBusiness,
      expirationDate: policies.expirationDate,
      status: policies.status,
      contactId: policies.contactId,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
    })
    .from(policies)
    .leftJoin(contacts, eq(policies.contactId, contacts.id))
    .where(
      and(
        eq(policies.tenantId, DEFAULT_TENANT_ID),
        gte(policies.expirationDate, floor),
        lte(policies.expirationDate, horizon),
      ),
    );

  const candidates = rows.filter((row) => {
    if (!isInForceStatus(row.status)) return false;
    const exp = expirationDay(row.expirationDate);
    if (!exp) return false;
    const days = daysUntilExpiration(exp, asOf);
    return isRenewalSilenceWindow(days) || days < 30;
  });
  if (candidates.length === 0) return [];

  const policyIds = candidates.map((row) => row.policyId);
  const contactIds = candidates.map((row) => row.contactId).filter((id): id is string => Boolean(id));
  const logs = await db
    .select({
      policyId: activityLogs.policyId,
      contactId: activityLogs.contactId,
      occurredAt: activityLogs.occurredAt,
      kind: activityLogs.kind,
    })
    .from(activityLogs)
    .where(
      and(
        eq(activityLogs.tenantId, DEFAULT_TENANT_ID),
        inArray(activityLogs.kind, [...OUTREACH_KINDS]),
        policyIds.length && contactIds.length
          ? or(inArray(activityLogs.policyId, policyIds), inArray(activityLogs.contactId, contactIds))
          : policyIds.length
            ? inArray(activityLogs.policyId, policyIds)
            : inArray(activityLogs.contactId, contactIds.length ? contactIds : ["00000000-0000-0000-0000-000000000000"]),
      ),
    );

  const lastByPolicy = new Map<string, Date>();
  const lastByContact = new Map<string, Date>();
  for (const log of logs) {
    if (log.policyId) {
      const prev = lastByPolicy.get(log.policyId);
      if (!prev || log.occurredAt > prev) lastByPolicy.set(log.policyId, log.occurredAt);
    }
    if (log.contactId) {
      const prev = lastByContact.get(log.contactId);
      if (!prev || log.occurredAt > prev) lastByContact.set(log.contactId, log.occurredAt);
    }
  }

  const cards: PanelCard[] = [];
  for (const row of candidates) {
    const exp = expirationDay(row.expirationDate);
    if (!exp) continue;
    const days = daysUntilExpiration(exp, asOf);
    const last =
      lastByPolicy.get(row.policyId) ?? (row.contactId ? lastByContact.get(row.contactId) ?? null : null);
    if (!isRenewalSilent(last ?? null, asOf) && !isRenewalSilenceWindow(days)) continue;
    if (!isRenewalSilent(last ?? null, asOf)) continue;
    if (!isRenewalSilenceWindow(days) && days >= 30) continue;
    const name =
      partyLabel(
        row.firstName || row.lastName ? { firstName: row.firstName ?? "", lastName: row.lastName ?? "" } : null,
        null,
      ) || row.policyNumber;
    cards.push({
      key: `renewal_silence:${row.policyId}`,
      kind: "renewal_silence",
      urgency: renewalSilenceUrgency(days),
      entityLine: entityLine(name, row.lineOfBusiness),
      why: renewalSilenceWhy({ daysUntil: days, lastOutreachAt: last ?? null, asOf }),
      primary: {
        id: "send_renewal_reminder",
        label: "Send reminder",
        href: `/renewals`,
        action: "send_renewal_reminder",
      },
      href: `/policies/${row.policyId}`,
      entityType: "policy",
      entityId: row.policyId,
      deadline: exp,
      source: "live",
      policyId: row.policyId,
      contactId: row.contactId,
    });
  }
  return cards;
}

export async function loadStaleDocSignals(asOf = deskNow()): Promise<PanelCard[]> {
  const expiring = await db
    .select({
      id: documents.id,
      filename: documents.filename,
      docType: documents.docType,
      expiresAt: documents.expiresAt,
      dealId: documents.dealId,
      policyId: documents.policyId,
      contactId: documents.contactId,
    })
    .from(documents)
    .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID)));

  const cards: PanelCard[] = [];
  for (const doc of expiring) {
    if (!doc.expiresAt || !isExpiringDocType(doc.docType)) continue;
    const warn = docExpiryWarning(doc.docType, doc.expiresAt, asOf);
    if (!warn.warn || warn.days == null) continue;
    const days = warn.days;
    const uploadHref = doc.dealId
      ? `/deals/${doc.dealId}?tab=documents`
      : doc.policyId
        ? `/policies/${doc.policyId}`
        : doc.contactId
          ? `/contacts/${doc.contactId}`
          : `/files/${doc.id}`;
    cards.push({
      key: `stale_docs:${doc.id}`,
      kind: "stale_docs",
      urgency: staleDocsUrgency({
        expired: days < 0,
        daysQuiet: 0,
        daysToExpiry: days,
      }),
      entityLine: entityLine(doc.filename, doc.docType),
      why: staleDocsWhy({
        label: doc.docType.replaceAll("_", " "),
        expired: days < 0,
        daysQuiet: 0,
        daysToExpiry: days,
      }),
      primary: { id: "open_upload", label: "Open upload", href: uploadHref, action: "open_upload" },
      href: uploadHref,
      entityType: doc.dealId ? "deal" : doc.policyId ? "policy" : "document",
      entityId: doc.dealId ?? doc.policyId ?? doc.id,
      deadline: doc.expiresAt,
      source: "live",
      dealId: doc.dealId,
      policyId: doc.policyId,
      contactId: doc.contactId,
    });
  }

  const gathering = await db
    .select({
      id: deals.id,
      title: deals.title,
      lineOfBusiness: deals.lineOfBusiness,
      createdAt: deals.createdAt,
      updatedAt: deals.updatedAt,
      contactId: deals.contactId,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
    })
    .from(deals)
    .leftJoin(contacts, eq(deals.contactId, contacts.id))
    .where(
      and(
        eq(deals.tenantId, DEFAULT_TENANT_ID),
        isNull(deals.archivedAt),
        or(eq(deals.pipelineStage, "gathering"), eq(deals.pipelineStageSlug, "gathering")),
      ),
    );

  const gatheringIds = gathering.map((row) => row.id);
  const sourceDocs = gatheringIds.length
    ? await db
        .select({
          dealId: documents.dealId,
          slot: documents.slot,
          docType: documents.docType,
          tags: documents.tags,
        })
        .from(documents)
        .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), inArray(documents.dealId, gatheringIds)))
    : [];
  const dealsWithSource = new Set(
    sourceDocs.filter((doc) => isDocumentsSourceDoc(doc) && doc.dealId).map((doc) => doc.dealId as string),
  );

  for (const deal of gathering) {
    if (dealsWithSource.has(deal.id)) continue;
    const quietMs = asOf.getTime() - (deal.updatedAt ?? deal.createdAt).getTime();
    const daysQuiet = Math.floor(quietMs / 86_400_000);
    if (daysQuiet < STALE_DOCS_GATHERING_DAYS) continue;
    const name =
      partyLabel(
        deal.firstName || deal.lastName ? { firstName: deal.firstName ?? "", lastName: deal.lastName ?? "" } : null,
        null,
      ) || deal.title;
    cards.push({
      key: `stale_docs:deal:${deal.id}`,
      kind: "stale_docs",
      urgency: staleDocsUrgency({ expired: false, daysQuiet, daysToExpiry: null }),
      entityLine: entityLine(name, deal.lineOfBusiness),
      why: staleDocsWhy({
        label: "Source dec",
        expired: false,
        daysQuiet,
        daysToExpiry: null,
      }),
      primary: {
        id: "open_upload",
        label: "Open upload",
        href: `/deals/${deal.id}?tab=documents`,
        action: "open_upload",
      },
      href: `/deals/${deal.id}?tab=documents`,
      entityType: "deal",
      entityId: deal.id,
      deadline: deal.updatedAt ?? deal.createdAt,
      source: "live",
      dealId: deal.id,
      contactId: deal.contactId,
    });
  }

  return cards;
}

export async function loadCommitmentNudgeSignals(asOf = deskNow()): Promise<PanelCard[]> {
  const commitments = await loadOpenCommitments(asOf);
  const cards: PanelCard[] = [];
  for (const row of commitments) {
    if (row.orphan) continue;
    const urgency = commitmentNudgeUrgency(row.dueAt, asOf);
    if (!urgency) continue;
    cards.push({
      key: `commitment_nudge:${row.source}:${row.id}`,
      kind: "commitment_nudge",
      urgency,
      entityLine: row.recordName || row.title,
      why: commitmentNudgeWhy({ title: row.title, dueAt: row.dueAt, asOf }),
      primary: { id: "open_entity", label: "Open record", href: row.href, action: "open_entity" },
      href: row.href,
      entityType: row.recordType ?? "activity",
      entityId: row.dealId ?? row.contactId ?? row.policyId ?? row.leadId ?? row.accountId ?? row.id,
      deadline: row.dueAt,
      source: "live",
      dealId: row.dealId,
      contactId: row.contactId,
      policyId: row.policyId,
    });
  }
  return cards;
}

export async function loadColdChaseSignals(): Promise<PanelCard[]> {
  const { listDeals } = await import("@/lib/db/queries");
  const { loadDealVelocityTouches, presentRadarCards } = await import("@/lib/deals/radar-desk");
  const { planColdChaseNotices } = await import("@/lib/deals/cold-chase");
  const rows = await listDeals({});
  const touches = await loadDealVelocityTouches(rows.map((row) => row.deal.id));
  const cards = presentRadarCards(rows, touches, new Map());
  return planColdChaseNotices(cards).map((notice) => ({
    key: `deal_cold_chase:${notice.dealId}`,
    kind: "deal_cold_chase" as const,
    urgency: "high" as const,
    entityLine: notice.body.split(" · ")[0] || notice.title,
    why: notice.body,
    primary: { id: "chase", label: "Chase", href: notice.href },
    href: notice.href,
    entityType: "deal",
    entityId: notice.dealId,
    deadline: null,
    source: "live" as const,
    dealId: notice.dealId,
  }));
}

export async function loadPanelCards(asOf = deskNow()): Promise<PanelCard[]> {
  const [declines, renewals, docs, nudges, cold] = await Promise.all([
    loadQuoteDeclinedSignals(asOf).catch(() => []),
    loadRenewalSilenceSignals(asOf).catch(() => []),
    loadStaleDocSignals(asOf).catch(() => []),
    loadCommitmentNudgeSignals(asOf).catch(() => []),
    loadColdChaseSignals().catch(() => []),
  ]);
  return sortPanelCards([...declines, ...renewals, ...docs, ...nudges, ...cold]);
}
