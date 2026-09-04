import { NextResponse, type NextRequest } from "next/server";
import { adminRedirectPath, isAdminOnlyPath, isPublicPath } from "@/lib/auth/access";
import { SESSION_COOKIES } from "@/lib/auth/cookies";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const userId = request.cookies.get(SESSION_COOKIES.actorId)?.value;
  const role = request.cookies.get(SESSION_COOKIES.role)?.value ?? request.cookies.get(SESSION_COOKIES.actor)?.value;
  if (!userId) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(login);
  }

  const isAdmin = role === "admin" || role === "owner";
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
