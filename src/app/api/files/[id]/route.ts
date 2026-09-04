import { currentDeskSession } from "@/lib/auth/session";
import { serveDeskDocument } from "@/lib/files/serve-document";

export const dynamic = "force-dynamic";

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
  const download = search.get("download") === "1";
  const versionId = search.get("version");
  return serveDeskDocument(id, {
    download,
    versionId,
    actorId: session.userId,
    actorName: session.name,
  });
}
