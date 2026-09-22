import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { currentDeskSession } from "@/lib/auth/session";
import { clientUploadPathError, INSURANCE_PDF_MAX_BYTES } from "@/lib/files/upload-plan";

export const dynamic = "force-dynamic";

/** Browser → Blob for insurance PDFs larger than Vercel's 4.5MB request body. */
export async function POST(request: Request): Promise<Response> {
  const session = await currentDeskSession();
  if (!session.signedIn || session.mfaStatus === "challenge") {
    return Response.json({ error: "Sign in to upload files. Nothing was saved." }, { status: 401 });
  }
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return Response.json({ error: "Upload request was not valid JSON. Nothing was saved." }, { status: 400 });
  }
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const dealId = (clientPayload ?? "").trim();
        if (!dealId) throw new Error("This upload is not tied to a deal. Nothing was saved.");
        const pathError = clientUploadPathError(pathname, dealId);
        if (pathError) throw new Error(pathError);
        return {
          allowedContentTypes: [
            "application/pdf",
            "application/octet-stream",
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/heic",
            "image/heif",
            "text/plain",
          ],
          maximumSizeInBytes: INSURANCE_PDF_MAX_BYTES,
          addRandomSuffix: false,
          allowOverwrite: true,
        };
      },
    });
    return Response.json(json);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start the upload. Nothing was saved.";
    return Response.json({ error: message }, { status: 400 });
  }
}
