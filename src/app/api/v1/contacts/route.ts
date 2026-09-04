import { listApiContacts } from "@/lib/api/v1/queries";
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
    const items = await listApiContacts(actor, {
      q: searchParams.get("q"),
      status: searchParams.get("status"),
    });
    return jsonOk(slicePage(items, page.limit, page.offset));
  });
}
