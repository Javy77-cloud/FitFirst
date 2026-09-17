import { and, eq, gte, inArray, lt, or, sql } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { deals, quotes } from "@/lib/db/schema";
import { addUtcDays, deskNow, startOfUtcMonth } from "@/lib/home/as-of";
import { buildMotivationStats, type MotivationStat } from "./motivation";

const SHOPPED_STAGES = ["quoting", "quoted", "bound", "closed_won"] as const;

export async function loadDealMotivationStats(asOf = deskNow()): Promise<MotivationStat[]> {
  const todayStart = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate()));
  const monthStart = startOfUtcMonth(asOf);

  const [todayRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(quotes)
    .where(and(eq(quotes.tenantId, DEFAULT_TENANT_ID), gte(quotes.createdAt, todayStart)));

  const [shoppedRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(deals)
    .where(
      and(
        eq(deals.tenantId, DEFAULT_TENANT_ID),
        or(
          and(gte(deals.updatedAt, monthStart), inArray(deals.pipelineStage, [...SHOPPED_STAGES])),
          gte(deals.boundAt, monthStart),
        ),
      ),
    );

  const [boundRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(deals)
    .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), gte(deals.boundAt, monthStart)));

  const sparkQuotes: number[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const day = addUtcDays(todayStart, -i);
    const next = addUtcDays(day, 1);
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(quotes)
      .where(
        and(
          eq(quotes.tenantId, DEFAULT_TENANT_ID),
          gte(quotes.createdAt, day),
          lt(quotes.createdAt, next),
        ),
      );
    sparkQuotes.push(Number(row?.count ?? 0));
  }

  return buildMotivationStats({
    quotesToday: Number(todayRow?.count ?? 0),
    boundThisMonth: Number(boundRow?.count ?? 0),
    shoppedThisMonth: Number(shoppedRow?.count ?? 0),
    sparkQuotes,
  });
}
