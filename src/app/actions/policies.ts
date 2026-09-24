"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentDeskSession } from "@/lib/auth/session";
import { attachToPolicy, filePolicyChange, removePolicyAttachment } from "@/lib/policy/service";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function checkbox(form: FormData, key: string) {
  const value = form.get(key);
  return value === "on" || value === "true" || value === "1";
}

async function optionalUpload(form: FormData) {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return null;
  return {
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    buffer: Buffer.from(await file.arrayBuffer()),
  };
}

function bounce(policyId: string, filed: string, error?: string): never {
  const params = new URLSearchParams();
  if (error) params.set("error", error);
  else params.set("filed", filed);
  redirect(`/policies/${policyId}?${params.toString()}`);
}

function refreshBook(policyId: string, contactId?: string | null) {
  revalidatePath(`/policies/${policyId}`);
  revalidatePath("/policies");
  revalidatePath("/contacts");
  revalidatePath("/");
  if (contactId) revalidatePath(`/contacts/${contactId}`);
}

async function fileChange(
  formData: FormData,
  kind: "endorsement" | "cancellation" | "non_renewal",
) {
  const policyId = str(formData, "policyId");
  const result = await filePolicyChange({
    policyId,
    kind,
    effectiveDate: str(formData, "effectiveDate"),
    reason: str(formData, "reason"),
    summary: str(formData, "summary") || undefined,
    coverageA: str(formData, "coverageA") || undefined,
    premium: str(formData, "premium") || undefined,
    attachDeskCopy: checkbox(formData, "attachDeskCopy"),
    file: await optionalUpload(formData),
  });
  refreshBook(policyId, result.ok ? result.contactId : null);
  if (!result.ok) bounce(policyId, kind, result.error);
  bounce(policyId, kind);
}

export async function fileEndorsement(formData: FormData) {
  await fileChange(formData, "endorsement");
}

export async function fileCancellation(formData: FormData) {
  await fileChange(formData, "cancellation");
}

export async function fileNonRenewal(formData: FormData) {
  await fileChange(formData, "non_renewal");
}

export async function uploadPolicyAttachment(formData: FormData) {
  const policyId = str(formData, "policyId");
  const file = await optionalUpload(formData);
  if (!file) bounce(policyId, "attach", "Choose a file to attach to this Policy.");
  await attachToPolicy({
    policyId,
    filename: file.filename,
    mimeType: file.mimeType,
    buffer: file.buffer,
    docType: str(formData, "docType") || "other",
  });
  revalidatePath(`/policies/${policyId}`);
  bounce(policyId, "attach");
}

export async function deletePolicyFilingAttachment(formData: FormData) {
  const policyId = str(formData, "policyId");
  const attachmentId = str(formData, "attachmentId");
  if (!attachmentId) return;
  const session = await currentDeskSession();
  await removePolicyAttachment(attachmentId, { userId: session.userId, name: session.name });
  revalidatePath(`/policies/${policyId}`);
}
