import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { PIPELINE_IDS_BY_SLUG } from "@/lib/fixtures/ids";
import { db } from "@/lib/db";
import { deals, pipelineStages, pipelines } from "@/lib/db/schema";
import { defaultStageColor } from "@/lib/desk/status-colors";
import { SEEDED_PIPELINES } from "./pipeline";
import { RENEWAL_QUEUE_STAGE_LABELS, RENEWAL_QUEUE_STAGES } from "@/lib/domain-ams";

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
      for (const [sortOrder, stage] of seed.stages.entries()) {
        await db
          .insert(pipelineStages)
          .values({
            tenantId,
            pipelineId: id,
            name: stage.name,
            slug: stage.slug,
            sortOrder,
            color: defaultStageColor(sortOrder, stage.slug),
            seeded: seed.seeded,
          })
          .onConflictDoUpdate({
            target: [pipelineStages.tenantId, pipelineStages.pipelineId, pipelineStages.slug],
            set: {
              name: stage.name,
              sortOrder,
              color: defaultStageColor(sortOrder, stage.slug),
              seeded: seed.seeded,
            },
          });
      }
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
      const color = defaultStageColor(sortOrder, stage.slug);
      if (!existingStage) {
        await db
          .insert(pipelineStages)
          .values({
            tenantId,
            pipelineId: current.id,
            name: stage.name,
            slug: stage.slug,
            sortOrder,
            color,
            seeded: seed.seeded,
          })
          .onConflictDoUpdate({
            target: [pipelineStages.tenantId, pipelineStages.pipelineId, pipelineStages.slug],
            set: {
              name: stage.name,
              sortOrder,
              color,
              seeded: seed.seeded,
            },
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
            ...(colorEmpty ? { color } : {}),
          })
          .where(eq(pipelineStages.id, existingStage.id));
      }
    }
  }

  await splitArchiveOffWonLost(tenantId);
  await ensureRenewalsPipeline();
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


const RENEWALS_STAGE_COLORS: Record<string, string> = {
  upcoming: "slate",
  contacted: "blue",
  quoted: "amber",
  bound: "green",
  lost: "red",
};

/** Seeded renewals board — not a deals switcher tab. Inserts missing row/stages only (keeps admin edits). */
export async function ensureRenewalsPipeline() {
  const tenantId = DEFAULT_TENANT_ID;
  const id = PIPELINE_IDS_BY_SLUG.renewals;
  const [existing] = await db
    .select()
    .from(pipelines)
    .where(and(eq(pipelines.tenantId, tenantId), eq(pipelines.slug, "renewals")));
  const pipelineId = existing?.id ?? id;
  if (!existing) {
    await db.insert(pipelines).values({
      id,
      tenantId,
      name: "Renewals",
      slug: "renewals",
      kind: "shopping",
      seeded: true,
      sortOrder: 90,
    });
  }
  const stages = await db
    .select()
    .from(pipelineStages)
    .where(and(eq(pipelineStages.tenantId, tenantId), eq(pipelineStages.pipelineId, pipelineId)))
    .then((rows) => rows);
  const have = new Set(stages.map((row) => row.slug));
  for (const [sortOrder, slug] of RENEWAL_QUEUE_STAGES.entries()) {
    if (have.has(slug)) continue;
    await db
      .insert(pipelineStages)
      .values({
        tenantId,
        pipelineId,
        name: RENEWAL_QUEUE_STAGE_LABELS[slug],
        slug,
        sortOrder,
        color: RENEWALS_STAGE_COLORS[slug] ?? defaultStageColor(sortOrder, slug),
        seeded: true,
      })
      .onConflictDoNothing();
  }
  return getRenewalsPipeline();
}

export async function getRenewalsPipeline() {
  const tenantId = DEFAULT_TENANT_ID;
  const [board] = await db
    .select()
    .from(pipelines)
    .where(and(eq(pipelines.tenantId, tenantId), eq(pipelines.slug, "renewals")));
  if (!board) return null;
  const stages = await db
    .select()
    .from(pipelineStages)
    .where(and(eq(pipelineStages.tenantId, tenantId), eq(pipelineStages.pipelineId, board.id)));
  stages.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  return {
    id: board.id,
    slug: board.slug,
    name: board.name,
    kind: board.kind,
    seeded: board.seeded,
    stages: stages.map((item) => ({
      id: item.id,
      slug: item.slug,
      name: item.name,
      sortOrder: item.sortOrder,
      color: item.color,
      seeded: item.seeded,
    })),
  };
}
