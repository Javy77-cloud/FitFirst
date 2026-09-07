import { NextResponse } from "next/server";
import { loadFedExCredentials } from "@/lib/developer/vault";
import { suggestFedExAddresses } from "@/lib/fedex/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const creds = await loadFedExCredentials();
  if (!creds) {
    return NextResponse.json({ suggestions: [], enabled: false });
  }
  if (q.length < 3) {
    return NextResponse.json({ suggestions: [], enabled: true });
  }
  try {
    const suggestions = await suggestFedExAddresses(q, creds);
    return NextResponse.json({ suggestions, enabled: true });
  } catch {
    return NextResponse.json({ suggestions: [], enabled: true });
  }
}
