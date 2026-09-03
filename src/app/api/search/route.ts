import { NextResponse } from "next/server";
import { smartSearch } from "@/lib/db/queries";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const hits = await smartSearch(q);
  return NextResponse.json({ q, hits });
}
