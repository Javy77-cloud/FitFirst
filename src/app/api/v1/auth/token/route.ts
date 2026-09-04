import { NextResponse } from "next/server";
import {
  ADMIN_EMAIL,
  FALLBACK_ADMIN,
  issueApiToken,
  issueDemoAdminToken,
  publicActor,
  resolveApiActor,
} from "@/lib/auth/api";
import { ACTOR_COOKIE, SESSION_COOKIE_OPTS } from "@/lib/auth/cookies";
import { corsHeaders, jsonError, options } from "../../_lib/http";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return options();
}

async function readEmail(request: Request): Promise<string> {
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { email?: string };
      return String(body.email ?? "").trim();
    }
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await request.formData();
      return String(form.get("email") ?? "").trim();
    }
  } catch {
    return "";
  }
  return "";
}

export async function POST(request: Request) {
  const existing = await resolveApiActor(request);
  if (existing) {
    const { token, actor } = await issueApiToken(existing, "issued");
    const res = NextResponse.json(
      {
        token,
        token_type: "Bearer",
        expires_at: null,
        user: publicActor(actor),
      },
      { status: 200, headers: corsHeaders },
    );
    res.cookies.set({
      name: ACTOR_COOKIE,
      value: actor.id,
      ...SESSION_COOKIE_OPTS,
    });
    return res;
  }

  const email = await readEmail(request);
  if (email && email.toLowerCase() !== ADMIN_EMAIL && email.toLowerCase() !== FALLBACK_ADMIN.email.toLowerCase()) {
    return jsonError("unknown_user", 401);
  }

  const { token, actor } = await issueDemoAdminToken("issued");
  const res = NextResponse.json(
    {
      token,
      token_type: "Bearer",
      expires_at: null,
      user: publicActor(actor),
    },
    { status: 200, headers: corsHeaders },
  );
  res.cookies.set({
    name: ACTOR_COOKIE,
    value: actor.id,
    ...SESSION_COOKIE_OPTS,
  });
  return res;
}
