import { NextResponse, type NextRequest } from "next/server";
import { adminRedirectPath, isAdminOnlyPath, isPublicPath } from "@/lib/auth/access";
import { SESSION_COOKIES } from "@/lib/auth/cookies";
import { isModulePath } from "@/lib/people/privileges";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const userId = request.cookies.get(SESSION_COOKIES.actorId)?.value;
  const role = request.cookies.get(SESSION_COOKIES.role)?.value ?? request.cookies.get(SESSION_COOKIES.actor)?.value;
  const mfaOk = request.cookies.get(SESSION_COOKIES.mfa)?.value === "1";
  const pending = request.cookies.get(SESSION_COOKIES.mfaPending)?.value;
  if (!userId || !mfaOk) {
    const dest = request.nextUrl.clone();
    if (pending) {
      dest.pathname = "/login/mfa";
      dest.search = "";
      return NextResponse.redirect(dest);
    }
    dest.pathname = "/login";
    dest.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(dest);
  }

  const isAdmin = role === "admin" || role === "owner";
  const canModules = request.cookies.get(SESSION_COOKIES.modules)?.value !== "0";
  if (!isAdmin && !canModules && isModulePath(pathname)) {
    const dest = request.nextUrl.clone();
    dest.pathname = "/";
    dest.search = "?locked=modules";
    return NextResponse.redirect(dest);
  }
  if (!isAdmin && isAdminOnlyPath(pathname)) {
    const dest = request.nextUrl.clone();
    const [path, query] = adminRedirectPath().split("?");
    dest.pathname = path ?? "/settings/my-desk";
    dest.search = query ? `?${query}` : "";
    return NextResponse.redirect(dest);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|uploads/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
