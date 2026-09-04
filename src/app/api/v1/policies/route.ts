import { listApiPolicies } from "@/lib/api/v1/queries";
import { parsePage, slicePage } from "@/lib/api/v1/page";
import { jsonOk, options, withActor } from "../_lib/http";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return options();
}

export async function GET(request: Request) {
  return withActor(request, async (actor) => {
    const { searchParams } = new URL(request.url);
    const page = parsePage(searchParams);
    const items = await listApiPolicies(actor, {
      status: searchParams.get("status"),
      line: searchParams.get("line"),
    });
    return jsonOk(slicePage(items, page.limit, page.offset));
  });
}
