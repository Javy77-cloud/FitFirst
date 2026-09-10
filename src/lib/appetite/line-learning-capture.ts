import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  quoteSheets,
  risks,
  type FloodFeatureSnapshot,
  type GlFeatureSnapshot,
  type WcFeatureSnapshot,
} from "@/lib/db/schema";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import {
  buildFloodFeatureSnapshot,
  buildGlFeatureSnapshot,
  buildWcFeatureSnapshot,
  isFloodLearningLine,
  isGlLearningLine,
  isWcLearningLine,
} from "@/lib/appetite/line-learning-stubs";

export type LineLearningSnapFields = {
  floodFeatureSnapshot?: FloodFeatureSnapshot;
  wcFeatureSnapshot?: WcFeatureSnapshot;
  glFeatureSnapshot?: GlFeatureSnapshot;
};

/** Attach Flood/WC/GL stub snapshots when LOB matches (no-op otherwise). */
export async function lineLearningSnapshotFieldsForDeal(
  dealId: string,
  lineOfBusiness: string | null | undefined,
): Promise<LineLearningSnapFields> {
  const out: LineLearningSnapFields = {};
  const wantFlood = isFloodLearningLine(lineOfBusiness);
  const wantWc = isWcLearningLine(lineOfBusiness);
  const wantGl = isGlLearningLine(lineOfBusiness);
  if (!wantFlood && !wantWc && !wantGl) return out;

  const [risk] = await db.select().from(risks).where(eq(risks.dealId, dealId)).limit(1);
  const sheets = await db
    .select()
    .from(quoteSheets)
    .where(and(eq(quoteSheets.tenantId, DEFAULT_TENANT_ID), eq(quoteSheets.dealId, dealId)));

  const pick = (...names: string[]) =>
    sheets.find((s) => names.includes(s.line.toLowerCase()) || names.includes(s.line.toUpperCase())) ??
    null;

  if (wantFlood) {
    const sheet = pick("flood");
    out.floodFeatureSnapshot = buildFloodFeatureSnapshot({
      sheetValues: sheet?.values ?? {},
      risk: risk ?? null,
    });
  }
  if (wantWc) {
    const sheet = pick("wc", "workers_comp");
    out.wcFeatureSnapshot = buildWcFeatureSnapshot({
      sheetValues: sheet?.values ?? {},
      risk: risk ?? null,
    });
  }
  if (wantGl) {
    const sheet = pick("gl", "cgl");
    out.glFeatureSnapshot = buildGlFeatureSnapshot({
      sheetValues: sheet?.values ?? {},
      risk: risk ?? null,
    });
  }
  return out;
}
