"use server";

import { revalidatePath } from "next/cache";
import { replaceDocumentFile } from "@/lib/documents/version-store";
import { flashAction } from "@/lib/flash-action";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

/** Replace an uploaded file. Same document record + metadata; the prior copy stays as a version. */
export async function replaceDocument(formData: FormData) {
  const documentId = str(formData, "documentId");
  const dealId = str(formData, "dealId");
  const policyId = str(formData, "policyId");
  const leadId = str(formData, "leadId");
  const contactId = str(formData, "contactId");
  const returnTo = str(formData, "returnTo");
  const note = str(formData, "note");
  const file = formData.get("file");
  if (!documentId || !(file instanceof File) || file.size === 0) {
    throw new Error("Document could not be replaced.");
  }

  await replaceDocumentFile({
    documentId,
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    buffer: Buffer.from(await file.arrayBuffer()),
    note: note || "Replaced — prior copy kept",
  });

  if (dealId) revalidatePath(`/deals/${dealId}`);
  if (policyId) revalidatePath(`/policies/${policyId}`);
  if (leadId) revalidatePath(`/leads/${leadId}`);
  if (contactId) revalidatePath(`/contacts/${contactId}`);
  if (returnTo) revalidatePath(returnTo);
  revalidatePath("/documents");
  revalidatePath(`/files/${documentId}`);
  const dest =
    returnTo ||
    (dealId
      ? `/deals/${dealId}?tab=documents`
      : policyId
        ? `/policies/${policyId}`
        : leadId
          ? `/leads/${leadId}`
          : contactId
            ? `/contacts/${contactId}`
            : "/documents");
  flashAction(dest, "document-replaced");
}
