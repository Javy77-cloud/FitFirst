import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  appetiteEngineRules,
  appetitePartitions,
  type AppetitePartition,
} from "@/lib/db/schema";
import { FL_HO_STANDING_SEED } from "./seed-fl-ho";

function tenant() {
  return DEFAULT_TENANT_ID;
}

/** Ensure a state×line partition exists (shadow by default). Seeds FL/HO Standing if empty. */
export async function ensurePartition(
  state: string,
  line: string,
  tenantId = tenant(),
): Promise<AppetitePartition> {
  const stateNorm = state.trim().toUpperCase() || "FL";
  const lineNorm = line.trim().toUpperCase() || "HO";

  const [existing] = await db
    .select()
    .from(appetitePartitions)
    .where(
      and(
        eq(appetitePartitions.tenantId, tenantId),
        eq(appetitePartitions.state, stateNorm),
        eq(appetitePartitions.line, lineNorm),
      ),
    )
    .limit(1);

  if (existing) {
    await seedStandingIfEmpty(existing.id, stateNorm, lineNorm, tenantId);
    return existing;
  }

  const [created] = await db
    .insert(appetitePartitions)
    .values({
      tenantId,
      state: stateNorm,
      line: lineNorm,
      status: "shadow",
    })
    .returning();

  await seedStandingIfEmpty(created.id, stateNorm, lineNorm, tenantId);
  return created;
}

async function seedStandingIfEmpty(
  partitionId: string,
  state: string,
  line: string,
  tenantId: string,
) {
  if (state !== "FL" || line !== "HO") return;

  const existing = await db
    .select({ id: appetiteEngineRules.id })
    .from(appetiteEngineRules)
    .where(
      and(
        eq(appetiteEngineRules.tenantId, tenantId),
        eq(appetiteEngineRules.partitionId, partitionId),
        eq(appetiteEngineRules.layer, "standing"),
        eq(appetiteEngineRules.source, "seed"),
      ),
    )
    .limit(1);

  if (existing.length > 0) return;

  await db.insert(appetiteEngineRules).values(
    FL_HO_STANDING_SEED.map((rule) => ({
      tenantId,
      partitionId,
      layer: "standing" as const,
      field: rule.field,
      operator: rule.operator,
      threshold: rule.threshold,
      disposition: String(rule.disposition),
      reasonCode: rule.reasonCode,
      carrierId: rule.carrierId ?? null,
      confidenceCount: 0,
      live: true,
      source: "seed" as const,
      stale: false,
    })),
  );
}

export async function listPartitions(tenantId = tenant()) {
  return db
    .select()
    .from(appetitePartitions)
    .where(eq(appetitePartitions.tenantId, tenantId));
}
