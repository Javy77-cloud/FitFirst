import { notImplemented, type NotImplementedResult } from "./types";

export const INTEGRATION_CATEGORIES = [
  "email",
  "calendar",
  "social",
  "phone_sms",
  "esign",
  "rater",
  "health_enrollment",
  "campaigns",
  "video",
] as const;

export type IntegrationCategory = (typeof INTEGRATION_CATEGORIES)[number];

export const INTEGRATION_CATEGORY_LABEL: Record<IntegrationCategory, string> = {
  email: "Email",
  calendar: "Calendar",
  social: "Social / GBP",
  phone_sms: "Phone / SMS",
  esign: "E-sign",
  rater: "Rater",
  health_enrollment: "Health enrollment",
  campaigns: "Campaigns",
  video: "Video",
};

export const INTEGRATION_CATEGORY_BLURB: Record<IntegrationCategory, string> = {
  email:
    "Agency inbox. Gmail is one-click Google Connect (platform OAuth). Yahoo is BYO OAuth. Outlook / Zoho Mail stay unwired. FitFirst does not host mail.",
  calendar:
    "Desk calendar stays here. Google and Outlook Calendar pull external busy so FitFirst will not book over those slots.",
  social:
    "Facebook and Instagram are one-click OAuth on FitFirst’s Meta app. LinkedIn, X, and Google Business Profile still use the agency’s own developer app. FitFirst does not buy ads or API seats. Maps stay free public search links.",
  phone_sms: "Call log and SMS. Connect 8x8, Twilio, RingCentral, or Lightspeed Voice when the agency is ready.",
  esign: "In-desk signing on Deal or Policy. DocuSign sandbox OAuth is wired. Dropbox Sign stays a preference stub.",
  rater: "EZLynx and QuoteRush seats the agency already pays. Super-Copy stays copy-from-the-sheet — no rater API.",
  health_enrollment:
    "HealthSherpa Medicare is BYO: store the partner key in the API vault, sync contacts, and ingest enrollment webhooks. Marketplace / ACA stays scaffolded until partner credentials exist. FitFirst does not add a HealthSherpa fee.",
  campaigns: "Bulk and drip later. Mailchimp, Constant Contact, or SendGrid — agency pays the vendor.",
  video: "Meeting links on the calendar. Google Meet helper is live when Calendar or Meet is connected. Zoom stays stub.",
};

export const INTEGRATION_PROVIDER_IDS = [
  "gmail",
  "outlook",
  "zoho_mail",
  "yahoo",
  "google_calendar",
  "outlook_calendar",
  "zoho_calendar",
  "facebook",
  "instagram",
  "google_business_profile",
  "x",
  "linkedin",
  "twilio",
  "eight_by_eight",
  "ringcentral",
  "lightspeed_voice",
  "docusign",
  "dropbox_sign",
  "ezlynx",
  "quoterush",
  "mailchimp",
  "constant_contact",
  "sendgrid",
  "zoom",
  "google_meet",
  "healthsherpa_medicare",
  "healthsherpa_aca",
] as const;

export type IntegrationProviderId = (typeof INTEGRATION_PROVIDER_IDS)[number];

export type IntegrationTone =
  | "google"
  | "outlook"
  | "zoho"
  | "yahoo"
  | "facebook"
  | "instagram"
  | "x"
  | "linkedin"
  | "gbp"
  | "sms"
  | "esign"
  | "rater"
  | "health"
  | "campaign"
  | "video";

export type IntegrationProvider = {
  id: IntegrationProviderId;
  category: IntegrationCategory;
  name: string;
  initials: string;
  blurb: string;
  byoNote: string;
  tone: IntegrationTone;
  optional?: boolean;
  /** Agents see status but cannot connect. GBP also needs the monitor gate. */
  adminGated?: boolean;
};

export const AGENCY_PAYS_VENDOR = "Agency pays the vendor.";

export function connectionStatusLabel(connected: boolean): "Connected" | "Not connected" {
  return connected ? "Connected" : "Not connected";
}

export const INTEGRATION_PROVIDERS: IntegrationProvider[] = [
  {
    id: "gmail",
    category: "email",
    name: "Gmail / Google",
    initials: "Gm",
    blurb: "Agency or solo Gmail. Real OAuth — send and read enough to smoke-test from the desk.",
    byoNote: "Agency pays Google Workspace, or a solo Admin connects personal Gmail. FitFirst does not host mail.",
    tone: "google",
  },
  {
    id: "outlook",
    category: "email",
    name: "Outlook / Microsoft 365",
    initials: "Ol",
    blurb: "Microsoft 365 mailbox for client threads.",
    byoNote: "Agency pays Microsoft 365. No Graph tokens stored here.",
    tone: "outlook",
  },
  {
    id: "zoho_mail",
    category: "email",
    name: "Zoho Mail",
    initials: "Zm",
    blurb: "Zoho Mail inbox the agency already pays for.",
    byoNote: "Agency pays Zoho Mail. This is not a Zoho CRM sync.",
    tone: "zoho",
  },
  {
    id: "yahoo",
    category: "email",
    name: "Yahoo Mail",
    initials: "Yh",
    blurb: "Yahoo inbox. Free OpenID OAuth stores the connection. Mail REST/IMAP is Yahoo’s wall.",
    byoNote: "Agency Yahoo account. OAuth + identity are real. IMAP send/read is not in this wave.",
    tone: "yahoo",
    optional: true,
  },
  {
    id: "google_calendar",
    category: "calendar",
    name: "Google Calendar",
    initials: "Gc",
    blurb: "Pull Free/Busy onto the desk board so scheduling will not land on external busy.",
    byoNote: "Agency Google account. Busy sync is live. Full two-way event push is later.",
    tone: "google",
  },
  {
    id: "outlook_calendar",
    category: "calendar",
    name: "Outlook Calendar",
    initials: "Oc",
    blurb: "Microsoft 365 calendar busy next to the in-desk board.",
    byoNote: "Agency Microsoft 365. Graph Free/Busy is live. FitFirst does not buy a seat.",
    tone: "outlook",
  },
  {
    id: "zoho_calendar",
    category: "calendar",
    name: "Zoho Calendar",
    initials: "Zc",
    blurb: "Zoho Calendar next to the in-desk board. No live Zoho sync.",
    byoNote: "Agency pays Zoho Calendar. Desk events stay in FitFirst.",
    tone: "zoho",
  },
  {
    id: "facebook",
    category: "social",
    name: "Facebook",
    initials: "Fb",
    blurb: "Page inbox and lead forms. Inquiries land on Leads.",
    byoNote: "Agency Facebook Page. Admin clicks Connect — FitFirst hosts the Meta app. Never paste App ID or secret.",
    tone: "facebook",
  },
  {
    id: "instagram",
    category: "social",
    name: "Instagram",
    initials: "Ig",
    blurb: "DMs and comment asks for a quote. Same social → Lead path.",
    byoNote: "Agency Instagram. Same FitFirst Meta app as Facebook. Admin never pastes App ID or secret. Nothing posts.",
    tone: "instagram",
  },
  {
    id: "google_business_profile",
    category: "social",
    name: "Google Business Profile",
    initials: "Gb",
    blurb: "Listing messages and views. Agents monitor only after Admin allows it.",
    byoNote: "Agency Google Cloud OAuth client. GBP API verification is Google’s wall. Maps stay free links.",
    tone: "gbp",
    adminGated: true,
  },
  {
    id: "x",
    category: "social",
    name: "X (Twitter)",
    initials: "X",
    blurb: "Mentions and DMs that ask for coverage. Pulse is demo numbers after connect.",
    byoNote: "Agency X account. X API is a paid vendor product. FitFirst does not buy it.",
    tone: "x",
    optional: true,
  },
  {
    id: "linkedin",
    category: "social",
    name: "LinkedIn",
    initials: "Li",
    blurb: "Company-page messages for commercial shops. Inquiries become Leads.",
    byoNote: "Agency LinkedIn app. Sign In is free; page inbox stays a partner / paid wall.",
    tone: "linkedin",
    optional: true,
  },
  {
    id: "twilio",
    category: "phone_sms",
    name: "Twilio",
    initials: "Tw",
    blurb: "Agency SMS vendor for logged texts. FitFirst does not buy a number.",
    byoNote: "Agency pays the SMS vendor. No Twilio project, SID, or API key is stored.",
    tone: "sms",
    adminGated: true,
  },
  {
    id: "eight_by_eight",
    category: "phone_sms",
    name: "8x8",
    initials: "8x",
    blurb: "Phone and SMS provider. Agency 8x8 seat for logged calls and texts.",
    byoNote: "Agency pays 8x8. FitFirst does not buy a number or store an API key.",
    tone: "sms",
    adminGated: true,
  },
  {
    id: "ringcentral",
    category: "phone_sms",
    name: "RingCentral",
    initials: "Rc",
    blurb: "Agency RingCentral line for logged calls and texts.",
    byoNote: "Agency pays RingCentral. Desk stays a call log, not a softphone.",
    tone: "sms",
    optional: true,
  },
  {
    id: "lightspeed_voice",
    category: "phone_sms",
    name: "Lightspeed Voice",
    initials: "Lv",
    blurb: "Optional insurance-agency voice platform.",
    byoNote: "Agency pays Lightspeed. Skip if SMS is already connected.",
    tone: "sms",
    optional: true,
  },
  {
    id: "docusign",
    category: "esign",
    name: "DocuSign",
    initials: "Ds",
    blurb: "Connect a free DocuSign developer sandbox. Envelope send from Deal stays later.",
    byoNote: "Agency DocuSign sandbox. OAuth completes on account-d. Production keys are out of scope.",
    tone: "esign",
    adminGated: true,
  },
  {
    id: "dropbox_sign",
    category: "esign",
    name: "Dropbox Sign",
    initials: "Hx",
    blurb: "HelloSign / Dropbox Sign for the same signed-app packet.",
    byoNote: "Agency Dropbox Sign plan. No document leaves the desk.",
    tone: "esign",
    adminGated: true,
  },
  {
    id: "ezlynx",
    category: "rater",
    name: "EZLynx",
    initials: "EZ",
    blurb: "Agency EZLynx seat. Chrome Fill / Super-Copy stay copy-from-the-sheet.",
    byoNote: "Agency pays EZLynx. FitFirst does not call the rater or store a login.",
    tone: "rater",
    adminGated: true,
  },
  {
    id: "quoterush",
    category: "rater",
    name: "QuoteRush",
    initials: "QR",
    blurb: "Agency QuoteRush seat for the same paste-into-rater path.",
    byoNote: "Agency pays QuoteRush. No rater API and no carrier portal macros.",
    tone: "rater",
    adminGated: true,
  },
  {
    id: "mailchimp",
    category: "campaigns",
    name: "Mailchimp",
    initials: "Mc",
    blurb: "Audience sync and campaign sends from the agency Mailchimp plan.",
    byoNote: "Agency pays Mailchimp. Nothing is pushed in this build.",
    tone: "campaign",
    optional: true,
  },
  {
    id: "constant_contact",
    category: "campaigns",
    name: "Constant Contact",
    initials: "Cc",
    blurb: "Newsletter and drip lists the agency already owns.",
    byoNote: "Agency pays Constant Contact. Connect is a demo toggle.",
    tone: "campaign",
    optional: true,
  },
  {
    id: "sendgrid",
    category: "campaigns",
    name: "SendGrid",
    initials: "Sg",
    blurb: "Transactional and campaign mail through the agency SendGrid account.",
    byoNote: "Agency pays SendGrid. No API key is stored.",
    tone: "campaign",
    optional: true,
  },
  {
    id: "zoom",
    category: "video",
    name: "Zoom",
    initials: "Zm",
    blurb: "Meeting links on calendar events from the agency Zoom account.",
    byoNote: "Agency pays Zoom. No meeting is created from this stub.",
    tone: "video",
    optional: true,
  },
  {
    id: "google_meet",
    category: "video",
    name: "Google Meet",
    initials: "Mt",
    blurb: "Mint a Meet link on calendar events when Google Calendar or Meet is connected.",
    byoNote: "Agency Google Workspace. Meet helper writes the URL onto the desk event.",
    tone: "video",
    optional: true,
  },
  {
    id: "healthsherpa_medicare",
    category: "health_enrollment",
    name: "HealthSherpa Medicare",
    initials: "HS",
    blurb: "CRM contact sync, quote redirect, and enrollment webhooks. Agency HealthSherpa seat — no FitFirst fee.",
    byoNote:
      "Agency pays HealthSherpa (or uses a partner seat). Medicare API key lives in Developer Hub → API vault. Manual enrollments may not fire the webhook.",
    tone: "health",
    adminGated: true,
  },
  {
    id: "healthsherpa_aca",
    category: "health_enrollment",
    name: "HealthSherpa Marketplace / ACA",
    initials: "HA",
    blurb: "Same HealthSherpa integration as Medicare: partner key, Marketplace handoff, shared enrollment webhook.",
    byoNote:
      "Agency pays HealthSherpa for Marketplace / ICHRA partner access. FitFirst does not quote ACA inside the desk. Same inbound webhook as Medicare.",
    tone: "health",
    adminGated: true,
    optional: true,
  },
];

export const CONNECT_HUB_SECTIONS = [
  {
    id: "inbox",
    title: "Google, Outlook, Zoho",
    blurb: "Inbox and calendar the agency already pays for. Gmail, Yahoo, Google Calendar, and Outlook Calendar open real OAuth.",
    providerIds: [
      "gmail",
      "outlook",
      "zoho_mail",
      "yahoo",
      "google_calendar",
      "outlook_calendar",
      "zoho_calendar",
    ] as const,
  },
  {
    id: "social",
    title: "Facebook, Instagram, GBP",
    blurb: "Facebook and Instagram are one-click on FitFirst’s Meta app. GBP stays Admin-gated.",
    providerIds: ["facebook", "instagram", "google_business_profile"] as const,
  },
  {
    id: "sms",
    title: "SMS",
    blurb: "Logged texts only. FitFirst does not buy a number or call Twilio.",
    providerIds: ["eight_by_eight", "twilio"] as const,
  },
  {
    id: "esign",
    title: "E-sign",
    blurb: "DocuSign sandbox OAuth from Settings. Signed apps still return on the Deal. No production envelope is sent.",
    providerIds: ["docusign", "dropbox_sign"] as const,
  },
  {
    id: "rater",
    title: "Rater",
    blurb: "EZLynx and QuoteRush seats. Super-Copy is still copy-from-the-sheet.",
    providerIds: ["ezlynx", "quoterush"] as const,
  },
] as const;

export type ConnectHubSectionId = (typeof CONNECT_HUB_SECTIONS)[number]["id"];

export const FEATURED_CONNECT_IDS = CONNECT_HUB_SECTIONS.flatMap((section) => [
  ...section.providerIds,
]);

export function isIntegrationProviderId(value: string): value is IntegrationProviderId {
  return (INTEGRATION_PROVIDER_IDS as readonly string[]).includes(value);
}

export function getIntegrationProvider(id: IntegrationProviderId): IntegrationProvider {
  const row = INTEGRATION_PROVIDERS.find((item) => item.id === id);
  if (!row) throw new Error(`Unknown integration provider: ${id}`);
  return row;
}

export function providersIn(category: IntegrationCategory): IntegrationProvider[] {
  return INTEGRATION_PROVIDERS.filter((item) => item.category === category);
}

/** OAuth / vendor APIs stay closed. This only names the connector for later. */
export function connectIntegrationStub(id: IntegrationProviderId): NotImplementedResult {
  const provider = getIntegrationProvider(id);
  return notImplemented(`${provider.name} connect`);
}

export function stubAccountLabel(id: IntegrationProviderId): string {
  switch (id) {
    case "gmail":
      return "desk@javiergarcia.example";
    case "outlook":
      return "desk@javiergarcia.onmicrosoft.example";
    case "zoho_mail":
      return "desk@zoho.example";
    case "yahoo":
      return "desk@yahoo.example";
    case "google_calendar":
      return "agency@calendar.stub";
    case "outlook_calendar":
      return "agency@outlook.calendar.stub";
    case "zoho_calendar":
      return "agency@zoho.calendar.stub";
    case "twilio":
      return "FitFirst main · SMS demo";
    case "eight_by_eight":
      return "FitFirst main · 8x8 stub";
    case "ringcentral":
      return "FitFirst main · RingCentral stub";
    case "lightspeed_voice":
      return "FitFirst main · Lightspeed stub";
    case "mailchimp":
      return "Agency Mailchimp · stub";
    case "constant_contact":
      return "Agency Constant Contact · stub";
    case "sendgrid":
      return "Agency SendGrid · stub";
    case "zoom":
      return "agency@zoom.stub";
    case "google_meet":
      return "agency@meet.stub";
    case "docusign":
      return "Agency DocuSign · demo";
    case "dropbox_sign":
      return "Agency Dropbox Sign · demo";
    case "ezlynx":
      return "FitFirst · EZLynx seat demo";
    case "quoterush":
      return "FitFirst · QuoteRush seat demo";
    case "facebook":
      return "FitFirst Insurance · Facebook Page stub";
    case "instagram":
      return "@fitfirst.insurance · Instagram stub";
    case "x":
      return "@FitFirstFL · X stub";
    case "linkedin":
      return "FitFirst Insurance · LinkedIn stub";
    case "google_business_profile":
      return "FitFirst Insurance · Palm Bay GBP stub";
    case "healthsherpa_medicare":
      return "Agency HealthSherpa Medicare";
    case "healthsherpa_aca":
      return "Agency HealthSherpa Marketplace";
  }
}

export function featuredConnectIds(): IntegrationProviderId[] {
  return [...FEATURED_CONNECT_IDS];
}

export function isFeaturedConnectId(id: string): boolean {
  return FEATURED_CONNECT_IDS.includes(id as (typeof FEATURED_CONNECT_IDS)[number]);
}
