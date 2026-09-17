import { and, eq, sql } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { developerApiMeterSettings, developerApiUsage } from "@/lib/db/schema";
import {
  buildUsageTiles,
  currentUsageMonth,
  envMonthlyLimit,
  isDeveloperApiProvider,
  type DeveloperApiProvider,
  type UsageTile,
} from "./usage";

export async function incrementDeveloperApiUsage(
  provider: DeveloperApiProvider,
  now = new Date(),
): Promise<void> {
  if (!isDeveloperApiProvider(provider)) return;
  const month = currentUsageMonth(now);
  await db
    .insert(developerApiUsage)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      provider,
      month,
      callCount: 1,
    })
    .onConflictDoUpdate({
      target: [developerApiUsage.tenantId, developerApiUsage.provider, developerApiUsage.month],
      set: {
        callCount: sql`${developerApiUsage.callCount} + 1`,
        updatedAt: new Date(),
      },
    });
}

export async function loadDeveloperUsageTiles(now = new Date()): Promise<UsageTile[]> {
  const month = currentUsageMonth(now);
  const [usageRows, limitRows] = await Promise.all([
    db
      .select({
        provider: developerApiUsage.provider,
        callCount: developerApiUsage.callCount,
      })
      .from(developerApiUsage)
      .where(and(eq(developerApiUsage.tenantId, DEFAULT_TENANT_ID), eq(developerApiUsage.month, month))),
    db
      .select({
        provider: developerApiMeterSettings.provider,
        monthlyLimit: developerApiMeterSettings.monthlyLimit,
      })
      .from(developerApiMeterSettings)
      .where(eq(developerApiMeterSettings.tenantId, DEFAULT_TENANT_ID)),
  ]);

  const counts: Record<string, number> = {};
  for (const row of usageRows) {
    counts[row.provider] = row.callCount;
  }

  const limits: Record<string, number | null> = {};
  for (const row of limitRows) {
    if (row.monthlyLimit != null && row.monthlyLimit > 0) {
      limits[row.provider] = row.monthlyLimit;
    }
  }
  for (const provider of Object.keys({ ...counts, ...limits })) {
    if (limits[provider] == null) {
      const fromEnv = envMonthlyLimit(provider);
      if (fromEnv != null) limits[provider] = fromEnv;
    }
  }

  return buildUsageTiles({ month, counts, limits });
}
