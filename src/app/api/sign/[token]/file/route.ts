import { getInDeskEnvelopeByToken } from "@/lib/db/queries";
import { getDeskDocument, loadDocumentBytes } from "@/lib/files/serve-document";
import { contentDisposition } from "@/lib/files/urls";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const row = await getInDeskEnvelopeByToken(decodeURIComponent(token));
  if (!row) return new Response("Not found", { status: 404 });

  const doc = await getDeskDocument(row.document.id);
  if (!doc) return new Response("Not found", { status: 404 });

  const download = new URL(request.url).searchParams.get("download") === "1";
  const file = await loadDocumentBytes(doc);
  return new Response(file.bytes as unknown as BodyInit, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": contentDisposition(file.filename, download),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
