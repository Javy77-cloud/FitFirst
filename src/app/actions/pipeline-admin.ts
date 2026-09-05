"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, eq, sql } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { deals, pipelineStages, pipelines } from "@/lib/db/schema";
import { currentDeskSession } from "@/lib/auth/session";
import { defaultStageColor } from "@/lib/desk/status-colors";
import { dealStageForPipeline } from "@/lib/wire/pipeline";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 40) || "stage"
  );
}

async function assertAdmin() {
  const session = await currentDeskSession();
  if (!session.isAdmin) throw new Error("Admin only.");
  return session;
}

export async function createPipelineDeal(formData: FormData) {
  const session = await currentDeskSession();
  if (!session.signedIn) throw new Error("Sign in to create a deal.");
  const title = str(formData, "title");
  const pipelineSlug = str(formData, "pipelineSlug") || "p-c";
  const stageSlug = str(formData, "stageSlug") || "gather";
  if (!title) return;
  const [pipeline] = await db
    .select()
    .from(pipelines)
    .where(and(eq(pipelines.tenantId, DEFAULT_TENANT_ID), eq(pipelines.slug, pipelineSlug)));
  const archived = stageSlug === "archive" || pipelineSlug === "archive";
  const lineOfBusiness =
    str(formData, "lineOfBusiness") ||
    (pipelineSlug === "life" ? "LIFE" : pipelineSlug === "health" ? "HEALTH" : "HO");
  await db.insert(deals).values({
    tenantId: DEFAULT_TENANT_ID,
    title,
    lineOfBusiness,
    policySubType: str(formData, "policySubType") || null,
    pipelineStage: dealStageForPipeline(stageSlug),
    pipelineStageSlug: stageSlug,
    pipelineId: pipeline?.id,
    archivedAt: archived ? new Date() : null,
    state: "FL",
    ownerId: session.userId,
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
  const existing = await db
    .select({ slug: pipelineStages.slug })
    .from(pipelineStages)
    .where(
      and(eq(pipelineStages.tenantId, DEFAULT_TENANT_ID), eq(pipelineStages.pipelineId, pipelineId)),
    );
  const taken = new Set(existing.map((row) => row.slug));
  let slug = str(formData, "slug") || slugify(name);
  if (taken.has(slug)) {
    let i = 2;
    while (taken.has(`${slug}_${i}`)) i += 1;
    slug = `${slug}_${i}`;
  }
  await db.insert(pipelineStages).values({
    tenantId: DEFAULT_TENANT_ID,
    pipelineId,
    name,
    slug,
    sortOrder: Number(n ?? 0),
    color: defaultStageColor(Number(n ?? 0), slug),
    seeded: false,
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
  const [stage] = await db
    .select()
    .from(pipelineStages)
    .where(and(eq(pipelineStages.tenantId, DEFAULT_TENANT_ID), eq(pipelineStages.id, id)));
  if (!stage) return;
  const siblings = await db
    .select()
    .from(pipelineStages)
    .where(
      and(
        eq(pipelineStages.tenantId, DEFAULT_TENANT_ID),
        eq(pipelineStages.pipelineId, stage.pipelineId),
      ),
    )
    .orderBy(asc(pipelineStages.sortOrder));
  if (siblings.length <= 1) return;
  const fallback = siblings.find((row) => row.id !== id);
  if (fallback) {
    await db
      .update(deals)
      .set({
        pipelineStageSlug: fallback.slug,
        pipelineStage: dealStageForPipeline(fallback.slug),
        updatedAt: new Date(),
      })
      .where(
        and(eq(deals.tenantId, DEFAULT_TENANT_ID), eq(deals.pipelineStageSlug, stage.slug)),
      );
  }
  await db
    .delete(pipelineStages)
    .where(and(eq(pipelineStages.tenantId, DEFAULT_TENANT_ID), eq(pipelineStages.id, id)));
  revalidatePath("/pipeline");
}

export async function reorderPipelineStage(formData: FormData) {
  await assertAdmin();
  const id = str(formData, "stageId");
  const direction = Number(str(formData, "direction") || "0");
  if (!id || (direction !== -1 && direction !== 1)) return;
  const [stage] = await db
    .select()
    .from(pipelineStages)
    .where(and(eq(pipelineStages.tenantId, DEFAULT_TENANT_ID), eq(pipelineStages.id, id)));
  if (!stage) return;
  const siblings = await db
    .select()
    .from(pipelineStages)
    .where(
      and(
        eq(pipelineStages.tenantId, DEFAULT_TENANT_ID),
        eq(pipelineStages.pipelineId, stage.pipelineId),
      ),
    )
    .orderBy(asc(pipelineStages.sortOrder));
  const index = siblings.findIndex((row) => row.id === id);
  const swap = siblings[index + direction];
  if (!swap) return;
  await db.update(pipelineStages).set({ sortOrder: swap.sortOrder }).where(eq(pipelineStages.id, stage.id));
  await db.update(pipelineStages).set({ sortOrder: stage.sortOrder }).where(eq(pipelineStages.id, swap.id));
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
  const [existing] = await db
    .select({
      portalUsernameEnc: carriers.portalUsernameEnc,
      portalUsernameIv: carriers.portalUsernameIv,
      portalUsernameHint: carriers.portalUsernameHint,
      portalPasswordEnc: carriers.portalPasswordEnc,
      portalPasswordIv: carriers.portalPasswordIv,
    })
    .from(carriers)
    .where(and(eq(carriers.tenantId, DEFAULT_TENANT_ID), eq(carriers.id, id)));
  const { replacePortalPassword, replacePortalUsername } = await import("@/lib/carriers/secrets");
  const { isMaskedSecretInput } = await import("@/lib/secrets/vault");
  const incomingUser = str(formData, "portalUsername");
  const incomingPass = str(formData, "portalPassword");
  const nextUser = replacePortalUsername(incomingUser, {
    portalUsernameEnc: existing?.portalUsernameEnc ?? null,
    portalUsernameIv: existing?.portalUsernameIv ?? null,
    portalUsernameHint: existing?.portalUsernameHint ?? null,
  });
  const nextPass = replacePortalPassword(incomingPass, {
    portalPasswordEnc: existing?.portalPasswordEnc ?? null,
    portalPasswordIv: existing?.portalPasswordIv ?? null,
  });
  const secretsTouched = !isMaskedSecretInput(incomingUser) || !isMaskedSecretInput(incomingPass);
  await db
    .update(carriers)
    .set({
      naic: str(formData, "naic") || null,
      portalUrl: str(formData, "portalUrl") || null,
      portalLogin: str(formData, "portalLogin") || null,
      agencyCode: str(formData, "agencyCode") || null,
      ...nextUser,
      ...nextPass,
      portalSecretsUpdatedAt: secretsTouched ? new Date() : undefined,
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
