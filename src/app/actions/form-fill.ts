"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { persistFile } from "@/app/actions/documents";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { documents, formFills, formTemplates } from "@/lib/db/schema";
import { fillHref } from "@/lib/documents/library";
import { applyScanToForm, defaultFieldMap, mergeFillValues, suggestScanFields } from "@/lib/documents/scan";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

async function loadTemplate(slug: string) {
  const [template] = await db
    .select()
    .from(formTemplates)
    .where(and(eq(formTemplates.tenantId, DEFAULT_TENANT_ID), eq(formTemplates.slug, slug)));
  return template ?? null;
}

export async function saveFormFill(formData: FormData) {
  const slug = str(formData, "slug");
  const template = await loadTemplate(slug);
  if (!template) redirect("/documents?library=forms&notice=missing-form");

  const values: Record<string, string> = {};
  for (const field of template.fields) {
    values[field.key] = str(formData, `value_${field.key}`);
  }

  const fillId = str(formData, "fillId");
  if (fillId) {
    await db
      .update(formFills)
      .set({ values, updatedAt: new Date(), status: "draft" })
      .where(and(eq(formFills.tenantId, DEFAULT_TENANT_ID), eq(formFills.id, fillId)));
  } else {
    const [row] = await db
      .insert(formFills)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        formTemplateId: template.id,
        folderId: template.folderId,
        values,
        sourceText: str(formData, "sourceText") || null,
      })
      .returning();
    revalidatePath("/documents");
    redirect(fillHref(slug, { folderId: template.folderId, library: "forms" }) + `&fillId=${row.id}`);
  }
  revalidatePath("/documents");
  redirect(fillHref(slug, { folderId: template.folderId, library: "forms" }) + (fillId ? `&fillId=${fillId}` : ""));
}

export async function scanSuggestForm(formData: FormData) {
  const slug = str(formData, "slug");
  const template = await loadTemplate(slug);
  if (!template) redirect("/documents?library=forms&notice=missing-form");

  const sourceText = str(formData, "sourceText");
  let sourceFilename: string | null = null;
  let sourceDocumentId: string | null = str(formData, "sourceDocumentId") || null;
  const file = formData.get("sourceFile");
  if (file instanceof File && file.size > 0) {
    const doc = await persistFile({
      folderId: template.folderId,
      library: "forms",
      fillable: false,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      buffer: Buffer.from(await file.arrayBuffer()),
      docType: "other",
      slot: "library_file",
      tags: ["scan-source"],
    });
    sourceFilename = doc.filename;
    sourceDocumentId = doc.id;
  } else if (sourceDocumentId) {
    const [doc] = await db.select().from(documents).where(eq(documents.id, sourceDocumentId));
    sourceFilename = doc?.filename ?? null;
  }

  const suggested = suggestScanFields({ pasted: sourceText, filename: sourceFilename });
  const mapped = applyScanToForm(template.fields, suggested, defaultFieldMap(template.fields));
  const fillId = str(formData, "fillId");
  if (fillId) {
    const [current] = await db
      .select()
      .from(formFills)
      .where(and(eq(formFills.tenantId, DEFAULT_TENANT_ID), eq(formFills.id, fillId)));
    await db
      .update(formFills)
      .set({
        values: mergeFillValues(current?.values ?? {}, mapped),
        sourceText: sourceText || current?.sourceText || null,
        sourceDocumentId: sourceDocumentId || current?.sourceDocumentId || null,
        status: "suggested",
        updatedAt: new Date(),
      })
      .where(eq(formFills.id, fillId));
    revalidatePath("/documents");
    redirect(fillHref(slug) + `?fillId=${fillId}&notice=scan-suggested`);
  }

  const [row] = await db
    .insert(formFills)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      formTemplateId: template.id,
      folderId: template.folderId,
      sourceDocumentId,
      values: mapped,
      sourceText: sourceText || null,
      status: "suggested",
    })
    .returning();
  revalidatePath("/documents");
  redirect(fillHref(slug) + `?fillId=${row.id}&notice=scan-suggested`);
}
