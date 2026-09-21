import { jsonError, jsonOk, options, withActor } from "@/app/api/v1/_lib/http";
import { loadCarrierLoginEvents, recordCarrierLoginIssue } from "@/lib/carrier-login-issues/persist";
import { rollupCarrierLoginIssues } from "@/lib/carrier-login-issues/store";
import {
  CARRIER_LOGIN_ISSUES_DOC_PATH,
  CARRIER_LOGIN_ISSUES_RELATIVE_PATH,
} from "@/lib/carrier-login-issues/types";

export function OPTIONS() {
  return options();
}

function str(body: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = body[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export async function GET(request: Request) {
  return withActor(request, async () => {
    const events = await loadCarrierLoginEvents();
    return jsonOk({
      path: CARRIER_LOGIN_ISSUES_RELATIVE_PATH,
      doc: CARRIER_LOGIN_ISSUES_DOC_PATH,
      table: "carrier_login_issues",
      events,
      rollup: rollupCarrierLoginIssues(events),
    });
  });
}

export async function POST(request: Request) {
  return withActor(request, async () => {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return jsonError("Expected JSON.", 400);
    }
    const carrierName = str(body, "carrier_name", "carrierName");
    const errorMessage = str(body, "error_message", "errorMessage");
    if (!carrierName || !errorMessage) {
      return jsonError("carrier_name and error_message are required.", 400);
    }
    try {
      const event = await recordCarrierLoginIssue({
        carrierName,
        carrierId: str(body, "carrier_id", "carrierId") || null,
        errorMessage,
        errorCategory: str(body, "error_category", "errorCategory") || null,
        result: str(body, "result") || null,
        occurredAt: str(body, "occurred_at", "occurredAt") || null,
        lob: str(body, "lob") || null,
        source: str(body, "source") || "quote-bot.api",
        dealId: str(body, "deal_id", "dealId") || null,
      });
      if (!event) {
        return jsonError(
          "Not a login failure. This list does not store UW declines or missing questions.",
          422,
        );
      }
      const events = await loadCarrierLoginEvents();
      return jsonOk({ event, rollup: rollupCarrierLoginIssues(events) }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not record the carrier login issue.";
      return jsonError(message, 500);
    }
  });
}
