import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { appetiteShadowPredictions } from "@/lib/db/schema";
import type { AppetiteColor } from "./types";
import { resolveActualColor } from "./types";

function tenant() {
  return DEFAULT_TENANT_ID;
}

export type RecordShadowPredictionInput = {
  partitionId: string;
  dealId?: string | null;
  riskId?: string | null;
  carrierId: string;
  attemptId?: string | null;
  predicted: AppetiteColor;
  triggeringRuleId?: string | null;
  reasonCode?: string | null;
  tenantId?: string;
};

/** Insert a silent shadow prediction (call from quote-attempt write path or Gaya later). */
export async function recordShadowPrediction(input: RecordShadowPredictionInput) {
  const tenantId = input.tenantId ?? tenant();
  const [row] = await db
    .insert(appetiteShadowPredictions)
    .values({
      tenantId,
      partitionId: input.partitionId,
      dealId: input.dealId ?? null,
      riskId: input.riskId ?? null,
      carrierId: input.carrierId,
      attemptId: input.attemptId ?? null,
      predicted: input.predicted,
      triggeringRuleId: input.triggeringRuleId ?? null,
      reasonCode: input.reasonCode ?? null,
      scored: false,
    })
    .returning();
  return row;
}

/**
 * Writeback actual disposition for later scoring.
 * floor_only / forced Cov A stored as-is; scorePartition maps them to yellow (never green).
 */
export async function resolveShadowPrediction(
  attemptId: string,
  actual: string,
  tenantId = tenant(),
) {
  const color = resolveActualColor(actual);
  // Still store raw actual even when skip-class (so humans can see portal_closed etc.)
  const [row] = await db
    .update(appetiteShadowPredictions)
    .set({
      actualDisposition: actual,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(appetiteShadowPredictions.tenantId, tenantId),
        eq(appetiteShadowPredictions.attemptId, attemptId),
      ),
    )
    .returning();

  return { row: row ?? null, resolvedColor: color };
}

export async function resolveShadowPredictionById(
  predictionId: string,
  actual: string,
  tenantId = tenant(),
) {
  const color = resolveActualColor(actual);
  const [row] = await db
    .update(appetiteShadowPredictions)
    .set({
      actualDisposition: actual,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(appetiteShadowPredictions.tenantId, tenantId),
        eq(appetiteShadowPredictions.id, predictionId),
      ),
    )
    .returning();
  return { row: row ?? null, resolvedColor: color };
}
