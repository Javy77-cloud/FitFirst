import { jsonOk, options, withActor } from "./_lib/http";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return options();
}

export async function GET(request: Request) {
  return withActor(request, async () =>
    jsonOk({
      name: "FitFirst Open API",
      version: "v1",
      resources: {
        contacts: { list: "GET /api/v1/contacts", get: "GET /api/v1/contacts/:id" },
        policies: { list: "GET /api/v1/policies", get: "GET /api/v1/policies/:id" },
        deals: { list: "GET /api/v1/deals", get: "GET /api/v1/deals/:id" },
        activities: { list: "GET /api/v1/activities", get: "GET /api/v1/activities/:id" },
      },
      export: {
        contacts: "GET /api/v1/export/contacts.csv",
        policies: "GET /api/v1/export/policies.csv",
        commissions: "GET /api/v1/export/commissions.csv",
      },
      auth: {
        me: "GET /api/v1/me",
        token: "POST /api/v1/auth/token",
      },
    }),
  );
}
