import { and, eq, inArray } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  appetitePartitions,
  appetiteShadowPredictions,
  type AppetitePartition,
} from "@/lib/db/schema";
import { computePartitionScore } from "./score";
import type { ScorePartitionResult } from "./score";

/**
 * Nightly-ready scorer — callable from Developer Hub "Run shadow accuracy".
 * Does NOT auto-cron. Compares predictions with actuals; graduates shadow→live
 * when scored>=min_sample && accuracy>=threshold.
 */
export async function scorePartition(
  partitionId: string,
  tenantId = DEFAULT_TENANT_ID,
): Promise<ScorePartitionResult & { partition: AppetitePartition | null }> {
  const [partition] = await db
    .select()
    .from(appetitePartitions)
    .where(
      and(
        eq(appetitePartitions.tenantId, tenantId),
        eq(appetitePartitions.id, partitionId),
      ),
    )
    .limit(1);

  if (!partition) {
    return {
      considered: 0,
      matched: 0,
      skipped: 0,
      accuracyPct: null,
      scoredShops: 0,
      graduated: false,
      status: "shadow",
      partition: null,
    };
  }

  const rows = await db
    .select()
    .from(appetiteShadowPredictions)
    .where(
      and(
        eq(appetiteShadowPredictions.tenantId, tenantId),
        eq(appetiteShadowPredictions.partitionId, partitionId),
        eq(appetiteShadowPredictions.scored, false),
      ),
    );

  const priorMatched =
    partition.accuracyPct != null && partition.scoredShops > 0
      ? Math.round(partition.accuracyPct * partition.scoredShops)
      : 0;

  const result = computePartitionScore(rows, {
    priorScoredShops: partition.scoredShops,
    priorMatched,
    minSample: partition.minSample,
    accuracyThreshold: partition.accuracyThreshold,
    status: (partition.status as "shadow" | "live" | "held") || "shadow",
  });

  const newlyScoredIds = rows
    .filter((r) => {
      if (r.scored) return false;
      const actual = r.actualDisposition?.trim().toLowerCase() ?? "";
      if (!actual) return false;
      // mark skip-class as scored too so we don't re-process forever? Tip: skip Incomplete…
      // We only mark rows that were "considered" (had resolvable actual color).
      return true;
    })
    .map((r) => r.id);

  // Mark considered + skip-with-actual as scored; leave blank actuals unscored.
  const toMark = rows.filter((r) => r.actualDisposition).map((r) => r.id);
  if (toMark.length > 0) {
    await db
      .update(appetiteShadowPredictions)
      .set({ scored: true, updatedAt: new Date() })
      .where(
        and(
          eq(appetiteShadowPredictions.tenantId, tenantId),
          inArray(appetiteShadowPredictions.id, toMark),
        ),
      );
  }

  const [updated] = await db
    .update(appetitePartitions)
    .set({
      accuracyPct: result.accuracyPct,
      scoredShops: result.scoredShops,
      status: result.status,
      graduatedAt: result.graduated ? new Date() : partition.graduatedAt,
      updatedAt: new Date(),
    })
    .where(eq(appetitePartitions.id, partitionId))
    .returning();

  void newlyScoredIds;
  return { ...result, partition: updated ?? partition };
}
