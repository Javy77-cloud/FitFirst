import { receiveCarrierDeclaration } from "@/app/actions/declaration";
import { jsonError, jsonOk, options, withActor } from "../../../_lib/http";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return options();
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return withActor(request, async () => {
    const { id } = await context.params;
    const form = await request.formData().catch(() => null);
    if (!form) return jsonError("expected_multipart", 400);
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return jsonError("need_dec", 400);
    const result = await receiveCarrierDeclaration({
      dealId: id,
      filename: file.name,
      mimeType: file.type || "application/pdf",
      buffer: Buffer.from(await file.arrayBuffer()),
      carrierName: String(form.get("carrierName") ?? form.get("carrier") ?? "").trim() || null,
      product: String(form.get("product") ?? "").trim() || null,
    });
    if (!result.ok) return jsonError(result.reason, 400);
    return jsonOk({
      documentId: result.documentId,
      carrierName: result.carrierName,
      promptCreatePolicy: result.promptCreatePolicy,
      prompt: result.promptCreatePolicy
        ? {
            title: "Declaration received",
            body: `Declaration received from ${result.carrierName}. Create the policy now?`,
            actions: ["Create policy", "Not now"],
          }
        : null,
    });
  });
}
