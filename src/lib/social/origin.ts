import { headers } from "next/headers";

export async function deskPublicOrigin(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "127.0.0.1:43147";
  return `${proto}://${host}`;
}
