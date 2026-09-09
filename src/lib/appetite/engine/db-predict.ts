import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { appetiteEngineRules } from "@/lib/db/schema";
import { ensurePartition } from "./partitions";
import { predictAppetite } from "./predict";
import type {
  AppetiteSheetSnapshot,
  CarrierAppetitePrediction,
  StandingRuleInput,
} from "./types";

/**
 * Server helper: ensure partition, load Standing rules, predict per carrier.
 * Silent — do not surface colors in Markets agent view yet.
 */
export async function predictAppetiteForSheet(input: {
  state: string;
  line: string;
  sheetSnapshot: AppetiteSheetSnapshot;
  carriers: string[];
  tenantId?: string;
}): Promise<{
  partitionId: string;
  predictions: CarrierAppetitePrediction[];
}> {
  const tenantId = input.tenantId ?? DEFAULT_TENANT_ID;
  const partition = await ensurePartition(input.state, input.line, tenantId);
  const rules = await db
    .select()
    .from(appetiteEngineRules)
    .where(
      and(
        eq(appetiteEngineRules.tenantId, tenantId),
        eq(appetiteEngineRules.partitionId, partition.id),
        eq(appetiteEngineRules.layer, "standing"),
      ),
    );

  const standing: StandingRuleInput[] = rules.map((r) => ({
    id: r.id,
    field: r.field,
    operator: r.operator,
    threshold: r.threshold,
    disposition: r.disposition,
    reasonCode: r.reasonCode,
    carrierId: r.carrierId,
    layer: r.layer,
    live: r.live,
    stale: r.stale,
  }));

  const predictions = predictAppetite({
    state: partition.state,
    line: partition.line,
    sheetSnapshot: { ...input.sheetSnapshot, state: partition.state, line: partition.line },
    carriers: input.carriers,
    rules: standing,
  });

  return { partitionId: partition.id, predictions };
}
