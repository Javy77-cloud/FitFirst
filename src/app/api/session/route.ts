import { NextResponse } from "next/server";
import { ACTOR_COOKIE, findUser } from "@/lib/auth/session";

function safeReturnTo(request: Request): string {
  const referer = request.headers.get("referer");
  if (!referer) return "/commissions";
  try {
    const url = new URL(referer);
    const here = new URL(request.url);
    if (url.origin !== here.origin) return "/commissions";
    return `${url.pathname}${url.search}` || "/commissions";
  } catch {
    return "/commissions";
  }
}

export async function POST(request: Request) {
  const form = await request.formData();
  const id = String(form.get("userId") ?? "").trim();
  const user = id ? await findUser(id) : null;
  const dest = safeReturnTo(request);
  const res = NextResponse.redirect(new URL(dest, request.url), 303);
  if (user?.active) {
    res.cookies.set({
      name: ACTOR_COOKIE,
      value: user.id,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return res;
}
