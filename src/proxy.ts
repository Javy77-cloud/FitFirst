import { NextResponse, type NextRequest } from "next/server";
import {
  adminRedirectPath,
  developerRedirectPath,
  isAdminOnlyPath,
  isDeveloperOnlyPath,
  isApiSelfAuthPath,
  isPublicPath,
} from "@/lib/auth/access";
import { SESSION_COOKIES } from "@/lib/auth/cookies";
import { verifySessionToken } from "@/lib/auth/signed-session";
import { isMfaChallengePath, isMfaSetupPath } from "@/lib/auth/mfa";
import { isInvalidDeskRecordPath } from "@/lib/desk-id";
import { isModulePath } from "@/lib/people/privileges";

function invalidRecordHtml() {
  return new NextResponse(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>404 · FitFirst</title>
    <style>
      body { margin: 0; min-height: 100vh; display: flex; flex-direction: column;
        align-items: center; justify-content: center; font-family: ui-sans-serif, system-ui, sans-serif;
        background: #f7f3ec; color: #111827; text-align: center; padding: 2rem; }
      .kicker { font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #5c6b7a; }
      h1 { margin: .5rem 0 0; font-size: 1.75rem; }
      p { max-width: 28rem; color: #5c6b7a; line-height: 1.5; }
      a { color: #1d6fb8; font-weight: 600; }
    </style>
  </head>
  <body>
    <div class="kicker">404</div>
    <h1>Page not found</h1>
    <p>That record is not on this desk. Invalid IDs stay 404 — they do not crash the desk.</p>
    <p><a href="/">Back to Home</a></p>
  </body>
</html>`,
    {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
    },
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isInvalidDeskRecordPath(pathname)) {
    return invalidRecordHtml();
  }
  if (isPublicPath(pathname) || isApiSelfAuthPath(pathname)) {
    return NextResponse.next();
  }

  const claims = verifySessionToken(request.cookies.get(SESSION_COOKIES.session)?.value);
  const userId = claims?.sub;
  const role = claims?.role;
  const mfa = claims?.mfa;
  if (!userId) {
    const dest = request.nextUrl.clone();
    dest.pathname = "/login";
    dest.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(dest);
  }

  if (mfa === "challenge" && !isMfaChallengePath(pathname)) {
    const dest = request.nextUrl.clone();
    dest.pathname = "/login/mfa";
    dest.search = "";
    return NextResponse.redirect(dest);
  }

  if (mfa === "pending" && !isMfaSetupPath(pathname)) {
    const dest = request.nextUrl.clone();
    dest.pathname = "/enroll-mfa";
    dest.search = "";
    return NextResponse.redirect(dest);
  }

  const isAdmin = role === "admin" || role === "owner";
  const isDeveloper = role === "developer";
  const canModules = claims?.mod !== "0";
  if (!isAdmin && !canModules && isModulePath(pathname)) {
    const dest = request.nextUrl.clone();
    dest.pathname = "/";
    dest.search = "?locked=modules";
    return NextResponse.redirect(dest);
  }
  if (isDeveloperOnlyPath(pathname)) {
    if (!isDeveloper && !isAdmin) {
      const dest = request.nextUrl.clone();
      const [path, query] = developerRedirectPath().split("?");
      dest.pathname = path ?? "/me";
      dest.search = query ? `?${query}` : "";
      return NextResponse.redirect(dest);
    }
  } else if (!isAdmin && isAdminOnlyPath(pathname)) {
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
    "/((?!_next/static|_next/image|favicon.ico|uploads/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js)$).*)",
  ],
};
