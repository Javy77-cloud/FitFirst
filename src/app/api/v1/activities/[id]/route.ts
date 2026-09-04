import { getApiActivity } from "@/lib/api/v1/queries";
import { jsonError, jsonOk, options, withActor } from "../../_lib/http";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return options();
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return withActor(request, async (actor) => {
    const { id } = await context.params;
    const activity = await getApiActivity(actor, id);
    if (!activity) return jsonError("not_found", 404);
    return jsonOk({ activity });
  });
}
