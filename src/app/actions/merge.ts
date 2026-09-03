"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { mergeCandidates } from "@/lib/db/schema";
import { executeMerge } from "@/lib/merge/execute";
import { MergeLockError } from "@/lib/merge/lock";
import { refreshMergeCandidates } from "@/lib/merge/scan";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function scanForDuplicates() {
  await refreshMergeCandidates();
  revalidatePath("/merge");
}

export async function dismissMergeCandidate(formData: FormData) {
  const id = str(formData, "candidateId");
  await db
    .update(mergeCandidates)
    .set({ status: "dismissed", updatedAt: new Date() })
    .where(and(eq(mergeCandidates.tenantId, DEFAULT_TENANT_ID), eq(mergeCandidates.id, id)));
  revalidatePath("/merge");
  redirect("/merge");
}

export async function mergeDuplicatePair(formData: FormData) {
  const candidateId = str(formData, "candidateId");
  const entityType = str(formData, "entityType") === "lead" ? "lead" : "contact";
  const leftId = str(formData, "leftId");
  const rightId = str(formData, "rightId");
  const keeperId = str(formData, "keeperId") || leftId;
  const duplicateId = keeperId === leftId ? rightId : leftId;

  try {
    await executeMerge({ entityType, keeperId, duplicateId, candidateId });
  } catch (error) {
    if (error instanceof MergeLockError) {
      throw error;
    }
    throw error;
  }

  revalidatePath("/merge");
  revalidatePath("/contacts");
  revalidatePath("/leads");
  revalidatePath("/deals");
  revalidatePath("/policies");
  revalidatePath("/");
  redirect(`/merge/${candidateId}`);
}
