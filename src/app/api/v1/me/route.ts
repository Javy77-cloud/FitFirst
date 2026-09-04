import { publicActor } from "@/lib/auth/api";
import { jsonOk, options, withActor } from "../_lib/http";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return options();
}

export async function GET(request: Request) {
  return withActor(request, async (actor) =>
    jsonOk({
      user: publicActor(actor),
      role: actor.role,
      tenant_id: actor.tenantId,
    }),
  );
}
