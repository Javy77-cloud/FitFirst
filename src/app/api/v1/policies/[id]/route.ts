import { getApiPolicy } from "@/lib/api/v1/queries";
import { jsonError, jsonOk, options, withActor } from "../../_lib/http";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return options();
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return withActor(request, async (actor) => {
    const { id } = await context.params;
    const policy = await getApiPolicy(actor, id);
    if (!policy) return jsonError("not_found", 404);
    return jsonOk({ policy });
  });
}
