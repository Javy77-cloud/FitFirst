import { resolvePortalToken } from "@/lib/portal/session";
import { getDeskDocument, loadDocumentBytes } from "@/lib/files/serve-document";
import { contentDisposition } from "@/lib/files/urls";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string; id: string }> },
) {
  const { token, id } = await params;
  const resolved = await resolvePortalToken(decodeURIComponent(token));
  if (!resolved.ok) return new Response("Unauthorized", { status: 401 });

  const allowed = resolved.session.policies.some((row) =>
    row.idCards.some((doc) => doc.id === id),
  );
  if (!allowed) return new Response("Not found", { status: 404 });

  const doc = await getDeskDocument(id);
  if (!doc) return new Response("Not found", { status: 404 });
  if (doc.slot !== "policy_file") return new Response("Not found", { status: 404 });

  const download = new URL(request.url).searchParams.get("download") === "1";
  const file = await loadDocumentBytes(doc);
  return new Response(file.bytes, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": contentDisposition(file.filename, download),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
