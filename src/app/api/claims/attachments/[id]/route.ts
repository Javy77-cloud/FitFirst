import { readFile } from "node:fs/promises";
import path from "node:path";
import { getClaimAttachment } from "@/lib/db/queries";

const uploadRoot = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const file = await getClaimAttachment(id);
  if (!file) {
    return new Response("Not found", { status: 404 });
  }
  const abs = path.join(uploadRoot, file.storagePath);
  try {
    const buffer = await readFile(abs);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${file.filename.replaceAll('"', "")}"`,
      },
    });
  } catch {
    return new Response("File missing", { status: 404 });
  }
}
