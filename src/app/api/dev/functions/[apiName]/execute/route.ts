import { NextResponse } from "next/server";
import { parseApiKeyHeader } from "@/lib/developer-hub/keys";
import {
  executeDeveloperFunction,
  getDeveloperFunctionByApiName,
  verifyOrgApiKey,
} from "@/lib/developer-hub/store";

export const dynamic = "force-dynamic";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Api-Key, X-FitFirst-Key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: cors });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ apiName: string }> },
) {
  const { apiName } = await context.params;
  const secret = parseApiKeyHeader(request);
  if (!secret) return json({ error: "missing_api_key" }, 401);
  const key = await verifyOrgApiKey(secret);
  if (!key) return json({ error: "invalid_or_revoked_api_key" }, 401);

  const fn = await getDeveloperFunctionByApiName(apiName);
  if (!fn) return json({ error: "function_not_found" }, 404);
  if (fn.category !== "standalone") {
    return json({ error: "not_standalone", message: "Only standalone functions expose REST." }, 400);
  }
  if (fn.exposeAsOauth && !fn.exposeAsRest) {
    return json(
      {
        error: "needs_oauth",
        message: "This function is marked Expose as OAuth 2.0. Connect later — no live OAuth on this desk.",
      },
      501,
    );
  }
  if (!fn.exposeAsRest) {
    return json({ error: "rest_not_enabled" }, 403);
  }

  let input: unknown = {};
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      input = await request.json();
    } catch {
      input = {};
    }
  }

  const { result, log } = await executeDeveloperFunction({ fn, input, source: "rest" });
  return json({
    ok: result.ok,
    stub: result.stub,
    apiName: fn.apiName,
    connectionLinkName: fn.connectionLinkName,
    executionId: log?.id ?? null,
    output: result.output,
    error: result.error ?? null,
  }, result.ok ? 200 : 422);
}
