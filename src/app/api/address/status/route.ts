import { NextResponse } from "next/server";
import { fedexAddressEnabled } from "@/lib/developer/vault";
import { mapboxAutocompleteEnabled } from "@/lib/mapbox/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const autocomplete = mapboxAutocompleteEnabled();
  let verify = false;
  try {
    verify = await fedexAddressEnabled();
  } catch {
    verify = false;
  }
  return NextResponse.json({
    enabled: autocomplete,
    verifyEnabled: verify,
    autocomplete: autocomplete ? "mapbox" : null,
    verify: verify ? "fedex" : null,
  });
}
