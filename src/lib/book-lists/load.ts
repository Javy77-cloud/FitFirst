import { and, eq, inArray, sql } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  appetiteQuoteDecisions,
  carrierAppetite,
  carriers,
  claims,
  deals,
  endorsementDrafts,
  policies,
  policyTerms,
  quoteAttemptLogs,
} from "@/lib/db/schema";
import type { PolicyNeedSignal } from "./present";
import { slugFromCarrierName } from "@/lib/appetite/gate/identity";
import { OPEN_DEAL_STAGES } from "@/lib/home/kpis";
import { loadPartyHealthMap } from "@/lib/health/load";
import type { HealthChipView } from "@/lib/health/model";
import type { CarrierMarketSignal, OpenDealSignal } from "./present";

function tenant() {
  return DEFAULT_TENANT_ID;
}

export async function loadOpenDealSignals(): Promise<{
  byContact: Map<string, OpenDealSignal>;
  byAccount: Map<string, OpenDealSignal>;
}> {
  const byContact = new Map<string, OpenDealSignal>();
  const byAccount = new Map<string, OpenDealSignal>();
  try {
    const rows = await db
      .select({
        id: deals.id,
        contactId: deals.contactId,
        accountId: deals.accountId,
        stage: deals.pipelineStage,
      })
      .from(deals)
      .where(eq(deals.tenantId, tenant()));
    for (const row of rows) {
      if (!OPEN_DEAL_STAGES.has((row.stage ?? "").toLowerCase())) continue;
      if (row.contactId) {
        const prev = byContact.get(row.contactId);
        byContact.set(row.contactId, {
          count: (prev?.count ?? 0) + 1,
          dealId: prev?.dealId ?? row.id,
        });
      }
      if (row.accountId) {
        const prev = byAccount.get(row.accountId);
        byAccount.set(row.accountId, {
          count: (prev?.count ?? 0) + 1,
          dealId: prev?.dealId ?? row.id,
        });
      }
    }
  } catch {
    return { byContact, byAccount };
  }
  return { byContact, byAccount };
}

export async function loadBookHealthMap(input: {
  contactIds: string[];
  accountIds: string[];
}): Promise<Map<string, HealthChipView>> {
  try {
    return await loadPartyHealthMap(input);
  } catch {
    return new Map();
  }
}

function skipStatus(status: string | null | undefined): boolean {
  const raw = (status ?? "").toLowerCase();
  return raw.includes("skip") || raw.includes("decline") || raw === "no_market" || raw === "nomarket";
}

function limitedPosture(posture: string | null | undefined): boolean {
  const raw = (posture ?? "").toLowerCase();
  return raw === "selective" || raw === "restricted" || raw === "closed_new_biz";
}

export async function loadCarrierMarketSignals(
  carriers: Array<{ id: string; name: string; lastContactedAt?: Date | string | null }>,
  extras: Array<{
    id: string;
    lastQuoteAt: Date | null;
    lastIssuedAt: Date | null;
    activePolicyCount: number;
  }>,
): Promise<Map<string, CarrierMarketSignal>> {
  const extraById = new Map(extras.map((row) => [row.id, row]));
  const out = new Map<string, CarrierMarketSignal>();
  const empty = (id: string): CarrierMarketSignal => {
    const extra = extraById.get(id);
    const lastUseAt = extra?.lastQuoteAt ?? extra?.lastIssuedAt ?? null;
    return {
      rateable: null,
      skipDecline: false,
      skipWhy: null,
      limited: false,
      appetiteLines: [],
      dontWrite: [],
      lastUseAt,
      lastUseKind: extra?.lastQuoteAt ? "quote" : extra?.lastIssuedAt ? "issued" : null,
      declineCount: 0,
      skipCount: 0,
      activePolicies: extra?.activePolicyCount ?? 0,
    };
  };

  for (const carrier of carriers) out.set(carrier.id, empty(carrier.id));

  try {
    const [catalog, decisions, attempts] = await Promise.all([
      db
        .select({
          slug: carrierAppetite.carrierId,
          linkedCarrierId: carrierAppetite.linkedCarrierId,
          rateable: carrierAppetite.rateable,
          linesOffered: carrierAppetite.linesOffered,
          linesNotOffered: carrierAppetite.linesNotOffered,
          hardDeclines: carrierAppetite.hardDeclines,
          softCautions: carrierAppetite.softCautions,
          catPosture: carrierAppetite.catPosture,
        })
        .from(carrierAppetite)
        .where(eq(carrierAppetite.tenantId, tenant()))
        .catch(() => []),
      db
        .select({
          slug: appetiteQuoteDecisions.carrierId,
          status: appetiteQuoteDecisions.status,
          matchingRule: appetiteQuoteDecisions.matchingRule,
          createdAt: appetiteQuoteDecisions.createdAt,
        })
        .from(appetiteQuoteDecisions)
        .where(eq(appetiteQuoteDecisions.tenantId, tenant()))
        .catch(() => []),
      db
        .select({
          carrierId: quoteAttemptLogs.carrierId,
          result: quoteAttemptLogs.result,
          count: sql<number>`count(*)::int`,
        })
        .from(quoteAttemptLogs)
        .where(eq(quoteAttemptLogs.tenantId, tenant()))
        .groupBy(quoteAttemptLogs.carrierId, quoteAttemptLogs.result)
        .catch(() => []),
    ]);

    const slugToUuid = new Map<string, string>();
    for (const row of catalog) {
      if (row.linkedCarrierId) slugToUuid.set(row.slug, row.linkedCarrierId);
    }
    for (const carrier of carriers) {
      const slug = slugFromCarrierName(carrier.name);
      if (slug && !slugToUuid.has(slug)) slugToUuid.set(slug, carrier.id);
    }

    for (const row of catalog) {
      const deskId = row.linkedCarrierId || slugToUuid.get(row.slug);
      if (!deskId || !out.has(deskId)) continue;
      const current = out.get(deskId)!;
      const dontWrite = [...(row.linesNotOffered ?? []), ...(row.hardDeclines ?? [])].filter(Boolean);
      out.set(deskId, {
        ...current,
        rateable: row.rateable,
        limited: limitedPosture(row.catPosture) || (row.softCautions ?? []).length > 0,
        appetiteLines: row.linesOffered ?? [],
        dontWrite,
        skipDecline: current.skipDecline || row.rateable === false || dontWrite.length > 2,
        skipWhy: current.skipWhy || (row.rateable === false ? "Not rateable" : dontWrite[0] ?? null),
      });
    }

    const latestSkip = new Map<string, { why: string | null; at: number }>();
    for (const row of decisions) {
      if (!skipStatus(row.status)) continue;
      const deskId = slugToUuid.get(row.slug);
      if (!deskId) continue;
      const at = row.createdAt ? new Date(row.createdAt).getTime() : 0;
      const prev = latestSkip.get(deskId);
      if (!prev || at >= prev.at) {
        latestSkip.set(deskId, { why: row.matchingRule || row.status, at });
      }
      const current = out.get(deskId);
      if (current) {
        out.set(deskId, {
          ...current,
          skipDecline: true,
          skipCount: current.skipCount + 1,
          skipWhy: current.skipWhy || row.matchingRule || "Skip-Decline",
        });
      }
    }

    for (const row of attempts) {
      const current = out.get(row.carrierId);
      if (!current) continue;
      const result = String(row.result ?? "").toLowerCase();
      const n = Number(row.count ?? 0);
      if (result.includes("decline")) {
        out.set(row.carrierId, {
          ...current,
          declineCount: current.declineCount + n,
          skipDecline: current.skipDecline || n > 0,
          skipWhy: current.skipWhy || "Recent declines",
        });
      } else if (skipStatus(result)) {
        out.set(row.carrierId, {
          ...current,
          skipCount: current.skipCount + n,
          skipDecline: true,
          skipWhy: current.skipWhy || "Skip / no market",
        });
      }
    }

    for (const [id, skip] of latestSkip) {
      const current = out.get(id);
      if (!current) continue;
      out.set(id, { ...current, skipDecline: true, skipWhy: skip.why || current.skipWhy });
    }
  } catch {
    return out;
  }

  return out;
}

export async function loadPolicyNeedSignals(): Promise<Map<string, PolicyNeedSignal>> {
  const out = new Map<string, PolicyNeedSignal>();
  const bump = (id: string, patch: Partial<PolicyNeedSignal>) => {
    const prev = out.get(id) ?? { openClaims: 0, pendingEndorsements: 0, missingDocs: 0 };
    out.set(id, { ...prev, ...patch });
  };
  try {
    const [claimRows, draftRows] = await Promise.all([
      db
        .select({
          policyId: claims.policyId,
          status: claims.status,
        })
        .from(claims)
        .where(eq(claims.tenantId, tenant()))
        .catch(() => []),
      db
        .select({
          policyId: endorsementDrafts.policyId,
          status: endorsementDrafts.status,
        })
        .from(endorsementDrafts)
        .where(eq(endorsementDrafts.tenantId, tenant()))
        .catch(() => []),
    ]);
    for (const row of claimRows) {
      if (!row.policyId) continue;
      const status = (row.status ?? "").toLowerCase();
      if (status === "closed" || status === "denied" || status === "withdrawn") continue;
      const prev = out.get(row.policyId) ?? { openClaims: 0, pendingEndorsements: 0, missingDocs: 0 };
      bump(row.policyId, { openClaims: prev.openClaims + 1 });
    }
    for (const row of draftRows) {
      const status = (row.status ?? "").toLowerCase();
      if (status === "withdrawn" || status === "filed" || status === "issued") continue;
      const prev = out.get(row.policyId) ?? { openClaims: 0, pendingEndorsements: 0, missingDocs: 0 };
      bump(row.policyId, { pendingEndorsements: prev.pendingEndorsements + 1 });
    }
  } catch {
    return out;
  }
  return out;
}

/** Proposed term premium keyed by policy. Empty when the renewal term is not on file. */
export async function loadRenewalPremiums(policyIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const ids = [...new Set(policyIds.filter(Boolean))];
  if (ids.length === 0) return out;
  try {
    const terms = await db
      .select({ policyId: policyTerms.policyId, premium: policyTerms.premium })
      .from(policyTerms)
      .where(
        and(
          eq(policyTerms.tenantId, tenant()),
          eq(policyTerms.role, "proposed"),
          inArray(policyTerms.policyId, ids),
        ),
      );
    for (const term of terms) {
      if (term.premium) out.set(term.policyId, term.premium);
    }
  } catch {
    return out;
  }
  return out;
}

export type CarrierLobUsageRow = {
  carrierId: string;
  carrierName: string;
  lineOfBusiness: string;
  policies: number;
  premium: number;
};

/** In-force premium and policy counts by carrier and line. Life/Health filtering stays in the glance. */
export async function loadCarrierLobUsage(): Promise<CarrierLobUsageRow[]> {
  try {
    const rows = await db
      .select({
        carrierId: policies.carrierId,
        carrierName: carriers.name,
        lineOfBusiness: policies.lineOfBusiness,
        policies: sql<number>`count(*)::int`,
        premium: sql<string>`coalesce(sum(${policies.premium}::numeric), 0)`,
      })
      .from(policies)
      .innerJoin(carriers, eq(policies.carrierId, carriers.id))
      .where(
        and(
          eq(policies.tenantId, tenant()),
          sql`${policies.carrierId} is not null`,
          sql`lower(${policies.status}) in ('active', 'bound', 'in_force', 'in-force')`,
        ),
      )
      .groupBy(policies.carrierId, carriers.name, policies.lineOfBusiness);
    return rows.flatMap((row) => {
      if (!row.carrierId) return [];
      const premium = Number(row.premium ?? 0);
      return [
        {
          carrierId: row.carrierId,
          carrierName: row.carrierName,
          lineOfBusiness: row.lineOfBusiness,
          policies: Number(row.policies ?? 0),
          premium: Number.isFinite(premium) ? premium : 0,
        },
      ];
    });
  } catch {
    return [];
  }
}
