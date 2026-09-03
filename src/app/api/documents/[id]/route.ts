import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";

const uploadRoot = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [doc] = await db.select().from(documents).where(eq(documents.id, id));
  if (!doc) return new Response("Not found", { status: 404 });
  const abs = path.join(uploadRoot, doc.storagePath);
  const buffer = await readFile(abs);
  return new Response(buffer, {
    headers: {
      "Content-Type": doc.mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${doc.filename.replaceAll('"', "")}"`,
    },
  });
}
