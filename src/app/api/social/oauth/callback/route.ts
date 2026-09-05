import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { currentDeskSession } from "@/lib/auth/session";
import {
  decodeOauthState,
  SOCIAL_OAUTH_CALLBACK_PATH,
  SOCIAL_OAUTH_COOKIE,
  socialByoSpec,
  socialOauthRedirectUri,
} from "@/lib/social/byo";
import {
  completeSocialByoConnect,
  exchangeSocialOAuthCode,
  recordSocialOauthError,
  socialOauthStateSecret,
} from "@/lib/social/byo-store";
import { isSocialPlatformId } from "@/lib/social/platforms";

export const dynamic = "force-dynamic";

function destFor(returnTo: "/settings/social" | "/settings/integrations", query: string) {
  return `${returnTo}?${query}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = (url.searchParams.get("code") ?? "").trim();
  const error = (url.searchParams.get("error") ?? "").trim();
  const errorDescription = (url.searchParams.get("error_description") ?? "").trim();
  const stateRaw = (url.searchParams.get("state") ?? "").trim();
  const origin = `${url.protocol}//${url.host}`;
  const redirectUri = socialOauthRedirectUri(origin);

  const session = await currentDeskSession();
  if (!session.isAdmin) {
    return NextResponse.redirect(new URL("/settings/social?notice=admin-only", request.url));
  }

  const jar = await cookies();
  const cookieState = jar.get(SOCIAL_OAUTH_COOKIE)?.value ?? "";
  const signed = stateRaw || cookieState;
  const payload = signed ? decodeOauthState(signed, socialOauthStateSecret()) : null;
  const returnTo = payload?.r ?? "/settings/social";
  const provider = payload?.p;

  jar.set(SOCIAL_OAUTH_COOKIE, "", { path: "/", maxAge: 0 });

  if (!provider || !isSocialPlatformId(provider)) {
    return NextResponse.redirect(
      new URL(destFor("/settings/social", "notice=oauth-wall&reason=bad-state"), request.url),
    );
  }

  const spec = socialByoSpec(provider);
  if (error) {
    const message = errorDescription || `${spec.vendor} returned ${error}. ${spec.wallBody}`;
    await recordSocialOauthError(provider, message);
    return NextResponse.redirect(
      new URL(destFor(returnTo, `notice=oauth-wall&provider=${provider}`), request.url),
    );
  }

  if (!code) {
    await recordSocialOauthError(provider, "Vendor returned no authorization code.");
    return NextResponse.redirect(
      new URL(destFor(returnTo, `notice=oauth-wall&provider=${provider}`), request.url),
    );
  }

  const exchanged = await exchangeSocialOAuthCode({ provider, code, redirectUri });
  if (!exchanged.ok) {
    await recordSocialOauthError(provider, exchanged.message);
    return NextResponse.redirect(
      new URL(destFor(returnTo, `notice=oauth-wall&provider=${provider}`), request.url),
    );
  }

  await completeSocialByoConnect({
    provider,
    accountLabel: exchanged.accountLabel,
    accessToken: exchanged.accessToken,
  });
  return NextResponse.redirect(
    new URL(destFor(returnTo, `notice=byo-connected&provider=${provider}`), request.url),
  );
}

export const callbackPath = SOCIAL_OAUTH_CALLBACK_PATH;
