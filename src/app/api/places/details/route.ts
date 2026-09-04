import { NextResponse } from "next/server";
import { parseGoogleAddressComponents, placesApiKey, type GoogleAddressComponent } from "@/lib/places/address";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const placeId = (url.searchParams.get("placeId") ?? "").trim();
  const key = placesApiKey();
  if (!key || !placeId) {
    return NextResponse.json({ address: null, stub: !key });
  }

  try {
    const endpoint = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    endpoint.searchParams.set("place_id", placeId);
    endpoint.searchParams.set("fields", "address_component,formatted_address");
    endpoint.searchParams.set("key", key);
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) {
      return NextResponse.json({ address: null, stub: false });
    }
    const data = (await res.json()) as {
      status?: string;
      result?: { address_components?: GoogleAddressComponent[]; formatted_address?: string };
    };
    if (data.status && data.status !== "OK") {
      return NextResponse.json({ address: null, stub: false });
    }
    const parsed = parseGoogleAddressComponents(data.result?.address_components);
    if (!parsed.street && data.result?.formatted_address) {
      parsed.street = data.result.formatted_address.split(",")[0]?.trim() ?? "";
    }
    return NextResponse.json({ address: parsed, stub: false });
  } catch {
    return NextResponse.json({ address: null, stub: false });
  }
}
