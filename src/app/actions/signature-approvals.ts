"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireAdminAction, requireSignedInAction } from "@/lib/auth/guards";
import { flashAction } from "@/lib/flash-action";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { emailSignatures } from "@/lib/db/schema";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function refreshSignatures() {
  revalidatePath("/automations");
  revalidatePath("/automations/signatures");
  revalidatePath("/settings/email-signatures");
}

export async function saveSignatureDraft(formData: FormData) {
  const session = await requireSignedInAction();
  const id = str(formData, "id");
  const submit = str(formData, "intent") === "submit";
  const values = {
    name: str(formData, "name") || `${session.name} signature`,
    bodyEn: str(formData, "bodyEn") || "",
    bodyEs: str(formData, "bodyEs") || "",
    isDefault: false,
    isExampleCopy: str(formData, "isExampleCopy") === "true",
    ownerUserId: session.isAdmin && str(formData, "agency") === "true" ? null : session.userId,
    approvalStatus: submit ? "pending" : "draft",
    submittedAt: submit ? new Date() : null,
    updatedAt: new Date(),
  };

  if (id) {
    const [existing] = await db
      .select()
      .from(emailSignatures)
      .where(and(eq(emailSignatures.tenantId, DEFAULT_TENANT_ID), eq(emailSignatures.id, id)));
    if (!existing) {
      redirect("/automations/signatures?error=Signature%20not%20found.");
    }
    if (!session.isAdmin && existing.ownerUserId !== session.userId) {
      redirect("/automations/signatures?error=You%20can%20only%20edit%20your%20own%20draft.");
    }
    if (!session.isAdmin && existing.approvalStatus === "live") {
      redirect("/automations/signatures?error=Live%20signatures%20need%20a%20new%20draft.");
    }
    await db
      .update(emailSignatures)
      .set({
        ...values,
        reviewedBy: submit ? null : existing.reviewedBy,
        reviewedAt: submit ? null : existing.reviewedAt,
        reviewNote: submit ? null : existing.reviewNote,
      })
      .where(eq(emailSignatures.id, id));
  } else {
    await db.insert(emailSignatures).values({
      tenantId: DEFAULT_TENANT_ID,
      ...values,
    });
  }

  refreshSignatures();
  flashAction("/automations/signatures", submit ? "signature-saved" : "draft-saved");
}

export async function approveSignatureDraft(formData: FormData) {
  const session = await requireAdminAction("Only Admin can approve a live signature.");
  const id = str(formData, "id");
  await db
    .update(emailSignatures)
    .set({
      approvalStatus: "live",
      reviewedBy: session.userId,
      reviewedAt: new Date(),
      reviewNote: str(formData, "reviewNote") || "Approved",
      updatedAt: new Date(),
    })
    .where(and(eq(emailSignatures.tenantId, DEFAULT_TENANT_ID), eq(emailSignatures.id, id)));
  refreshSignatures();
  redirect("/automations/signatures?notice=signature-approved");
}

export async function rejectSignatureDraft(formData: FormData) {
  const session = await requireAdminAction("Only Admin can reject a signature.");
  const id = str(formData, "id");
  await db
    .update(emailSignatures)
    .set({
      approvalStatus: "rejected",
      reviewedBy: session.userId,
      reviewedAt: new Date(),
      reviewNote: str(formData, "reviewNote") || "Needs another pass",
      updatedAt: new Date(),
    })
    .where(and(eq(emailSignatures.tenantId, DEFAULT_TENANT_ID), eq(emailSignatures.id, id)));
  refreshSignatures();
  redirect("/automations/signatures?notice=signature-rejected");
}
