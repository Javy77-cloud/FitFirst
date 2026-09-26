import { commitmentNudgePanelKey } from "@/lib/notifications/commitments";
import { and, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { notHiddenDocument } from "@/lib/documents/visible-docs";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  activityLogs,
  contacts,
  deals,
  documents,
  policies,
} from "@/lib/db/schema";
import { daysUntilExpiration, expirationDay } from "@/lib/ams/renewals";
import { addUtcDays, deskNow } from "@/lib/home/as-of";
import { resolveCurrentTerm } from "@/lib/policies/current-term";
import { docExpiryWarning, isExpiringDocType } from "@/lib/policy/document-depth";
import { partyLabel } from "@/lib/desk/policy-name";
import { formatPanelEntityLine } from "@/lib/notifications/copy";
import {
  commitmentNudgeUrgency,
  commitmentNudgeWhy,
  isRenewalSilenceWindow,
  isRenewalSilent,
  renewalSilenceUrgency,
  renewalSilenceWhy,
  sortPanelCards,
  staleDocsUrgency,
  staleDocsWhy,
  STALE_DOCS_GATHERING_DAYS,
  type PanelCard,
} from "@/lib/notifications/panel";
import { loadOpenCommitments } from "@/lib/notifications/load-commitments";
import { loadAutopilotSignals } from "@/lib/notifications/load-autopilot";
import { autopilotCoveredPolicyIds } from "@/lib/renewal/autopilot";
import { isDocumentsSourceDoc } from "@/lib/deals/quote-docs";

const OUTREACH_KINDS = ["call", "email", "sms", "meeting"] as const;

function entityLine(name: string, product: string | null | undefined): string {
  return formatPanelEntityLine(name, product);
}

/**
 * Quote declines, approvals, and API returns are visible on the Quotes tab.
 * This loader used to bell overnight declines (`Declined by Stand · home~…`).
 * It no longer emits those cards.
 */
export async function loadQuoteDeclinedSignals(asOf = deskNow()): Promise<PanelCard[]> {
  void asOf;
  return [];
}

export async function loadRenewalSilenceSignals(asOf = deskNow()): Promise<PanelCard[]> {
  const floor = addUtcDays(asOf, -1);
  const horizon = addUtcDays(asOf, 52);
  const rows = await db
    .select({
      policyId: policies.id,
      policyNumber: policies.policyNumber,
      lineOfBusiness: policies.lineOfBusiness,
      effectiveDate: policies.effectiveDate,
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
    const resolved = resolveCurrentTerm(
      {
        status: row.status,
        lineOfBusiness: row.lineOfBusiness,
        policyNumber: row.policyNumber,
        effectiveDate: row.effectiveDate,
        expirationDate: row.expirationDate,
      },
      asOf,
    );
    if (!resolved.countsAsInForce) return false;
    const exp = expirationDay(resolved.bookExpiration ?? row.expirationDate);
    if (!exp) return false;
    const days = resolved.daysLeft ?? daysUntilExpiration(exp, asOf);
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
    const resolved = resolveCurrentTerm(
      {
        status: row.status,
        lineOfBusiness: row.lineOfBusiness,
        policyNumber: row.policyNumber,
        effectiveDate: row.effectiveDate,
        expirationDate: row.expirationDate,
      },
      asOf,
    );
    const days = resolved.daysLeft;
    if (days == null) continue;
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
      deadline: row.expirationDate,
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
    .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), notHiddenDocument()));

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
        .where(
          and(
            eq(documents.tenantId, DEFAULT_TENANT_ID),
            inArray(documents.dealId, gatheringIds),
            notHiddenDocument(),
          ),
        )
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
    const urgency = commitmentNudgeUrgency(row.dueAt, asOf, row.priority);
    if (!urgency) continue;
    cards.push({
      key: commitmentNudgePanelKey({ source: row.source, id: row.id }),
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
  const [declines, renewals, autopilot, docs, nudges, cold, inbox, assigned, termStarts] = await Promise.all([
    loadQuoteDeclinedSignals(asOf).catch(() => []),
    loadRenewalSilenceSignals(asOf).catch(() => []),
    loadAutopilotSignals(asOf).catch(() => []),
    loadStaleDocSignals(asOf).catch(() => []),
    loadCommitmentNudgeSignals(asOf).catch(() => []),
    loadColdChaseSignals().catch(() => []),
    import("@/lib/notifications/load-inbox").then((mod) => mod.loadInboxMailSignals(asOf).catch(() => [])),
    import("@/lib/notifications/load-inbox-assigned").then((mod) =>
      mod.loadInboxAssignedSignals().catch(() => []),
    ),
    import("@/lib/notifications/load-term-start").then((mod) => mod.loadTermStartSignals(asOf).catch(() => [])),
  ]);
  const covered = autopilotCoveredPolicyIds(autopilot);
  const silence = renewals.filter((card) => !card.policyId || !covered.has(card.policyId));
  return sortPanelCards([
    ...declines,
    ...silence,
    ...autopilot,
    ...docs,
    ...nudges,
    ...cold,
    ...inbox,
    ...assigned,
    ...termStarts,
  ]);
}
