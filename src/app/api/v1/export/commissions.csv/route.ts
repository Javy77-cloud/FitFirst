import { COMMISSION_CSV_HEADERS } from "@/lib/api/v1/serialize";
import { toCsv } from "@/lib/api/v1/csv";
import { commissionCsvRows, listApiCommissions } from "@/lib/api/v1/queries";
import { csvOk, options, withActor } from "../../_lib/http";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return options();
}

export async function GET(request: Request) {
  return withActor(request, async (actor) => {
    const items = await listApiCommissions(actor);
    return csvOk("commissions", toCsv([...COMMISSION_CSV_HEADERS], commissionCsvRows(items)));
  });
}
