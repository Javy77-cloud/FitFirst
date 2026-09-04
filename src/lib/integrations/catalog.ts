import { notImplemented, type NotImplementedResult } from "./types";

export const INTEGRATION_CATEGORIES = [
  "email",
  "campaigns",
  "calendar",
  "phone_sms",
  "video",
  "esign",
] as const;

export type IntegrationCategory = (typeof INTEGRATION_CATEGORIES)[number];

export const INTEGRATION_CATEGORY_LABEL: Record<IntegrationCategory, string> = {
  email: "Email",
  campaigns: "Campaigns",
  calendar: "Calendar",
  phone_sms: "Phone / SMS",
  video: "Video",
  esign: "E-sign",
};

export const INTEGRATION_CATEGORY_BLURB: Record<IntegrationCategory, string> = {
  email: "Agency inbox for client mail. Connect Gmail, Outlook, or Yahoo — no FitFirst mailbox.",
  campaigns: "Bulk and drip later. Mailchimp, Constant Contact, or SendGrid — agency pays the vendor.",
  calendar: "Desk calendar stays in FitFirst. Google and Outlook sync are stubs.",
  phone_sms: "Call log and SMS. Twilio, RingCentral, or Lightspeed Voice. Nothing dials from this build.",
  video: "Meeting links on the calendar. Zoom or Google Meet — agency account.",
  esign: "Send a packet for signature. DocuSign or Dropbox Sign. No envelope leaves the desk today.",
};

export const INTEGRATION_PROVIDER_IDS = [
  "gmail",
  "outlook",
  "yahoo",
  "mailchimp",
  "constant_contact",
  "sendgrid",
  "google_calendar",
  "outlook_calendar",
  "twilio",
  "ringcentral",
  "lightspeed_voice",
  "zoom",
  "google_meet",
  "docusign",
  "dropbox_sign",
] as const;

export type IntegrationProviderId = (typeof INTEGRATION_PROVIDER_IDS)[number];

export type IntegrationProvider = {
  id: IntegrationProviderId;
  category: IntegrationCategory;
  name: string;
  initials: string;
  blurb: string;
  byoNote: string;
  optional?: boolean;
};

export const INTEGRATION_PROVIDERS: IntegrationProvider[] = [
  {
    id: "gmail",
    category: "email",
    name: "Gmail / Google",
    initials: "Gm",
    blurb: "Send and receive from the agency Google Workspace inbox.",
    byoNote: "Agency pays Google Workspace. FitFirst does not host mail.",
  },
  {
    id: "outlook",
    category: "email",
    name: "Outlook / Microsoft 365",
    initials: "Ol",
    blurb: "Microsoft 365 mailbox for client threads.",
    byoNote: "Agency pays Microsoft 365. No Graph tokens stored here.",
  },
  {
    id: "yahoo",
    category: "email",
    name: "Yahoo Mail",
    initials: "Yh",
    blurb: "Yahoo inbox for agencies that still send from there.",
    byoNote: "Agency Yahoo account. IMAP/OAuth lands later.",
  },
  {
    id: "mailchimp",
    category: "campaigns",
    name: "Mailchimp",
    initials: "Mc",
    blurb: "Audience sync and campaign sends from the agency Mailchimp plan.",
    byoNote: "Agency pays Mailchimp. Nothing is pushed in this build.",
  },
  {
    id: "constant_contact",
    category: "campaigns",
    name: "Constant Contact",
    initials: "Cc",
    blurb: "Newsletter and drip lists the agency already owns.",
    byoNote: "Agency pays Constant Contact. Connect is a setting stub.",
  },
  {
    id: "sendgrid",
    category: "campaigns",
    name: "SendGrid",
    initials: "Sg",
    blurb: "Transactional and campaign mail through the agency SendGrid account.",
    byoNote: "Agency pays Twilio SendGrid. No API key is stored.",
  },
  {
    id: "google_calendar",
    category: "calendar",
    name: "Google Calendar",
    initials: "Gc",
    blurb: "Two-way stub with the desk month / week / day board.",
    byoNote: "Agency Google account. OAuth does not open Google.",
  },
  {
    id: "outlook_calendar",
    category: "calendar",
    name: "Outlook Calendar",
    initials: "Oc",
    blurb: "Microsoft 365 calendar next to the in-desk board.",
    byoNote: "Agency Microsoft 365. No live Graph sync.",
  },
  {
    id: "twilio",
    category: "phone_sms",
    name: "Twilio",
    initials: "Tw",
    blurb: "Voice trunk and SMS from one agency Twilio project.",
    byoNote: "Agency pays Twilio. FitFirst does not buy numbers or store SIDs.",
  },
  {
    id: "ringcentral",
    category: "phone_sms",
    name: "RingCentral",
    initials: "Rc",
    blurb: "Agency RingCentral line for logged calls and texts.",
    byoNote: "Agency pays RingCentral. Desk stays a call log, not a softphone.",
  },
  {
    id: "lightspeed_voice",
    category: "phone_sms",
    name: "Lightspeed Voice",
    initials: "Lv",
    blurb: "Optional insurance-agency voice platform.",
    byoNote: "Agency pays Lightspeed. Optional — skip if you use Twilio or RingCentral.",
    optional: true,
  },
  {
    id: "zoom",
    category: "video",
    name: "Zoom",
    initials: "Zm",
    blurb: "Meeting links on calendar events from the agency Zoom account.",
    byoNote: "Agency pays Zoom. No meeting is created from this stub.",
  },
  {
    id: "google_meet",
    category: "video",
    name: "Google Meet",
    initials: "Mt",
    blurb: "Meet links beside Google Calendar on the desk board.",
    byoNote: "Agency Google Workspace. Meet is not opened from FitFirst.",
  },
  {
    id: "docusign",
    category: "esign",
    name: "DocuSign",
    initials: "Ds",
    blurb: "Send a dec or application packet for signature.",
    byoNote: "Agency DocuSign plan. Envelope send stays not_implemented.",
  },
  {
    id: "dropbox_sign",
    category: "esign",
    name: "Dropbox Sign",
    initials: "Hx",
    blurb: "HelloSign / Dropbox Sign for the same packet flow.",
    byoNote: "Agency Dropbox Sign plan. No document leaves the desk.",
  },
];

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
    case "yahoo":
      return "desk@yahoo.example";
    case "google_calendar":
      return "agency@calendar.stub";
    case "outlook_calendar":
      return "agency@outlook.calendar.stub";
    case "twilio":
      return "FitFirst main · Twilio stub";
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
      return "Agency DocuSign · stub";
    case "dropbox_sign":
      return "Agency Dropbox Sign · stub";
  }
}
