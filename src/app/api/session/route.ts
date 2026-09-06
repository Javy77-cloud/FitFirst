import { NextResponse } from "next/server";
import { switchDeskRole } from "@/lib/auth/switch-role";

function safeReturnTo(request: Request): string {
  const referer = request.headers.get("referer");
  if (!referer) return "/";
  try {
    const url = new URL(referer);
    const here = new URL(request.url);
    if (url.origin !== here.origin) return "/";
    return `${url.pathname}${url.search}` || "/";
  } catch {
    return "/";
  }
}

export async function POST(request: Request) {
  const form = await request.formData();
  const id = String(form.get("userId") ?? "").trim();
  const result = await switchDeskRole(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Admin only." }, { status: 403 });
  }
  const dest = safeReturnTo(request);
  return NextResponse.redirect(new URL(dest, request.url), 303);
}
