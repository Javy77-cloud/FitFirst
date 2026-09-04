import { eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { carriers, policies, quoteAttemptLogs, quotes } from "@/lib/db/schema";
import { buildHitLostReport, type HitLostReport } from "@/lib/reporting/hit-lost";

export async function loadHitLostReport(): Promise<HitLostReport> {
  const [attemptRows, quoteRows, policyRows] = await Promise.all([
    db
      .select({
        id: quoteAttemptLogs.id,
        dealId: quoteAttemptLogs.dealId,
        carrierId: quoteAttemptLogs.carrierId,
        carrierName: carriers.name,
        result: quoteAttemptLogs.result,
        bindable: quoteAttemptLogs.bindable,
        premium: quoteAttemptLogs.premium,
        lostReason: quoteAttemptLogs.lostReason,
      })
      .from(quoteAttemptLogs)
      .innerJoin(carriers, eq(quoteAttemptLogs.carrierId, carriers.id))
      .where(eq(quoteAttemptLogs.tenantId, DEFAULT_TENANT_ID)),
    db
      .select({
        id: quotes.id,
        dealId: quotes.dealId,
        carrierId: quotes.carrierId,
        carrierName: carriers.name,
        premium: quotes.premium,
        lostReason: quotes.lostReason,
      })
      .from(quotes)
      .innerJoin(carriers, eq(quotes.carrierId, carriers.id))
      .where(eq(quotes.tenantId, DEFAULT_TENANT_ID)),
    db
      .select({
        dealId: policies.dealId,
        carrierId: policies.carrierId,
        carrierName: carriers.name,
      })
      .from(policies)
      .leftJoin(carriers, eq(policies.carrierId, carriers.id))
      .where(eq(policies.tenantId, DEFAULT_TENANT_ID)),
  ]);

  return buildHitLostReport({
    attempts: attemptRows.map((row) => ({
      ...row,
      premium: row.premium == null || row.premium === "" ? null : Number(row.premium),
    })),
    quotes: quoteRows.map((row) => ({
      ...row,
      premium: row.premium == null || row.premium === "" ? null : Number(row.premium),
    })),
    policies: policyRows,
  });
}
