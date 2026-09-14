import { and, eq, gte, isNotNull, lt, or, sql } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { addUtcDays, DESK_AS_OF, startOfUtcMonth } from "@/lib/home/as-of";
import { buildLeadMotivationStats, type LeadMotivationStat } from "./motivation";

export async function loadLeadMotivationStats(asOf = DESK_AS_OF): Promise<LeadMotivationStat[]> {
  const todayStart = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate()));
  const monthStart = startOfUtcMonth(asOf);

  const [todayRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(leads)
    .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), gte(leads.createdAt, todayStart)));

  const [createdRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(leads)
    .where(and(eq(leads.tenantId, DEFAULT_TENANT_ID), gte(leads.createdAt, monthStart)));

  const [convertedRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(leads)
    .where(
      and(
        eq(leads.tenantId, DEFAULT_TENANT_ID),
        gte(leads.updatedAt, monthStart),
        or(eq(leads.status, "converted"), isNotNull(leads.convertedDealId)),
      ),
    );

  const sparkLeads: number[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const day = addUtcDays(todayStart, -i);
    const next = addUtcDays(day, 1);
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(
        and(eq(leads.tenantId, DEFAULT_TENANT_ID), gte(leads.createdAt, day), lt(leads.createdAt, next)),
      );
    sparkLeads.push(Number(row?.count ?? 0));
  }

  return buildLeadMotivationStats({
    leadsToday: Number(todayRow?.count ?? 0),
    convertedThisMonth: Number(convertedRow?.count ?? 0),
    createdThisMonth: Number(createdRow?.count ?? 0),
    sparkLeads,
  });
}
