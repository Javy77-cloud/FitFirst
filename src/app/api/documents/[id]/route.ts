import { currentDeskSession } from "@/lib/auth/session";
import { probeDeskDocument, serveDeskDocument } from "@/lib/files/serve-document";

export const dynamic = "force-dynamic";

/** Legacy alias — same bytes as /api/files/[id]. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await currentDeskSession();
  if (!session.signedIn) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { id } = await params;
  const search = new URL(request.url).searchParams;
  if (search.get("probe") === "1") {
    return probeDeskDocument(id);
  }
  const download = search.get("download") === "1";
  return serveDeskDocument(id, { download });
}
