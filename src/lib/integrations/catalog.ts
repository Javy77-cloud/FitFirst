import { notImplemented, type NotImplementedResult } from "./types";

export const INTEGRATION_CATEGORIES = [
  "email",
  "calendar",
  "social",
  "phone_sms",
  "esign",
  "rater",
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
  campaigns: "Campaigns",
  video: "Video",
};

export const INTEGRATION_CATEGORY_BLURB: Record<IntegrationCategory, string> = {
  email: "Agency inbox. Google, Outlook, or Zoho Mail — FitFirst does not host mail.",
  calendar: "Desk calendar stays here. Google, Outlook, and Zoho Calendar are demo plugs.",
  social:
    "Facebook, Instagram, and Google Business Profile. GBP stays Admin-gated. FitFirst does not buy ads or API seats.",
  phone_sms: "Call log and SMS. Twilio, RingCentral, or Lightspeed Voice. Nothing dials from this build.",
  esign: "In-desk stub on Deal or Policy. Finish-line DocuSign / Dropbox Sign stay parked. No envelope leaves the desk.",
  rater: "EZLynx and QuoteRush seats the agency already pays. Super-Copy stays copy-from-the-sheet — no rater API.",
  campaigns: "Bulk and drip later. Mailchimp, Constant Contact, or SendGrid — agency pays the vendor.",
  video: "Meeting links on the calendar. Zoom or Google Meet — agency account.",
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

export function connectionStatusLabel(connected: boolean): "Connected (demo)" | "Not connected" {
  return connected ? "Connected (demo)" : "Not connected";
}

export const INTEGRATION_PROVIDERS: IntegrationProvider[] = [
  {
    id: "gmail",
    category: "email",
    name: "Gmail / Google",
    initials: "Gm",
    blurb: "Agency Google Workspace inbox for client mail.",
    byoNote: "Agency pays Google Workspace. FitFirst does not host mail.",
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
    blurb: "Yahoo inbox for agencies that still send from there.",
    byoNote: "Agency Yahoo account. IMAP/OAuth lands later.",
    tone: "yahoo",
    optional: true,
  },
  {
    id: "google_calendar",
    category: "calendar",
    name: "Google Calendar",
    initials: "Gc",
    blurb: "Two-way demo plug beside the desk month / week / day board.",
    byoNote: "Agency Google account. OAuth does not open Google.",
    tone: "google",
  },
  {
    id: "outlook_calendar",
    category: "calendar",
    name: "Outlook Calendar",
    initials: "Oc",
    blurb: "Microsoft 365 calendar next to the in-desk board.",
    byoNote: "Agency Microsoft 365. No live Graph sync.",
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
    byoNote: "Agency Facebook Page. OAuth does not open Meta. No ad spend.",
    tone: "facebook",
  },
  {
    id: "instagram",
    category: "social",
    name: "Instagram",
    initials: "Ig",
    blurb: "DMs and comment asks for a quote. Same social → Lead path.",
    byoNote: "Agency Instagram. Connect is a demo toggle. Nothing syncs from Meta.",
    tone: "instagram",
  },
  {
    id: "google_business_profile",
    category: "social",
    name: "Google Business Profile",
    initials: "Gb",
    blurb: "Listing messages and views. Agents monitor only after Admin allows it.",
    byoNote: "Agency Google Business Profile. Admin approval required before agents monitor.",
    tone: "gbp",
    adminGated: true,
  },
  {
    id: "x",
    category: "social",
    name: "X (Twitter)",
    initials: "X",
    blurb: "Mentions and DMs that ask for coverage. Pulse is demo numbers after connect.",
    byoNote: "Agency X account. No live Twitter API.",
    tone: "x",
    optional: true,
  },
  {
    id: "linkedin",
    category: "social",
    name: "LinkedIn",
    initials: "Li",
    blurb: "Company-page messages for commercial shops. Inquiries become Leads.",
    byoNote: "Agency LinkedIn Page. No Sales Navigator seat from FitFirst.",
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
    blurb: "Send a dec or application packet for signature.",
    byoNote: "Agency DocuSign plan. Envelope send stays not_implemented.",
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
    blurb: "Meet links beside Google Calendar on the desk board.",
    byoNote: "Agency Google Workspace. Meet is not opened from FitFirst.",
    tone: "video",
    optional: true,
  },
];

export const CONNECT_HUB_SECTIONS = [
  {
    id: "inbox",
    title: "Google, Outlook, Zoho",
    blurb: "Inbox and calendar the agency already pays for. No OAuth window opens.",
    providerIds: [
      "gmail",
      "outlook",
      "zoho_mail",
      "google_calendar",
      "outlook_calendar",
      "zoho_calendar",
    ] as const,
  },
  {
    id: "social",
    title: "Facebook, Instagram, GBP",
    blurb: "Social plugs and Google Business Profile. GBP stays Admin-gated.",
    providerIds: ["facebook", "instagram", "google_business_profile"] as const,
  },
  {
    id: "sms",
    title: "SMS",
    blurb: "Logged texts only. FitFirst does not buy a number or call Twilio.",
    providerIds: ["twilio"] as const,
  },
  {
    id: "esign",
    title: "E-sign",
    blurb: "Signed apps return on the Deal. No envelope is sent from Settings.",
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
  }
}

export function featuredConnectIds(): IntegrationProviderId[] {
  return [...FEATURED_CONNECT_IDS];
}

export function isFeaturedConnectId(id: string): boolean {
  return FEATURED_CONNECT_IDS.includes(id as (typeof FEATURED_CONNECT_IDS)[number]);
}
