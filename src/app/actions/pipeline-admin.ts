"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { deals, pipelineStages, pipelines } from "@/lib/db/schema";
import { currentDeskSession } from "@/lib/auth/session";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40) || "stage";
}

async function assertAdmin() {
  const session = await currentDeskSession();
  if (!session.isAdmin) throw new Error("Admin only.");
  return session;
}

export async function createPipelineDeal(formData: FormData) {
  const title = str(formData, "title");
  const pipelineSlug = str(formData, "pipelineSlug") || "p-c";
  const stageSlug = str(formData, "stageSlug") || "gather";
  if (!title) return;
  const [pipeline] = await db
    .select()
    .from(pipelines)
    .where(and(eq(pipelines.tenantId, DEFAULT_TENANT_ID), eq(pipelines.slug, pipelineSlug)));
  await db.insert(deals).values({
    tenantId: DEFAULT_TENANT_ID,
    title,
    lineOfBusiness: str(formData, "lineOfBusiness") || "HO",
    pipelineStage: stageSlug === "closed_won" ? "bound" : stageSlug === "quote_sent" ? "quote_sent" : "shopping",
    pipelineStageSlug: stageSlug,
    pipelineId: pipeline?.id,
    state: "FL",
  });
  revalidatePath("/pipeline");
  redirect(`/pipeline?pipeline=${encodeURIComponent(pipelineSlug)}`);
}

export async function addPipelineStage(formData: FormData) {
  await assertAdmin();
  const pipelineId = str(formData, "pipelineId");
  const name = str(formData, "name");
  if (!pipelineId || !name) return;
  const [{ n }] = await db
    .select({ n: sql<number>`coalesce(max(${pipelineStages.sortOrder}), -1) + 1` })
    .from(pipelineStages)
    .where(eq(pipelineStages.pipelineId, pipelineId));
  await db.insert(pipelineStages).values({
    tenantId: DEFAULT_TENANT_ID,
    pipelineId,
    name,
    slug: str(formData, "slug") || slugify(name),
    sortOrder: Number(n ?? 0),
  });
  revalidatePath("/pipeline");
}

export async function relabelPipelineStage(formData: FormData) {
  await assertAdmin();
  const id = str(formData, "stageId");
  const name = str(formData, "name");
  if (!id || !name) return;
  await db
    .update(pipelineStages)
    .set({ name })
    .where(and(eq(pipelineStages.tenantId, DEFAULT_TENANT_ID), eq(pipelineStages.id, id)));
  revalidatePath("/pipeline");
}

export async function deletePipelineStage(formData: FormData) {
  await assertAdmin();
  const id = str(formData, "stageId");
  if (!id) return;
  await db
    .delete(pipelineStages)
    .where(and(eq(pipelineStages.tenantId, DEFAULT_TENANT_ID), eq(pipelineStages.id, id)));
  revalidatePath("/pipeline");
}

export async function saveCommissionRate(formData: FormData) {
  await assertAdmin();
  const { commissionRateSettings } = await import("@/lib/db/schema");
  const lineFamily = str(formData, "lineFamily");
  if (!lineFamily) return;
  const [existing] = await db
    .select()
    .from(commissionRateSettings)
    .where(
      and(
        eq(commissionRateSettings.tenantId, DEFAULT_TENANT_ID),
        eq(commissionRateSettings.lineFamily, lineFamily),
      ),
    );
  const patch = {
    ratePct: str(formData, "ratePct") || null,
    perPersonMonth: str(formData, "perPersonMonth") || null,
    medicareNew: str(formData, "medicareNew") || null,
    medicareRenewal: str(formData, "medicareRenewal") || null,
    notes: str(formData, "notes") || "Desk-configurable. Not an official carrier or CMS rate.",
    updatedAt: new Date(),
  };
  if (existing) {
    await db.update(commissionRateSettings).set(patch).where(eq(commissionRateSettings.id, existing.id));
  } else {
    await db.insert(commissionRateSettings).values({
      tenantId: DEFAULT_TENANT_ID,
      lineFamily,
      ...patch,
    });
  }
  revalidatePath("/settings");
  revalidatePath("/policies");
}

export async function updateCarrierContact(formData: FormData) {
  await assertAdmin();
  const { carriers } = await import("@/lib/db/schema");
  const id = str(formData, "carrierId");
  if (!id) return;
  const written = str(formData, "writtenLines")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  await db
    .update(carriers)
    .set({
      naic: str(formData, "naic") || null,
      portalUrl: str(formData, "portalUrl") || null,
      portalLogin: str(formData, "portalLogin") || null,
      customerServicePhone: str(formData, "customerServicePhone") || null,
      agentPhone: str(formData, "agentPhone") || null,
      website: str(formData, "website") || null,
      agentPortalUrl: str(formData, "agentPortalUrl") || null,
      carrierInfo: str(formData, "carrierInfo") || null,
      amBestRating: str(formData, "amBestRating") || null,
      underwriterName: str(formData, "underwriterName") || null,
      underwriterEmail: str(formData, "underwriterEmail") || null,
      underwriterPhone: str(formData, "underwriterPhone") || null,
      accountManagerName: str(formData, "accountManagerName") || null,
      accountManagerEmail: str(formData, "accountManagerEmail") || null,
      accountManagerPhone: str(formData, "accountManagerPhone") || null,
      claimsPhone: str(formData, "claimsPhone") || null,
      billingPhone: str(formData, "billingPhone") || null,
      newBusinessCommPct: str(formData, "newBusinessCommPct") || null,
      renewalCommPct: str(formData, "renewalCommPct") || null,
      territory: str(formData, "territory") || null,
      preferredSubmission: str(formData, "preferredSubmission") || null,
      bindingAuthority: str(formData, "bindingAuthority") || null,
      appetiteNotes: str(formData, "appetiteNotes") || null,
      dontWriteNotes: str(formData, "dontWriteNotes") || null,
      writtenLines: written.length ? written : undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(carriers.tenantId, DEFAULT_TENANT_ID), eq(carriers.id, id)));
  revalidatePath("/carriers");
  revalidatePath(`/carriers/${id}`);
}
