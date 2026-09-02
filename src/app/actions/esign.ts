"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID, type EsignProvider } from "@/lib/domain";
import { db } from "@/lib/db";
import { documents, signatureEnvelopes } from "@/lib/db/schema";
import { sendEnvelope } from "@/lib/integrations/esign";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function sendDocumentForSignature(formData: FormData) {
  const documentId = str(formData, "documentId");
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.id, documentId)));
  if (!doc) throw new Error("Document not found");

  const provider = (str(formData, "provider") || "docusign") as EsignProvider;
  const result = sendEnvelope(provider, {
    documentId,
    signerEmail: str(formData, "signerEmail") || null,
  });

  const [envelope] = await db
    .insert(signatureEnvelopes)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      documentId,
      provider,
      status: "sent",
      signerName: str(formData, "signerName") || null,
      signerEmail: str(formData, "signerEmail") || null,
      subject: str(formData, "subject") || `Please sign ${doc.filename}`,
      lastProviderResult: result.status,
      sentAt: new Date(),
    })
    .returning();

  const returnTo = str(formData, "returnTo") || "/esign";
  revalidatePath("/esign");
  revalidatePath("/documents");
  if (doc.dealId) revalidatePath(`/deals/${doc.dealId}`);
  redirect(`${returnTo}?notice=esign-not-implemented&envelope=${envelope.id}`);
}

export async function markEnvelopeSigned(formData: FormData) {
  const id = str(formData, "id");
  await db
    .update(signatureEnvelopes)
    .set({
      status: "signed",
      signedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(signatureEnvelopes.tenantId, DEFAULT_TENANT_ID), eq(signatureEnvelopes.id, id)));
  revalidatePath("/esign");
  redirect("/esign?notice=marked-signed");
}
