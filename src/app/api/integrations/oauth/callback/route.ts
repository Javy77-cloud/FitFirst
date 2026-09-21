import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { currentDeskSession } from "@/lib/auth/session";
import { canStartByoOauth } from "@/lib/integrations/connect-policy";
import { getAgentFeatureToggles } from "@/lib/settings/agent-feature-toggles-prefs";
import { decodeByoOauthState } from "@/lib/integrations/oauth";
import { exchangeByoOAuthCode } from "@/lib/integrations/oauth-exchange";
import { applyByoConnectSideEffects } from "@/lib/integrations/oauth-side-effects";
import {
  BYO_OAUTH_CALLBACK_PATH,
  BYO_OAUTH_COOKIE,
  byoOauthRedirectUri,
  byoOauthSpec,
  isByoOauthProviderId,
} from "@/lib/integrations/oauth-specs";
import { completeByoConnect, recordByoOauthError } from "@/lib/integrations/oauth-store";

export const dynamic = "force-dynamic";

function destFor(returnTo: string, query: string) {
  return `${returnTo}?${query}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = (url.searchParams.get("code") ?? "").trim();
  const error = (url.searchParams.get("error") ?? "").trim();
  const errorDescription = (url.searchParams.get("error_description") ?? "").trim();
  const stateRaw = (url.searchParams.get("state") ?? "").trim();
  const origin = `${url.protocol}//${url.host}`;
  const redirectUri = byoOauthRedirectUri(origin);

  const session = await currentDeskSession();

  const jar = await cookies();
  const cookieState = jar.get(BYO_OAUTH_COOKIE)?.value ?? "";
  const signed = stateRaw || cookieState;
  const payload = signed ? decodeByoOauthState(signed) : null;
  const returnTo = payload?.r ?? "/settings/integrations";
  const provider = payload?.p;

  jar.set(BYO_OAUTH_COOKIE, "", { path: "/", maxAge: 0 });

  if (!provider || !isByoOauthProviderId(provider)) {
    return NextResponse.redirect(
      new URL(destFor("/settings/integrations", "notice=oauth-wall&reason=bad-state"), request.url),
    );
  }

  const toggles = await getAgentFeatureToggles();
  if (!canStartByoOauth(session, provider, toggles.agentsMayConnectPersonalGoogle)) {
    return NextResponse.redirect(new URL("/settings/integrations?notice=admin-only", request.url));
  }

  const spec = byoOauthSpec(provider);
  if (error) {
    const message = errorDescription || `${spec.vendor} returned ${error}. ${spec.wallBody}`;
    await recordByoOauthError(provider, message);
    return NextResponse.redirect(
      new URL(destFor(returnTo, `notice=oauth-wall&provider=${provider}`), request.url),
    );
  }

  if (!code) {
    await recordByoOauthError(provider, "Vendor returned no authorization code.");
    return NextResponse.redirect(
      new URL(destFor(returnTo, `notice=oauth-wall&provider=${provider}`), request.url),
    );
  }

  const exchanged = await exchangeByoOAuthCode({
    provider,
    code,
    redirectUri,
    codeVerifier: payload.v,
  });
  if (!exchanged.ok) {
    await recordByoOauthError(provider, exchanged.message);
    return NextResponse.redirect(
      new URL(destFor(returnTo, `notice=oauth-wall&provider=${provider}`), request.url),
    );
  }

  await completeByoConnect({
    provider,
    accountLabel: exchanged.accountLabel,
    accountEmail: exchanged.accountEmail,
    accessToken: exchanged.accessToken,
    refreshToken: exchanged.refreshToken,
    expiresIn: exchanged.expiresIn,
    scopes: exchanged.scopes,
    ownerUserId: payload.u ?? session.userId,
  });
  // Busy sync is fire-and-forget inside applyByoConnectSideEffects so this
  // stays a fast DB write — awaiting freeBusy used to leave Google spinning.
  try {
    await applyByoConnectSideEffects({
      provider,
      accountLabel: exchanged.accountLabel,
      accountEmail: exchanged.accountEmail,
    });
  } catch {
    /* connection row is the source of truth */
  }

  return NextResponse.redirect(
    new URL(destFor(returnTo, `notice=byo-connected&provider=${provider}`), request.url),
  );
}

export const callbackPath = BYO_OAUTH_CALLBACK_PATH;
