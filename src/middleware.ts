import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isDeskUuid } from "@/lib/desk-id";

const RECORD = /^\/(leads|deals|contacts|policies|tasks|claims|accounts|businesses|merge|meetings)\/([^/]+)/;
const RESERVED = new Set(["new", "compare", "agents"]);

export function middleware(request: NextRequest) {
  const match = request.nextUrl.pathname.match(RECORD);
  if (match && !RESERVED.has(match[2]) && !isDeskUuid(match[2])) {
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
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/leads/:path*",
    "/deals/:path*",
    "/contacts/:path*",
    "/policies/:path*",
    "/tasks/:path*",
    "/claims/:path*",
    "/accounts/:path*",
    "/businesses/:path*",
    "/merge/:path*",
    "/meetings/:path*",
  ],
};
