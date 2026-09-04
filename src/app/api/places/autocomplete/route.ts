import { NextResponse } from "next/server";
import { placesApiKey } from "@/lib/places/address";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const key = placesApiKey();
  if (!key) {
    return NextResponse.json({ suggestions: [], stub: true });
  }
  if (q.length < 3) {
    return NextResponse.json({ suggestions: [], stub: false });
  }

  try {
    const endpoint = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
    endpoint.searchParams.set("input", q);
    endpoint.searchParams.set("key", key);
    endpoint.searchParams.set("types", "address");
    endpoint.searchParams.set("components", "country:us");
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) {
      return NextResponse.json({ suggestions: [], stub: false });
    }
    const data = (await res.json()) as {
      status?: string;
      predictions?: { description: string; place_id: string }[];
    };
    if (data.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return NextResponse.json({ suggestions: [], stub: false });
    }
    const suggestions = (data.predictions ?? []).slice(0, 6).map((row) => ({
      label: row.description,
      placeId: row.place_id,
    }));
    return NextResponse.json({ suggestions, stub: false });
  } catch {
    return NextResponse.json({ suggestions: [], stub: false });
  }
}
