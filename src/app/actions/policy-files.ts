"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";

const uploadRoot = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

/** Multi-file attach on a Policy. Not part of Save policy. */
export async function attachPolicyFiles(formData: FormData) {
  const policyId = str(formData, "policyId");
  const dealId = str(formData, "dealId") || null;
  if (!policyId) return;

  const files = formData.getAll("file");
  const categories = formData.getAll("category").map((value) => String(value ?? "").trim() || "other");

  let index = 0;
  for (const file of files) {
    if (!(file instanceof File) || file.size === 0) {
      index += 1;
      continue;
    }
    const id = randomUUID();
    const storagePath = path.join(DEFAULT_TENANT_ID, "policies", policyId, `${id}-${file.name}`);
    const abs = path.join(uploadRoot, storagePath);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, Buffer.from(await file.arrayBuffer()));
    await db.insert(documents).values({
      id,
      tenantId: DEFAULT_TENANT_ID,
      dealId,
      policyId,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      storagePath,
      docType: categories[index] || "other",
      slot: "policy_file",
      status: "uploaded",
    });
    index += 1;
  }

  revalidatePath(`/policies/${policyId}`);
}
