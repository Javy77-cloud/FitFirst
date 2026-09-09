import { and, asc, desc, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  appetiteEdgeCases,
  appetiteEngineRules,
  appetitePartitions,
  appetiteShadowPredictions,
} from "@/lib/db/schema";
import { ensurePartition } from "./partitions";

function tenant() {
  return DEFAULT_TENANT_ID;
}

export async function loadAppetiteEngineDashboard(tenantId = tenant()) {
  await ensurePartition("FL", "HO", tenantId);

  const partitions = await db
    .select()
    .from(appetitePartitions)
    .where(eq(appetitePartitions.tenantId, tenantId))
    .orderBy(asc(appetitePartitions.state), asc(appetitePartitions.line));

  const rules = await db
    .select()
    .from(appetiteEngineRules)
    .where(eq(appetiteEngineRules.tenantId, tenantId))
    .orderBy(asc(appetiteEngineRules.layer), asc(appetiteEngineRules.field));

  const edgeCases = await db
    .select()
    .from(appetiteEdgeCases)
    .where(
      and(
        eq(appetiteEdgeCases.tenantId, tenantId),
        eq(appetiteEdgeCases.status, "open"),
      ),
    )
    .orderBy(desc(appetiteEdgeCases.createdAt))
    .limit(50);

  const recentPredictions = await db
    .select()
    .from(appetiteShadowPredictions)
    .where(eq(appetiteShadowPredictions.tenantId, tenantId))
    .orderBy(desc(appetiteShadowPredictions.createdAt))
    .limit(20);

  return { partitions, rules, edgeCases, recentPredictions };
}

export async function findFlHoPartitionId(tenantId = tenant()) {
  const partition = await ensurePartition("FL", "HO", tenantId);
  return partition.id;
}
