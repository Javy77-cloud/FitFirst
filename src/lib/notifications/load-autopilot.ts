import { and, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { activityLogs, alerts, contacts, policies, renewalQueue } from "@/lib/db/schema";
import { daysUntilExpiration, expirationDay } from "@/lib/ams/renewals";
import { addUtcDays, deskNow } from "@/lib/home/as-of";
import { resolveCurrentTerm } from "@/lib/policies/current-term";
import { partyLabel } from "@/lib/desk/policy-name";
import { CHASE_EVENT, CHASE_MARK, parseChaseBand } from "@/lib/renewal/chase";
import {
  AUTOPILOT_KIND,
  AUTOPILOT_SILENCE_DAYS,
  autopilotBandFor,
  autopilotConfirmLabel,
  autopilotKey,
  autopilotUrgency,
  autopilotWhy,
  encodeAutopilotMeta,
  parseAutopilotMeta,
  shouldEscalateAutopilot,
  shouldQueueAutopilot,
  type AutopilotBand,
} from "@/lib/renewal/autopilot";
import type { PanelCard } from "@/lib/notifications/panel";

function parseKey(body: string): string | null {
  return body.match(/<!--ff-panel:([^>]+)-->/)?.[1] ?? null;
}

function entityLine(name: string, product: string | null | undefined): string {
  const line = (product ?? "").trim();
  return line ? `${name} · ${line}` : name;
}

function chasedBand(
  logs: Array<{ eventType: string | null; body: string | null; subject: string | null }>,
  band: AutopilotBand,
): boolean {
  return logs.some((row) => {
    if (row.eventType !== CHASE_EVENT && row.eventType !== "queued" && row.eventType !== "sent") {
      return false;
    }
    const mark = parseChaseBand(`${row.body ?? ""} ${row.subject ?? ""}`);
    return mark === band || (row.body ?? "").includes(CHASE_MARK[band]);
  });
}

export async function loadAutopilotSignals(asOf = deskNow()): Promise<PanelCard[]> {
  const floor = addUtcDays(asOf, -1);
  const horizon = addUtcDays(asOf, 90);
  const rows = await db
    .select({
      policyId: policies.id,
      policyNumber: policies.policyNumber,
      lineOfBusiness: policies.lineOfBusiness,
      effectiveDate: policies.effectiveDate,
      expirationDate: policies.expirationDate,
      status: policies.status,
      contactId: policies.contactId,
      accountId: policies.accountId,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      beatsSuppressed: renewalQueue.beatsSuppressed,
    })
    .from(policies)
    .leftJoin(contacts, eq(policies.contactId, contacts.id))
    .leftJoin(
      renewalQueue,
      and(eq(renewalQueue.policyId, policies.id), eq(renewalQueue.tenantId, DEFAULT_TENANT_ID)),
    )
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
    return autopilotBandFor(days) != null;
  });
  if (candidates.length === 0) return [];

  const policyIds = candidates.map((row) => row.policyId);
  const contactIds = candidates.map((row) => row.contactId).filter((id): id is string => Boolean(id));
  const logs = await db
    .select({
      policyId: activityLogs.policyId,
      contactId: activityLogs.contactId,
      eventType: activityLogs.eventType,
      body: activityLogs.body,
      subject: activityLogs.subject,
    })
    .from(activityLogs)
    .where(
      and(
        eq(activityLogs.tenantId, DEFAULT_TENANT_ID),
        policyIds.length && contactIds.length
          ? or(inArray(activityLogs.policyId, policyIds), inArray(activityLogs.contactId, contactIds))
          : inArray(activityLogs.policyId, policyIds),
      ),
    );

  const logsByPolicy = new Map<string, typeof logs>();
  for (const log of logs) {
    const key = log.policyId ?? (log.contactId ? `c:${log.contactId}` : "");
    if (!key) continue;
    const list = logsByPolicy.get(key) ?? [];
    list.push(log);
    logsByPolicy.set(key, list);
  }

  const existing = await db
    .select({
      id: alerts.id,
      body: alerts.body,
      createdAt: alerts.createdAt,
    })
    .from(alerts)
    .where(
      and(
        eq(alerts.tenantId, DEFAULT_TENANT_ID),
        eq(alerts.kind, AUTOPILOT_KIND),
        isNull(alerts.readAt),
      ),
    );
  const existingByKey = new Map<string, (typeof existing)[number]>();
  for (const row of existing) {
    const key = parseKey(row.body);
    if (key) existingByKey.set(key, row);
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
    const band = autopilotBandFor(days);
    if (!band) continue;
    const partyLogs = [
      ...(logsByPolicy.get(row.policyId) ?? []),
      ...(row.contactId ? (logsByPolicy.get(`c:${row.contactId}`) ?? []) : []),
    ];
    const chased = chasedBand(partyLogs, band);
    if (!shouldQueueAutopilot({ chasedThisBand: chased, band, beatsSuppressed: row.beatsSuppressed })) continue;

    const name =
      partyLabel(
        row.firstName || row.lastName ? { firstName: row.firstName ?? "", lastName: row.lastName ?? "" } : null,
        null,
      ) || row.policyNumber;
    const key = autopilotKey(row.policyId, band);
    const prior = existingByKey.get(key);
    const priorMeta = prior ? parseAutopilotMeta(prior.body) : null;
    const queuedAt = priorMeta?.queuedAt
      ? new Date(priorMeta.queuedAt)
      : prior?.createdAt ?? asOf;
    const alreadyEscalated = Boolean(priorMeta?.escalated);
    const escalated =
      alreadyEscalated ||
      shouldEscalateAutopilot({
        queuedAt,
        asOf,
        alreadyEscalated,
        chasedThisBand: chased,
      });
    const why = autopilotWhy({
      band,
      daysUntil: days,
      escalated,
      silenceDays: AUTOPILOT_SILENCE_DAYS,
    });
    cards.push({
      key,
      kind: AUTOPILOT_KIND,
      urgency: autopilotUrgency(band, escalated),
      entityLine: entityLine(name, row.lineOfBusiness),
      why,
      primary: {
        id: "confirm_chase",
        label: autopilotConfirmLabel(band, escalated),
        href: "/notifications",
        action: "confirm_chase",
      },
      href: `/renewals`,
      entityType: "policy",
      entityId: row.policyId,
      deadline: row.expirationDate,
      source: "live",
      policyId: row.policyId,
      contactId: row.contactId,
      chaseBand: band,
      escalated,
      clientName: name,
      daysUntil: days,
      metaBody: encodeAutopilotMeta({
        band,
        queuedAt: queuedAt.toISOString(),
        escalated,
        escalatedAt: escalated ? (priorMeta?.escalatedAt ?? asOf.toISOString()) : undefined,
      }),
    });
  }
  return cards;
}
