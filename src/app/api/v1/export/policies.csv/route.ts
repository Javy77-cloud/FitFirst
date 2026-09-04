import { POLICY_CSV_HEADERS } from "@/lib/api/v1/serialize";
import { toCsv } from "@/lib/api/v1/csv";
import { listApiPolicies, policyCsvRows } from "@/lib/api/v1/queries";
import { csvOk, options, withActor } from "../../_lib/http";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return options();
}

export async function GET(request: Request) {
  return withActor(request, async (actor) => {
    const items = await listApiPolicies(actor);
    return csvOk("policies", toCsv([...POLICY_CSV_HEADERS], policyCsvRows(items)));
  });
}
