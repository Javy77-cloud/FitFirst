import { listApiActivities } from "@/lib/api/v1/queries";
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
    const items = await listApiActivities(actor, {
      kind: searchParams.get("kind"),
      status: searchParams.get("status"),
      contactId: searchParams.get("contact_id"),
      policyId: searchParams.get("policy_id"),
      dealId: searchParams.get("deal_id"),
    });
    return jsonOk(slicePage(items, page.limit, page.offset));
  });
}
