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
    if (stages.length === 0) {
      for (const [sortOrder, stage] of seed.stages.entries()) {
        await db
          .insert(pipelineStages)
          .values({
            tenantId,
            pipelineId: current.id,
            name: stage.name,
            slug: stage.slug,
            sortOrder,
            color: defaultStageColor(sortOrder, stage.slug),
            seeded: seed.seeded,
          })
          .onConflictDoNothing();
      }
      continue;
    }
    // Live desk: keep admin labels, colors, order, and added stages. Do not
    // rewrite names/sortOrder on every /deals load — that made Edit stages
    // look broken (rename/add never stuck).
    for (const existingStage of stages) {
      if (existingStage.color) continue;
      const seedIndex = seed.stages.findIndex((row) => row.slug === existingStage.slug);
      await db
        .update(pipelineStages)
        .set({
          color: defaultStageColor(
            seedIndex >= 0 ? seedIndex : existingStage.sortOrder,
            existingStage.slug,
          ),
        })
        .where(eq(pipelineStages.id, existingStage.id));
    }
  }

  await remapRetiredShoppingStages(tenantId);
  await splitArchiveOffWonLost(tenantId);
  await reassignFloodBoardDealsToPc(tenantId);
  await ensureRenewalsPipeline();
}

const RETIRED_SHOPPING_SLUGS = new Set([
  "gather",
  "quotes",
  "review",
  "pending_inspection",
]);

const RETIRED_DEAL_SLUGS: Record<string, string> = {
  gather: "gathering",
  gather_info: "gathering",
  shopping: "gathering",
  quotes: "markets",
  meet_quotes: "markets",
  quoting: "markets",
  review: "quote_review",
  comparing: "quote_review",
  pending_inspection: "bound",
};

/** Align live desks to the locked stage list without a Neon migration. */
async function remapRetiredShoppingStages(tenantId: string) {
  for (const [from, to] of Object.entries(RETIRED_DEAL_SLUGS)) {
    await db
      .update(deals)
      .set({
        pipelineStageSlug: to,
        pipelineStage: to === "closed_lost" ? "lost" : to,
        updatedAt: new Date(),
      })
      .where(and(eq(deals.tenantId, tenantId), eq(deals.pipelineStageSlug, from)));
    await db
      .update(deals)
      .set({
        pipelineStage: to === "closed_lost" ? "lost" : to,
        pipelineStageSlug: to,
        updatedAt: new Date(),
      })
      .where(and(eq(deals.tenantId, tenantId), eq(deals.pipelineStage, from)));
  }

  const boards = await db.select().from(pipelines).where(eq(pipelines.tenantId, tenantId));
  for (const board of boards) {
    if (board.kind !== "shopping" || !board.seeded) continue;
    const seed = SEEDED_PIPELINES.find((row) => row.slug === board.slug);
    if (!seed) continue;
    const keep = new Set(seed.stages.map((stage) => stage.slug));
    const stages = await db
      .select()
      .from(pipelineStages)
      .where(and(eq(pipelineStages.tenantId, tenantId), eq(pipelineStages.pipelineId, board.id)));
    for (const stage of stages) {
      if (stage.seeded && RETIRED_SHOPPING_SLUGS.has(stage.slug) && !keep.has(stage.slug)) {
        await db.delete(pipelineStages).where(eq(pipelineStages.id, stage.id));
      }
    }
  }
}

/** Flood shops belong on the P&C board so they share the PC stage picklist. */
async function reassignFloodBoardDealsToPc(tenantId: string) {
  const [flood] = await db
    .select()
    .from(pipelines)
    .where(and(eq(pipelines.tenantId, tenantId), eq(pipelines.slug, "flood")));
  const [pc] = await db
    .select()
    .from(pipelines)
    .where(and(eq(pipelines.tenantId, tenantId), eq(pipelines.slug, "p-c")));
  if (!flood || !pc) return;
  await db
    .update(deals)
    .set({ pipelineId: pc.id, updatedAt: new Date() })
    .where(and(eq(deals.tenantId, tenantId), eq(deals.pipelineId, flood.id)));
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
