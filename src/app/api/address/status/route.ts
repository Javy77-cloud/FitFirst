import { NextResponse } from "next/server";
import { fedexAddressEnabled } from "@/lib/developer/vault";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const enabled = await fedexAddressEnabled();
    return NextResponse.json({ enabled });
  } catch {
    return NextResponse.json({ enabled: false });
  }
}
