import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { PIPELINE_IDS_BY_SLUG } from "@/lib/fixtures/ids";
import { db } from "@/lib/db";
import { deals, pipelineStages, pipelines } from "@/lib/db/schema";
import { defaultStageColor } from "@/lib/desk/status-colors";
import { SEEDED_PIPELINES } from "./pipeline";

/** Insert missing boards / stages and split Archive off Won-Lost on existing desks. */
export async function ensureSeededPipelines() {
  const tenantId = DEFAULT_TENANT_ID;
  const existing = await db.select().from(pipelines).where(eq(pipelines.tenantId, tenantId));
  const bySlug = new Map(existing.map((row) => [row.slug, row]));

  for (const [index, seed] of SEEDED_PIPELINES.entries()) {
    const id = PIPELINE_IDS_BY_SLUG[seed.slug];
    const current = bySlug.get(seed.slug);
    if (!current) {
      await db.insert(pipelines).values({
        id,
        tenantId,
        name: seed.name,
        slug: seed.slug,
        kind: seed.kind,
        seeded: seed.seeded,
        sortOrder: index,
      });
      await db.insert(pipelineStages).values(
        seed.stages.map((stage, sortOrder) => ({
          tenantId,
          pipelineId: id,
          name: stage.name,
          slug: stage.slug,
          sortOrder,
          color: defaultStageColor(sortOrder, stage.slug),
          seeded: seed.seeded,
        })),
      );
      continue;
    }

    if (
      current.name !== seed.name ||
      current.kind !== seed.kind ||
      current.seeded !== seed.seeded ||
      current.sortOrder !== index
    ) {
      await db
        .update(pipelines)
        .set({
          name: seed.name,
          kind: seed.kind,
          seeded: seed.seeded,
          sortOrder: index,
          updatedAt: new Date(),
        })
        .where(eq(pipelines.id, current.id));
    }

    const stages = await db
      .select()
      .from(pipelineStages)
      .where(and(eq(pipelineStages.tenantId, tenantId), eq(pipelineStages.pipelineId, current.id)));
    const stagesBySlug = new Map(stages.map((stage) => [stage.slug, stage]));
    for (const [sortOrder, stage] of seed.stages.entries()) {
      const existingStage = stagesBySlug.get(stage.slug);
      if (!existingStage) {
        await db.insert(pipelineStages).values({
          tenantId,
          pipelineId: current.id,
          name: stage.name,
          slug: stage.slug,
          sortOrder,
          color: defaultStageColor(sortOrder, stage.slug),
          seeded: seed.seeded,
        });
        continue;
      }
      // Live desk: re-align name/sortOrder (and color if empty) so new seed stages
      // land in order and Closed Won shifts right without a wipe.
      const colorEmpty = !existingStage.color;
      if (
        existingStage.name !== stage.name ||
        existingStage.sortOrder !== sortOrder ||
        colorEmpty
      ) {
        await db
          .update(pipelineStages)
          .set({
            name: stage.name,
            sortOrder,
            ...(colorEmpty ? { color: defaultStageColor(sortOrder, stage.slug) } : {}),
          })
          .where(eq(pipelineStages.id, existingStage.id));
      }
    }
  }

  await splitArchiveOffWonLost(tenantId);
}

async function splitArchiveOffWonLost(tenantId: string) {
  const [wonLost] = await db
    .select()
    .from(pipelines)
    .where(and(eq(pipelines.tenantId, tenantId), eq(pipelines.slug, "won-lost")));
  const [archive] = await db
    .select()
    .from(pipelines)
    .where(and(eq(pipelines.tenantId, tenantId), eq(pipelines.slug, "archive")));
  if (!wonLost || !archive) return;

  const wonLostStages = await db
    .select()
    .from(pipelineStages)
    .where(and(eq(pipelineStages.tenantId, tenantId), eq(pipelineStages.pipelineId, wonLost.id)));
  const leftoverArchive = wonLostStages.filter((stage) => stage.slug === "archive");
  if (leftoverArchive.length === 0) return;

  const archiveStages = await db
    .select()
    .from(pipelineStages)
    .where(and(eq(pipelineStages.tenantId, tenantId), eq(pipelineStages.pipelineId, archive.id)));
  const archiveStage = archiveStages.find((stage) => stage.slug === "archive");

  await db
    .update(deals)
    .set({
      pipelineId: archive.id,
      pipelineStage: "archive",
      pipelineStageSlug: "archive",
      updatedAt: new Date(),
    })
    .where(and(eq(deals.tenantId, tenantId), eq(deals.pipelineId, wonLost.id), eq(deals.pipelineStageSlug, "archive")));

  for (const stage of leftoverArchive) {
    if (archiveStage) {
      await db.delete(pipelineStages).where(eq(pipelineStages.id, stage.id));
    } else {
      await db.update(pipelineStages).set({ pipelineId: archive.id, sortOrder: 0 }).where(eq(pipelineStages.id, stage.id));
    }
  }
}
