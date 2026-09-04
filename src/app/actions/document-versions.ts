"use server";

import { revalidatePath } from "next/cache";
import { replaceDocumentFile } from "@/lib/documents/version-store";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

/** Replace a Deal or Policy attachment. The prior file stays as a version. */
export async function replaceDocument(formData: FormData) {
  const documentId = str(formData, "documentId");
  const dealId = str(formData, "dealId");
  const policyId = str(formData, "policyId");
  const note = str(formData, "note");
  const file = formData.get("file");
  if (!documentId || !(file instanceof File) || file.size === 0) return;

  await replaceDocumentFile({
    documentId,
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    buffer: Buffer.from(await file.arrayBuffer()),
    note: note || "Replaced — prior copy kept",
  });

  if (dealId) revalidatePath(`/deals/${dealId}`);
  if (policyId) revalidatePath(`/policies/${policyId}`);
  revalidatePath("/documents");
  revalidatePath(`/files/${documentId}`);
}
