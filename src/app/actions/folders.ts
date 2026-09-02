"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DEFAULT_TENANT_ID, type FolderKind } from "@/lib/domain";
import { db } from "@/lib/db";
import { documentFolders } from "@/lib/db/schema";
import { folderHref, isFolderKind } from "@/lib/ops/documents";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function createFolder(formData: FormData) {
  const name = str(formData, "name") || "Untitled folder";
  const kindRaw = str(formData, "kind") || "custom";
  const kind: FolderKind = isFolderKind(kindRaw) ? kindRaw : "custom";
  const parentId = str(formData, "parentId") || null;
  const [row] = await db
    .insert(documentFolders)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      name,
      kind,
      description: str(formData, "description") || null,
      parentId,
      contactId: str(formData, "contactId") || null,
      dealId: str(formData, "dealId") || null,
      policyId: str(formData, "policyId") || null,
    })
    .returning();
  revalidatePath("/documents");
  redirect(folderHref({ folderId: row.id, scope: str(formData, "scope") || undefined }));
}
