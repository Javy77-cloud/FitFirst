import { isIntegrationProviderId, type IntegrationProviderId } from "./catalog";

export const BYO_OAUTH_CALLBACK_PATH = "/api/integrations/oauth/callback";
export const BYO_OAUTH_COOKIE = "ff_byo_oauth";

export const BYO_OAUTH_PROVIDER_IDS = [
  "gmail",
  "yahoo",
  "google_calendar",
  "outlook_calendar",
  "google_meet",
  "docusign",
] as const;

export type ByoOauthProviderId = (typeof BYO_OAUTH_PROVIDER_IDS)[number];

export const BYO_OAUTH_RETURN_PATHS = [
  "/settings/integrations",
  "/settings/email",
  "/settings/video",
  "/settings/esign",
  "/inbox",
  "/calendar",
] as const;

export type ByoOauthReturnPath = (typeof BYO_OAUTH_RETURN_PATHS)[number];

export type ByoOauthFamily = "google" | "microsoft" | "yahoo" | "docusign";

export type ByoOauthSpec = {
  id: ByoOauthProviderId;
  family: ByoOauthFamily;
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
  pkce: boolean;
  shareCredentialsWith?: ByoOauthProviderId;
  worksWhen: string;
  wallBody: string;
  stubbed: string;
  smokeTests: ("read" | "send" | "busy" | "meet" | "ping")[];
};

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_OFFLINE = {
  access_type: "offline",
  prompt: "consent",
  include_granted_scopes: "true",
} as const;

export const BYO_OAUTH_SPECS: Record<ByoOauthProviderId, ByoOauthSpec> = {
  gmail: {
    id: "gmail",
    family: "google",
    vendor: "Google",
    product: "Gmail",
    developerUrl: "https://console.cloud.google.com/apis/credentials",
    developerAppName: "Google Cloud OAuth client (Web)",
    clientIdLabel: "Google Client ID",
    clientSecretLabel: "Google Client Secret",
    scopes: [
      "openid",
      "email",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.modify",
    ],
    authorizeUrl: GOOGLE_AUTH,
    tokenUrl: GOOGLE_TOKEN,
    extraParams: { ...GOOGLE_OFFLINE },
    pkce: true,
    worksWhen:
      "One-click Google Connect. Paste or replace the Google Client ID and Secret here, or use GOOGLE_OAUTH_* env. Settings paste wins over env. Solos can connect personal Gmail. Opening a thread clears Gmail’s Unread label (gmail.modify). Connections made before that scope must reconnect once.",
    wallBody:
      "Google Connect fails if Settings keys and GOOGLE_OAUTH_* env are both missing, or Gmail API is off. Admin can replace or clear pasted keys at any time. FitFirst does not buy Workspace seats.",
    stubbed: "Campaign blasts stay would_send. Desk compose can send through this mailbox.",
    smokeTests: ["read", "send"],
  },
  yahoo: {
    id: "yahoo",
    family: "yahoo",
    vendor: "Yahoo",
    product: "Yahoo Mail",
    developerUrl: "https://developer.yahoo.com/apps/",
    developerAppName: "Yahoo developer app (OAuth2 / OpenID)",
    clientIdLabel: "Yahoo Client ID",
    clientSecretLabel: "Yahoo Client Secret",
    scopes: ["openid", "email", "profile"],
    authorizeUrl: "https://api.login.yahoo.com/oauth2/request_auth",
    tokenUrl: "https://api.login.yahoo.com/oauth2/get_token",
    extraParams: { language: "en-us" },
    pkce: true,
    worksWhen:
      "Free Yahoo developer app with OpenID. Redirect URI must match. Yahoo Mail REST is retired — connect stores tokens and proves identity.",
    wallBody:
      "Yahoo Mail REST/IMAP APIs are not a free inbox product. OAuth + OpenID still completes and stores the connection. FitFirst does not buy Yahoo Mail Plus.",
    stubbed: "IMAP/XOAUTH2 send-read waits on a later slice. Identity + refresh token are real.",
    smokeTests: ["ping"],
  },
  google_calendar: {
    id: "google_calendar",
    family: "google",
    vendor: "Google",
    product: "Google Calendar",
    developerUrl: "https://console.cloud.google.com/apis/credentials",
    developerAppName: "Google Cloud OAuth client (Web)",
    clientIdLabel: "Google Client ID",
    clientSecretLabel: "Google Client Secret",
    scopes: [
      "openid",
      "email",
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.freebusy",
    ],
    authorizeUrl: GOOGLE_AUTH,
    tokenUrl: GOOGLE_TOKEN,
    extraParams: { ...GOOGLE_OFFLINE },
    pkce: true,
    shareCredentialsWith: "gmail",
    worksWhen:
      "Same platform Google Connect as Gmail. Paste or replace keys here; Settings wins over env. Sync pulls titled primary-calendar events (and Free/Busy for private/busy-only) onto the desk. Creating or editing a timed FitFirst event writes it back to Google.",
    wallBody:
      "Google Calendar Connect fails if Settings keys and GOOGLE_OAUTH_* env are both missing, or Calendar API is off. Admin can replace or clear pasted keys. FitFirst does not buy Workspace.",
    stubbed: "Additional Google calendars beyond primary are deferred. Meet helper stays live.",
    smokeTests: ["busy", "meet"],
  },
  outlook_calendar: {
    id: "outlook_calendar",
    family: "microsoft",
    vendor: "Microsoft",
    product: "Outlook Calendar",
    developerUrl: "https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade",
    developerAppName: "Microsoft Entra app (personal + work, tenant=common)",
    clientIdLabel: "Microsoft Application (client) ID",
    clientSecretLabel: "Microsoft Client Secret",
    scopes: ["offline_access", "User.Read", "Calendars.Read", "Calendars.ReadWrite"],
    authorizeUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    extraParams: { prompt: "consent" },
    pkce: true,
    worksWhen:
      "Free Azure / Entra app registration, redirect URI as Web, Calendars.ReadWrite delegated. Personal Microsoft accounts work with tenant=common. Same event import/push contract as Google.",
    wallBody:
      "Microsoft will refuse the grant if the redirect URI, tenant, or Graph permission admin-consent is wrong. FitFirst does not buy Microsoft 365.",
    stubbed: "Additional Outlook calendars beyond the primary mailbox calendar are deferred.",
    smokeTests: ["busy"],
  },
  google_meet: {
    id: "google_meet",
    family: "google",
    vendor: "Google",
    product: "Google Meet",
    developerUrl: "https://console.cloud.google.com/apis/credentials",
    developerAppName: "Google Cloud OAuth client (Web)",
    clientIdLabel: "Google Client ID",
    clientSecretLabel: "Google Client Secret",
    scopes: [
      "openid",
      "email",
      "https://www.googleapis.com/auth/calendar.events",
    ],
    authorizeUrl: GOOGLE_AUTH,
    tokenUrl: GOOGLE_TOKEN,
    extraParams: { ...GOOGLE_OFFLINE },
    pkce: true,
    shareCredentialsWith: "gmail",
    worksWhen:
      "Same platform Google Connect. Paste or replace keys here; Settings wins over env. Meet links are minted through Calendar conferenceData — connecting Google Calendar is enough, or connect Meet here.",
    wallBody:
      "Meet helper needs Calendar events scope on the Google client. Admin can replace or clear pasted keys. FitFirst does not buy Workspace Meet.",
    stubbed: "Zoom stays unwired. Meet helper writes the URL onto the desk event.",
    smokeTests: ["meet"],
  },
  docusign: {
    id: "docusign",
    family: "docusign",
    vendor: "DocuSign",
    product: "DocuSign eSignature (sandbox)",
    developerUrl: "https://developers.docusign.com/",
    developerAppName: "DocuSign developer sandbox (account-d)",
    clientIdLabel: "DocuSign Integration Key",
    clientSecretLabel: "DocuSign Secret Key",
    scopes: ["signature"],
    authorizeUrl: "https://account-d.docusign.com/oauth/auth",
    tokenUrl: "https://account-d.docusign.com/oauth/token",
    extraParams: {},
    pkce: true,
    worksWhen:
      "Free DocuSign developer account. Add this desk’s redirect URI on the Integration Key. Sandbox only — account-d.docusign.com.",
    wallBody:
      "DocuSign production accounts are out of this wave. Sandbox OAuth completes and stores the connection. Documents can send ACORD, loss-run, Cancellation, and AOR envelopes to the deal contact.",
    stubbed: "In-desk signing stays on Deal / Policy. Vendor send uses the Documents loop.",
    smokeTests: ["ping"],
  },
};

export function isByoOauthProviderId(value: string): value is ByoOauthProviderId {
  return (BYO_OAUTH_PROVIDER_IDS as readonly string[]).includes(value);
}

export function byoOauthSpec(id: ByoOauthProviderId): ByoOauthSpec {
  return BYO_OAUTH_SPECS[id];
}

export function byoOauthReturnPath(raw: string): ByoOauthReturnPath {
  return (BYO_OAUTH_RETURN_PATHS as readonly string[]).includes(raw)
    ? (raw as ByoOauthReturnPath)
    : "/settings/integrations";
}

export function byoOauthRedirectUri(origin: string): string {
  return `${origin.replace(/\/$/, "")}${BYO_OAUTH_CALLBACK_PATH}`;
}

export function isCatalogByoOauthId(value: string): value is IntegrationProviderId & ByoOauthProviderId {
  return isByoOauthProviderId(value) && isIntegrationProviderId(value);
}

export function googleFamilyIds(): ByoOauthProviderId[] {
  return BYO_OAUTH_PROVIDER_IDS.filter((id) => BYO_OAUTH_SPECS[id].family === "google");
}

/** threads.modify (clear UNREAD) needs gmail.modify. readonly + send cannot change labels. */
export function gmailScopesAllowModify(scopes: string | null | undefined): boolean {
  const text = (scopes ?? "").toLowerCase();
  return text.includes("gmail.modify") || text.includes("mail.google.com");
}

export const GMAIL_MARK_READ_RECONNECT =
  "Opening a message marks it read in Gmail. This connection does not include gmail.modify yet. Reconnect Gmail under Settings → Email (or Inbox → Connect Gmail), approve the new permission, then open the thread again.";
