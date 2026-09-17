import { NextResponse } from "next/server";
import { parseAddressLine } from "@/lib/address/compare";
import { addressIsComplete, type ParsedAddress } from "@/lib/address/types";
import { loadFedExCredentials } from "@/lib/developer/vault";
import { verifyFedExAddress } from "@/lib/fedex/client";

export const dynamic = "force-dynamic";

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function addressFromBody(body: unknown): ParsedAddress {
  const row = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const structured: ParsedAddress = {
    street: asString(row.street),
    city: asString(row.city),
    state: asString(row.state),
    zip: asString(row.zip),
    county: asString(row.county),
    country: asString(row.country) || "US",
  };
  if (addressIsComplete(structured)) return structured;
  const line = asString(row.line) || asString(row.q) || structured.street;
  const parsed = parseAddressLine(line);
  return {
    street: structured.street || parsed.street,
    city: structured.city || parsed.city,
    state: structured.state || parsed.state,
    zip: structured.zip || parsed.zip,
    county: structured.county || parsed.county,
    country: structured.country || parsed.country || "US",
  };
}

export async function POST(request: Request) {
  try {
    const creds = await loadFedExCredentials();
    if (!creds) {
      return NextResponse.json({
        status: "disabled",
        enabled: false,
        resolved: null,
        suggestions: [],
      });
    }
    const body = await request.json().catch(() => ({}));
    const address = addressFromBody(body);
    if (!addressIsComplete(address)) {
      return NextResponse.json({
        status: "incomplete",
        enabled: true,
        resolved: null,
        suggestions: [],
      });
    }
    const result = await verifyFedExAddress(address, creds);
    return NextResponse.json({ ...result, enabled: true });
  } catch {
    return NextResponse.json({
      status: "error",
      enabled: false,
      resolved: null,
      suggestions: [],
    });
  }
}

/** GET is not typeahead — reject so FedEx cannot be used as autocomplete. */
export async function GET() {
  return NextResponse.json({ error: "Use POST with street, city, state, and ZIP." }, { status: 405 });
}
