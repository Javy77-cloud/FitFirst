import { createHmac, timingSafeEqual } from "node:crypto";
import { isSocialPlatformId, SOCIAL_PLATFORM_IDS, type SocialPlatformId } from "./platforms";

export const SOCIAL_OAUTH_CALLBACK_PATH = "/api/social/oauth/callback";
export const SOCIAL_OAUTH_COOKIE = "ff_social_oauth";
export const META_GRAPH_VERSION = "v21.0";

export const SOCIAL_CONNECT_KINDS = ["oauth_byo", "paid_wall"] as const;
export type SocialConnectKind = (typeof SOCIAL_CONNECT_KINDS)[number];

export const SOCIAL_CONNECT_MODES = ["demo", "byo", "paid_wall"] as const;
export type SocialConnectMode = (typeof SOCIAL_CONNECT_MODES)[number];

export type SocialByoSpec = {
  id: SocialPlatformId;
  kind: SocialConnectKind;
  vendor: string;
  product: string;
  developerUrl: string;
  developerAppName: string;
  clientIdLabel: string;
  clientSecretLabel: string;
  scopes: string[];
  authorizeUrl: string;
  tokenUrl: string;
  extraParams?: Record<string, string>;
  /** Instagram can reuse a Meta app saved on Facebook. */
  shareCredentialsWith?: SocialPlatformId;
  worksWhen: string;
  wallTitle: string;
  wallBody: string;
  stubbed: string;
};

export const SOCIAL_BYO_SPECS: Record<SocialPlatformId, SocialByoSpec> = {
  facebook: {
    id: "facebook",
    kind: "oauth_byo",
    vendor: "Meta",
    product: "Facebook Login + Pages",
    developerUrl: "https://developers.facebook.com/apps",
    developerAppName: "Meta app (free developer)",
    clientIdLabel: "Meta App ID",
    clientSecretLabel: "Meta App Secret",
    scopes: [
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_metadata",
      "instagram_basic",
      "pages_read_user_content",
    ],
    authorizeUrl: `https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth`,
    tokenUrl: `https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token`,
    worksWhen:
      "Agency Meta app in development or live, with this desk’s redirect URI added under Facebook Login.",
    wallTitle: "Meta OAuth wall",
    wallBody:
      "Meta will refuse the grant if the App ID is wrong, the redirect URI is missing, or a permission still needs App Review. FitFirst does not buy Ads or Marketing API and does not own a Meta app.",
    stubbed: "Page inbox sync, lead-form pull, and ads wait on the vendor API.",
  },
  instagram: {
    id: "instagram",
    kind: "oauth_byo",
    vendor: "Meta",
    product: "Instagram API via Facebook Login",
    developerUrl: "https://developers.facebook.com/apps",
    developerAppName: "Meta app (same as Facebook, or its own)",
    clientIdLabel: "Meta App ID",
    clientSecretLabel: "Meta App Secret",
    scopes: [
      "pages_show_list",
      "instagram_basic",
      "instagram_manage_messages",
      "pages_read_engagement",
    ],
    authorizeUrl: `https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth`,
    tokenUrl: `https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token`,
    shareCredentialsWith: "facebook",
    worksWhen:
      "Same Meta app as Facebook, Instagram product added, Business/Creator account linked to a Page.",
    wallTitle: "Instagram OAuth wall",
    wallBody:
      "Instagram Graph needs a Meta app plus a linked Professional account. FitFirst does not buy Instagram API or ads seats.",
    stubbed: "DM / comment ingest waits on the vendor API. Nothing posts to Instagram.",
  },
  google_business_profile: {
    id: "google_business_profile",
    kind: "oauth_byo",
    vendor: "Google",
    product: "Google Business Profile",
    developerUrl: "https://console.cloud.google.com/apis/credentials",
    developerAppName: "Google Cloud OAuth client (Web)",
    clientIdLabel: "Google Client ID",
    clientSecretLabel: "Google Client Secret",
    scopes: ["openid", "email", "https://www.googleapis.com/auth/business.manage"],
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    extraParams: { access_type: "offline", prompt: "consent", include_granted_scopes: "true" },
    worksWhen:
      "Agency Google Cloud OAuth web client, this desk’s redirect URI on the client, GBP API enabled if they want listing calls later.",
    wallTitle: "Google / GBP wall",
    wallBody:
      "Google Sign-In can succeed on a free Cloud project. The Business Profile API itself often needs verification. FitFirst does not buy Maps Platform or GBP seats.",
    stubbed: "Listing views, replies, and GBP messages wait on the vendor API. Maps stay free public search links.",
  },
  linkedin: {
    id: "linkedin",
    kind: "oauth_byo",
    vendor: "LinkedIn",
    product: "Sign In with LinkedIn",
    developerUrl: "https://www.linkedin.com/developers/apps",
    developerAppName: "LinkedIn developer app (Sign In is free)",
    clientIdLabel: "LinkedIn Client ID",
    clientSecretLabel: "LinkedIn Client Secret",
    scopes: ["openid", "profile"],
    authorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    worksWhen: "Agency LinkedIn app with Sign In with LinkedIn (OpenID) and this redirect URI.",
    wallTitle: "LinkedIn page-API wall",
    wallBody:
      "Sign In can complete on a free developer app. Company-page inbox and Community Management stay partner / paid products. FitFirst does not buy Sales Navigator or Marketing API.",
    stubbed: "Page messages and lead-gen forms stay the inquiry stub.",
  },
  x: {
    id: "x",
    kind: "paid_wall",
    vendor: "X",
    product: "X API",
    developerUrl: "https://developer.x.com/en/portal/petition/essential/basic-info",
    developerAppName: "X developer app (paid API access)",
    clientIdLabel: "X Client ID",
    clientSecretLabel: "X Client Secret",
    scopes: ["tweet.read", "users.read", "offline.access"],
    authorizeUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    extraParams: { code_challenge_method: "plain" },
    worksWhen: "Agency already pays X for API access. FitFirst will not purchase a plan.",
    wallTitle: "X API is a paid vendor product",
    wallBody:
      "X no longer offers a free API that can read DMs or mentions for an agency desk. FitFirst does not buy X API. Save credentials if you already pay X — Connect stops at this wall.",
    stubbed: "Mentions, DMs, and pulse stay disconnected until a later BYO paid-app slice.",
  },
};

export function socialByoSpec(id: SocialPlatformId): SocialByoSpec {
  return SOCIAL_BYO_SPECS[id];
}

export function socialPlatformsInOrder(): SocialPlatformId[] {
  return [...SOCIAL_PLATFORM_IDS];
}

export function isOauthByoPlatform(id: SocialPlatformId): boolean {
  return SOCIAL_BYO_SPECS[id].kind === "oauth_byo";
}

export function isPaidWallPlatform(id: SocialPlatformId): boolean {
  return SOCIAL_BYO_SPECS[id].kind === "paid_wall";
}

export function socialOauthRedirectUri(origin: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}${SOCIAL_OAUTH_CALLBACK_PATH}`;
}

export function buildAuthorizeUrl(
  spec: SocialByoSpec,
  input: { clientId: string; redirectUri: string; state: string; codeChallenge?: string },
): string {
  const url = new URL(spec.authorizeUrl);
  url.searchParams.set("client_id", input.clientId.trim());
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("state", input.state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", spec.scopes.join(" "));
  if (spec.extraParams) {
    for (const [key, value] of Object.entries(spec.extraParams)) {
      url.searchParams.set(key, value);
    }
  }
  if (input.codeChallenge) {
    url.searchParams.set("code_challenge", input.codeChallenge);
    if (!url.searchParams.get("code_challenge_method")) {
      url.searchParams.set("code_challenge_method", "plain");
    }
  }
  return url.toString();
}

export type OauthStatePayload = {
  p: SocialPlatformId;
  n: string;
  r: "/settings/social" | "/settings/integrations";
  exp: number;
};

export function encodeOauthState(payload: OauthStatePayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const mac = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export function decodeOauthState(raw: string, secret: string): OauthStatePayload | null {
  const [body, mac] = raw.split(".");
  if (!body || !mac) return null;
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as OauthStatePayload;
    if (!isSocialPlatformId(payload.p)) return null;
    if (payload.r !== "/settings/social" && payload.r !== "/settings/integrations") return null;
    if (typeof payload.exp !== "number" || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export type SocialConnectStatus =
  | "not_connected"
  | "credentials_saved"
  | "connected_demo"
  | "connected_byo"
  | "paid_wall"
  | "oauth_wall";

export function socialConnectStatus(input: {
  connected: boolean;
  hasCredentials: boolean;
  connectMode: string | null;
  paidWall: boolean;
  lastOauthError?: string | null;
}): SocialConnectStatus {
  if (input.paidWall && !input.connected) return "paid_wall";
  if (input.connected && input.connectMode === "byo") return "connected_byo";
  if (input.connected) return "connected_demo";
  if (input.lastOauthError) return "oauth_wall";
  if (input.hasCredentials) return "credentials_saved";
  return "not_connected";
}

export function socialConnectStatusLabel(status: SocialConnectStatus): string {
  switch (status) {
    case "connected_byo":
      return "Connected (BYO)";
    case "connected_demo":
      return "Not connected";
    case "credentials_saved":
      return "Credentials saved";
    case "paid_wall":
      return "Paid wall";
    case "oauth_wall":
      return "OAuth wall";
    default:
      return "Not connected";
  }
}

export function socialReturnPath(raw: string): "/settings/social" | "/settings/integrations" {
  return raw === "/settings/integrations" ? "/settings/integrations" : "/settings/social";
}

export const MAPS_FREE_LINK_NOTE =
  "Maps stay free public search links (Google Maps / Zillow / FEMA) — not a paid Maps Platform seat and not a Connect vendor.";
