import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { carriers, contacts, policies, policyTerms } from "@/lib/db/schema";
import { addUtcDays, deskNow } from "@/lib/home/as-of";
import { isInForceStatus } from "@/lib/policy/status";
import { partyLabel } from "@/lib/desk/policy-name";
import { expirationDay } from "@/lib/ams/renewals";
import type { PanelCard } from "@/lib/notifications/panel";
import {
  isRenewalTermStartCandidate,
  TERM_START_KIND,
  termStartCompareHref,
  termStartEntityLine,
  termStartKey,
  termStartPrimaryLabel,
  termStartUrgency,
  termStartWhy,
  termYearLabel,
} from "@/lib/notifications/term-start";

function utcDayFloor(asOf: Date): Date {
  return new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Silent Inbox awareness when a renewal term's effective day is today.
 * Idempotent via key renewal_term_started:policyId:YYYY-MM-DD (sync-panel + dismiss).
 */
export async function loadTermStartSignals(asOf = deskNow()): Promise<PanelCard[]> {
  const floor = utcDayFloor(asOf);
  const ceil = addUtcDays(floor, 1);

  const termRows = await db
    .select({
      termId: policyTerms.id,
      policyId: policyTerms.policyId,
      role: policyTerms.role,
      termEffective: policyTerms.termEffective,
      termExpiration: policyTerms.termExpiration,
    })
    .from(policyTerms)
    .where(
      and(
        eq(policyTerms.tenantId, DEFAULT_TENANT_ID),
        inArray(policyTerms.role, ["current", "proposed"]),
        gte(policyTerms.termEffective, floor),
        lt(policyTerms.termEffective, ceil),
      ),
    );

  if (termRows.length === 0) {
    // Fallback: policy.effectiveDate today when terms were never materialised.
    return loadFromPolicyEffective(asOf, floor, ceil);
  }

  const policyIds = [...new Set(termRows.map((row) => row.policyId))];
  const [policyRows, siblingTerms] = await Promise.all([
    db
      .select({
        policyId: policies.id,
        policyNumber: policies.policyNumber,
        lineOfBusiness: policies.lineOfBusiness,
        status: policies.status,
        effectiveDate: policies.effectiveDate,
        expirationDate: policies.expirationDate,
        originalEffectiveDate: policies.originalEffectiveDate,
        contactId: policies.contactId,
        carrierName: carriers.name,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
      })
      .from(policies)
      .leftJoin(carriers, eq(policies.carrierId, carriers.id))
      .leftJoin(contacts, eq(policies.contactId, contacts.id))
      .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), inArray(policies.id, policyIds))),
    db
      .select({
        policyId: policyTerms.policyId,
        role: policyTerms.role,
      })
      .from(policyTerms)
      .where(and(eq(policyTerms.tenantId, DEFAULT_TENANT_ID), inArray(policyTerms.policyId, policyIds))),
  ]);

  const byPolicy = new Map(policyRows.map((row) => [row.policyId, row]));
  const priorByPolicy = new Set(
    siblingTerms.filter((row) => row.role === "prior").map((row) => row.policyId),
  );

  const cards: PanelCard[] = [];
  const seen = new Set<string>();

  for (const term of termRows) {
    const policy = byPolicy.get(term.policyId);
    if (!policy || !isInForceStatus(policy.status)) continue;
    if (
      !isRenewalTermStartCandidate({
        termEffective: term.termEffective,
        asOf,
        hasPriorTerm: priorByPolicy.has(term.policyId),
        originalEffectiveDate: policy.originalEffectiveDate,
      })
    ) {
      continue;
    }
    const key = termStartKey(term.policyId, term.termEffective);
    if (seen.has(key)) continue;
    seen.add(key);

    const insured =
      partyLabel(
        policy.firstName || policy.lastName
          ? { firstName: policy.firstName ?? "", lastName: policy.lastName ?? "" }
          : null,
        null,
      ) || policy.policyNumber;
    const expiration = expirationDay(term.termExpiration) ?? expirationDay(policy.expirationDate);
    const termLabel = termYearLabel(term.termEffective, expiration);
    const href = termStartCompareHref(term.policyId);
    cards.push({
      key,
      kind: TERM_START_KIND,
      urgency: termStartUrgency(),
      entityLine: termStartEntityLine({ insuredName: insured, lineOfBusiness: policy.lineOfBusiness }),
      why: termStartWhy({ carrierName: policy.carrierName, termLabel }),
      primary: {
        id: "open_compare",
        label: termStartPrimaryLabel(),
        href,
        action: "open_entity",
      },
      href,
      entityType: "policy",
      entityId: term.policyId,
      deadline: term.termEffective,
      source: "live",
      policyId: term.policyId,
      contactId: policy.contactId,
    });
  }

  if (cards.length === 0) {
    return loadFromPolicyEffective(asOf, floor, ceil, seen);
  }
  return cards;
}

async function loadFromPolicyEffective(
  asOf: Date,
  floor: Date,
  ceil: Date,
  already = new Set<string>(),
): Promise<PanelCard[]> {
  const rows = await db
    .select({
      policyId: policies.id,
      policyNumber: policies.policyNumber,
      lineOfBusiness: policies.lineOfBusiness,
      status: policies.status,
      effectiveDate: policies.effectiveDate,
      expirationDate: policies.expirationDate,
      originalEffectiveDate: policies.originalEffectiveDate,
      contactId: policies.contactId,
      carrierName: carriers.name,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
    })
    .from(policies)
    .leftJoin(carriers, eq(policies.carrierId, carriers.id))
    .leftJoin(contacts, eq(policies.contactId, contacts.id))
    .where(
      and(
        eq(policies.tenantId, DEFAULT_TENANT_ID),
        gte(policies.effectiveDate, floor),
        lt(policies.effectiveDate, ceil),
      ),
    );

  if (rows.length === 0) return [];

  const policyIds = rows.map((row) => row.policyId);
  const priorTerms = await db
    .select({ policyId: policyTerms.policyId })
    .from(policyTerms)
    .where(
      and(
        eq(policyTerms.tenantId, DEFAULT_TENANT_ID),
        inArray(policyTerms.policyId, policyIds),
        eq(policyTerms.role, "prior"),
      ),
    );
  const priorByPolicy = new Set(priorTerms.map((row) => row.policyId));

  const cards: PanelCard[] = [];
  for (const row of rows) {
    if (!isInForceStatus(row.status)) continue;
    if (
      !isRenewalTermStartCandidate({
        termEffective: row.effectiveDate,
        asOf,
        hasPriorTerm: priorByPolicy.has(row.policyId),
        originalEffectiveDate: row.originalEffectiveDate,
      })
    ) {
      continue;
    }
    const key = termStartKey(row.policyId, row.effectiveDate);
    if (already.has(key)) continue;
    already.add(key);

    const insured =
      partyLabel(
        row.firstName || row.lastName
          ? { firstName: row.firstName ?? "", lastName: row.lastName ?? "" }
          : null,
        null,
      ) || row.policyNumber;
    const termLabel = termYearLabel(row.effectiveDate, expirationDay(row.expirationDate));
    const href = termStartCompareHref(row.policyId);
    cards.push({
      key,
      kind: TERM_START_KIND,
      urgency: termStartUrgency(),
      entityLine: termStartEntityLine({ insuredName: insured, lineOfBusiness: row.lineOfBusiness }),
      why: termStartWhy({ carrierName: row.carrierName, termLabel }),
      primary: {
        id: "open_compare",
        label: termStartPrimaryLabel(),
        href,
        action: "open_entity",
      },
      href,
      entityType: "policy",
      entityId: row.policyId,
      deadline: row.effectiveDate,
      source: "live",
      policyId: row.policyId,
      contactId: row.contactId,
    });
  }
  return cards;
}
