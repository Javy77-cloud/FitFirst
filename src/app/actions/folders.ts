"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID, type FolderKind } from "@/lib/domain";
import { db } from "@/lib/db";
import { documentFolders } from "@/lib/db/schema";
import { canMoveFolder, libraryHref, libraryKind, parseLibrary } from "@/lib/documents/library";
import { folderHref, isFolderKind } from "@/lib/ops/documents";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function returnTo(form: FormData, folderId?: string | null) {
  const library = parseLibrary(str(form, "library") || str(form, "scope"));
  return libraryHref({ library, folderId: folderId || str(form, "folderId") || null });
}

export async function createFolder(formData: FormData) {
  const name = str(formData, "name") || "Untitled folder";
  const library = parseLibrary(str(formData, "library") || str(formData, "scope"));
  const kindRaw = str(formData, "kind") || libraryKind(library);
  const kind: FolderKind = isFolderKind(kindRaw) ? kindRaw : libraryKind(library);
  const parentId = str(formData, "parentId") || null;
  const [row] = await db
    .insert(documentFolders)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      name,
      kind,
      library,
      description: str(formData, "description") || null,
      parentId,
      contactId: str(formData, "contactId") || null,
      dealId: str(formData, "dealId") || null,
      policyId: str(formData, "policyId") || null,
    })
    .returning();
  revalidatePath("/documents");
  redirect(folderHref({ folderId: row.id, library, scope: str(formData, "scope") || undefined }));
}

export async function renameFolder(formData: FormData) {
  const folderId = str(formData, "folderId");
  const name = str(formData, "name");
  if (!folderId || !name) {
    redirect(returnTo(formData, folderId) + (folderId ? "" : "&notice=need-name"));
  }
  await db
    .update(documentFolders)
    .set({ name, updatedAt: new Date() })
    .where(and(eq(documentFolders.tenantId, DEFAULT_TENANT_ID), eq(documentFolders.id, folderId)));
  revalidatePath("/documents");
  redirect(returnTo(formData, folderId));
}

export async function moveFolder(formData: FormData) {
  const folderId = str(formData, "folderId");
  const parentRaw = str(formData, "parentId");
  const newParentId = parentRaw || null;
  const library = parseLibrary(str(formData, "library"));
  const rows = await db
    .select({
      id: documentFolders.id,
      name: documentFolders.name,
      parentId: documentFolders.parentId,
      library: documentFolders.library,
    })
    .from(documentFolders)
    .where(eq(documentFolders.tenantId, DEFAULT_TENANT_ID));
  const check = canMoveFolder(rows, folderId, newParentId);
  if (!check.ok) {
    redirect(libraryHref({ library, folderId, notice: "bad-move" }));
  }
  await db
    .update(documentFolders)
    .set({ parentId: newParentId, updatedAt: new Date() })
    .where(and(eq(documentFolders.tenantId, DEFAULT_TENANT_ID), eq(documentFolders.id, folderId)));
  revalidatePath("/documents");
  redirect(libraryHref({ library, folderId }));
}
