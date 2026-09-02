import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";

export const uploadRoot = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

export async function persistDealFile(input: {
  id?: string;
  dealId: string;
  riskId: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
  docType: string;
}) {
  const id = input.id ?? randomUUID();
  const storagePath = path.join(DEFAULT_TENANT_ID, input.dealId, `${id}-${input.filename}`);
  const abs = path.join(uploadRoot, storagePath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, input.buffer);

  const [doc] = await db
    .insert(documents)
    .values({
      id,
      tenantId: DEFAULT_TENANT_ID,
      riskId: input.riskId,
      dealId: input.dealId,
      filename: input.filename,
      mimeType: input.mimeType,
      storagePath,
      docType: input.docType,
      status: "uploaded",
    })
    .onConflictDoUpdate({
      target: documents.id,
      set: {
        filename: input.filename,
        mimeType: input.mimeType,
        storagePath,
        docType: input.docType,
        status: "uploaded",
      },
    })
    .returning();
  return doc;
}
