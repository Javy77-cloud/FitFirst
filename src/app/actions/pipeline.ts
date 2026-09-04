"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { deals, pipelines } from "@/lib/db/schema";
import {
  archiveCancelsEmailJobs,
  dealStageForPipeline,
  isArchiveStage,
} from "@/lib/wire/pipeline";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

async function pipelineBySlug(slug: string) {
  const [pipeline] = await db
    .select()
    .from(pipelines)
    .where(and(eq(pipelines.tenantId, DEFAULT_TENANT_ID), eq(pipelines.slug, slug)));
  return pipeline ?? null;
}

export async function moveDealToStage(input: {
  dealId: string;
  pipelineSlug: string;
  stageSlug: string;
}) {
  const { dealId, pipelineSlug, stageSlug } = input;
  if (!dealId || !stageSlug) return;
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) return;

  const target = await pipelineBySlug(pipelineSlug);
  const archiveBoard = await pipelineBySlug("archive");
  const now = new Date();

  const patch: {
    pipelineId?: string | null;
    pipelineStageSlug: string;
    pipelineStage: string;
    archivedAt?: Date | null;
    updatedAt: Date;
  } = {
    pipelineStageSlug: stageSlug,
    pipelineStage: dealStageForPipeline(stageSlug),
    updatedAt: now,
  };

  if (isArchiveStage(stageSlug) || pipelineSlug === "archive") {
    patch.pipelineId = archiveBoard?.id ?? target?.id ?? deal.pipelineId;
    patch.archivedAt = deal.archivedAt ?? now;
    patch.pipelineStage = "archive";
    patch.pipelineStageSlug = "archive";
    void archiveCancelsEmailJobs();
  } else if (pipelineSlug === "won-lost") {
    patch.archivedAt = null;
  } else if (target) {
    patch.pipelineId = target.id;
    patch.archivedAt = null;
  }

  await db.update(deals).set(patch).where(eq(deals.id, dealId));
  revalidatePath("/pipeline");
  revalidatePath(`/deals/${dealId}`);
}

export async function moveDealOnBoard(formData: FormData) {
  await moveDealToStage({
    dealId: str(formData, "dealId"),
    pipelineSlug: str(formData, "pipelineSlug"),
    stageSlug: str(formData, "stageSlug"),
  });
}

export async function archiveWonDeal(formData: FormData) {
  formData.set("pipelineSlug", "archive");
  formData.set("stageSlug", "archive");
  await moveDealOnBoard(formData);
  redirect("/pipeline?pipeline=archive");
}
