import { NextResponse } from "next/server";
import { fedexAddressEnabled } from "@/lib/developer/vault";

export const dynamic = "force-dynamic";

export async function GET() {
  const enabled = await fedexAddressEnabled();
  return NextResponse.json({ enabled });
}
