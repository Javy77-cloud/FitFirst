"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { deals, pipelines } from "@/lib/db/schema";
import { archiveCancelsEmailJobs, dealStageForPipeline } from "@/lib/wire/pipeline";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function moveDealOnBoard(formData: FormData) {
  const dealId = str(formData, "dealId");
  const pipelineSlug = str(formData, "pipelineSlug");
  const stageSlug = str(formData, "stageSlug");
  const [pipeline] = await db
    .select()
    .from(pipelines)
    .where(and(eq(pipelines.tenantId, DEFAULT_TENANT_ID), eq(pipelines.slug, pipelineSlug)));
  if (!pipeline) return;

  const patch: {
    pipelineId: string;
    pipelineStageSlug: string;
    pipelineStage: string;
    archivedAt?: Date | null;
    updatedAt: Date;
  } = {
    pipelineId: pipeline.id,
    pipelineStageSlug: stageSlug,
    pipelineStage: dealStageForPipeline(stageSlug),
    updatedAt: new Date(),
  };

  if (stageSlug === "archive") {
    patch.archivedAt = new Date();
    void archiveCancelsEmailJobs();
  }

  await db.update(deals).set(patch).where(eq(deals.id, dealId));
  revalidatePath("/pipeline");
  revalidatePath(`/deals/${dealId}`);
}

export async function archiveWonDeal(formData: FormData) {
  formData.set("pipelineSlug", "won-lost");
  formData.set("stageSlug", "archive");
  await moveDealOnBoard(formData);
  redirect("/pipeline?pipeline=won-lost");
}
