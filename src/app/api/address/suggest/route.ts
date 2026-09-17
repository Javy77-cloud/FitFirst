import { NextResponse } from "next/server";
import { mapboxAutocompleteEnabled, suggestMapboxAddresses } from "@/lib/mapbox/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    if (!mapboxAutocompleteEnabled()) {
      return NextResponse.json({ suggestions: [], enabled: false });
    }
    if (q.length < 3) {
      return NextResponse.json({ suggestions: [], enabled: true });
    }
    const suggestions = await suggestMapboxAddresses(q);
    return NextResponse.json({ suggestions, enabled: true });
  } catch {
    return NextResponse.json({ suggestions: [], enabled: false });
  }
}
