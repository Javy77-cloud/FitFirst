import { currentDeskSession } from "@/lib/auth/session";
import { parseSignedRowId } from "@/lib/esign/retrieval";
import { getSignedRetrievalRow } from "@/lib/esign/retrieval-store";
import { serveDeskDocument } from "@/lib/files/serve-document";
import { contentDisposition } from "@/lib/files/urls";
import { downloadDocuSignCombinedPdf } from "@/lib/integrations/docusign-envelopes";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await currentDeskSession();
  if (!session.signedIn) {
    return new Response("Unauthorized", { status: 401 });
  }
  const rawId = decodeURIComponent((await params).id);
  if (!parseSignedRowId(rawId)) {
    return new Response("Not found", { status: 404 });
  }
  const row = await getSignedRetrievalRow(rawId);
  if (!row) return new Response("Not found", { status: 404 });

  const download = new URL(request.url).searchParams.get("download") === "1";

  if (row.status === "completed" && row.providerEnvelopeId) {
    const signed = await downloadDocuSignCombinedPdf(row.providerEnvelopeId);
    if (signed.ok) {
      const filename = row.filename?.replace(/(\.pdf)?$/i, "-signed.pdf") || signed.filename;
      return new Response(Uint8Array.from(signed.bytes), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": contentDisposition(filename, download),
        },
      });
    }
    if (!row.documentId) {
      return new Response(signed.message, { status: 409 });
    }
  }

  if (row.documentId) {
    return serveDeskDocument(row.documentId, {
      download,
      actorId: session.userId,
      actorName: session.name,
    });
  }

  return new Response("Signed PDF is not available yet.", { status: 404 });
}
