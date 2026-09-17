import { NextResponse } from "next/server";
import { fedexAddressEnabled } from "@/lib/developer/vault";
import { mapboxAutocompleteEnabled } from "@/lib/mapbox/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const autocomplete = mapboxAutocompleteEnabled();
    const verify = await fedexAddressEnabled();
    return NextResponse.json({
      enabled: autocomplete,
      verifyEnabled: verify,
      autocomplete: autocomplete ? "mapbox" : null,
      verify: verify ? "fedex" : null,
    });
  } catch {
    return NextResponse.json({
      enabled: false,
      verifyEnabled: false,
      autocomplete: null,
      verify: null,
    });
  }
}
