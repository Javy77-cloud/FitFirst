"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { persistFile } from "@/app/actions/documents";
import { requireSignedInAction } from "@/lib/auth/guards";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { documents, formFills, formTemplates, signatureEnvelopes } from "@/lib/db/schema";
import { fillHref } from "@/lib/documents/library";
import { IN_DESK_ESIGN_MODE, mintInDeskToken } from "@/lib/esign/in-desk";
import { attemptDocuSignEnvelope } from "@/lib/integrations/docusign-envelopes";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function confirmFilledFormForEsign(formData: FormData) {
  await requireSignedInAction();
  const slug = str(formData, "slug");
  const [template] = await db
    .select()
    .from(formTemplates)
    .where(and(eq(formTemplates.tenantId, DEFAULT_TENANT_ID), eq(formTemplates.slug, slug)));
  if (!template) redirect("/documents?library=forms&notice=missing-form");
  if (str(formData, "confirmed") !== "true") {
    redirect(`${fillHref(slug)}?notice=esign-need-confirm`);
  }

  const values: Record<string, string> = {};
  for (const field of template.fields) {
    values[field.key] = str(formData, `value_${field.key}`);
  }

  let fillId = str(formData, "fillId");
  if (fillId) {
    await db
      .update(formFills)
      .set({ values, status: "confirmed", updatedAt: new Date() })
      .where(and(eq(formFills.tenantId, DEFAULT_TENANT_ID), eq(formFills.id, fillId)));
  } else {
    const [row] = await db
      .insert(formFills)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        formTemplateId: template.id,
        folderId: template.folderId,
        values,
        status: "confirmed",
      })
      .returning();
    fillId = row.id;
  }

  let documentId = str(formData, "sourceDocumentId");
  if (documentId) {
    const [existing] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.id, documentId)));
    if (!existing) documentId = "";
  }

  if (!documentId) {
    const lines = [
      `FitFirst filled form · ${template.name}`,
      `Slug: ${template.slug}`,
      "",
      ...template.fields.map((field) => `${field.label}: ${values[field.key] || ""}`),
    ];
    const packet = await persistFile({
      folderId: template.folderId,
      library: "forms",
      fillable: true,
      formTemplateId: template.id,
      filename: `${template.slug}-filled.txt`,
      mimeType: "text/plain",
      buffer: Buffer.from(lines.join("\n"), "utf8"),
      docType: template.family === "acord" ? "acord" : "agency_form",
      slot: "library_file",
      tags: ["esign-fill"],
    });
    documentId = packet.id;
  }

  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.id, documentId)));
  if (!doc) redirect(`${fillHref(slug)}?fillId=${fillId}&notice=esign-need-packet`);

  const signerName = str(formData, "signerName") || "Signer";
  const signerEmail = str(formData, "signerEmail");
  const send = await attemptDocuSignEnvelope({
    filename: doc.filename,
    mimeType: doc.mimeType,
    storagePath: doc.storagePath,
    signerName,
    signerEmail,
    subject: `Please sign ${template.name}`,
  });

  const [envelope] = await db
    .insert(signatureEnvelopes)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      documentId: doc.id,
      provider: send.status === "sent" ? "docusign" : "in_desk",
      mode: send.status === "sent" ? "vendor" : IN_DESK_ESIGN_MODE,
      status: "sent",
      signerName,
      signerEmail,
      subject: `Please sign ${template.name}`,
      lastProviderResult: send.envelopeId ? `${send.status}:${send.envelopeId}` : send.status,
      publicToken: send.status === "sent" ? null : mintInDeskToken(),
      sentAt: new Date(),
    })
    .returning();

  revalidatePath("/documents");
  revalidatePath("/esign");
  const notice =
    send.status === "sent" ? "esign-fill-sent" : send.status === "sandbox_error" ? "esign-fill-error" : "esign-fill-stub";
  redirect(`${fillHref(slug)}?fillId=${fillId}&notice=${notice}&envelope=${envelope.id}`);
}
