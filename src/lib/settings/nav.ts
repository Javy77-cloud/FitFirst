export const SETTINGS_NAV_IDS = [
  "overview",
  "agency-people",
  "desk-phone",
  "connect",
  "automations-dev",
  "billing",
  "import-export",
  "import",
  "people",
  "agents",
  "communications",
  "email",
  "sms",
  "phone",
  "video",
  "integrations",
  "social",
  "esign",
  "lists",
  "lines",
  "templates",
  "triggers",
  "developer",
  "automations",
  "agency",
  "offices",
  "territories",
  "routing",
  "signatures",
  "export",
  "prefs",
  "my-desk",
  "account",
  "profile",
  "security",
  "recovery",
  "compliance",
  "master-risk",
] as const;

export type SettingsNavId = (typeof SETTINGS_NAV_IDS)[number];

export type SettingsGroupIcon =
  | "agency"
  | "phone"
  | "connect"
  | "automations"
  | "security"
  | "billing"
  | "import-export";

export type SettingsNavChild = {
  id: SettingsNavId;
  href: string;
  label: string;
  hint: string;
};

export type SettingsNavGroup = {
  id: SettingsNavId;
  href: string;
  label: string;
  hint: string;
  blurb: string;
  icon: SettingsGroupIcon;
  badge?: "Admin";
  children: SettingsNavChild[];
};

/** Zoho-like Setup categories. Every href is a route that already exists (or /settings/billing stub). */
export const SETTINGS_NAV: SettingsNavGroup[] = [
  {
    id: "agency-people",
    href: "/settings/agency",
    label: "Agency & People",
    hint: "Brand, desks, producers",
    blurb: "Admin chrome every agent inherits: name, offices, territories, and who can sign in.",
    icon: "agency",
    badge: "Admin",
    children: [
      { id: "agency", href: "/settings/agency", label: "Agency chrome", hint: "Name + logo" },
      { id: "agents", href: "/settings/agents", label: "People / Agents", hint: "Create, freeze, notify" },
      { id: "offices", href: "/settings/offices", label: "Offices", hint: "Desks + states" },
      { id: "territories", href: "/settings/territories", label: "Territories", hint: "Geo books" },
      { id: "routing", href: "/settings/routing", label: "Lead routing", hint: "Territory · line · capacity" },
      { id: "lines", href: "/settings/lines", label: "Lines of business", hint: "Life / Health" },
      { id: "lists", href: "/settings/lists", label: "Global lists", hint: "Books and picklists" },
      { id: "signatures", href: "/settings/email-signatures", label: "Signatures", hint: "Client close" },
      { id: "master-risk", href: "/settings/master-risk", label: "Master risk", hint: "Admin appetite worksheet" },
    ],
  },
  {
    id: "desk-phone",
    href: "/settings/communications",
    label: "Desk & Phone",
    hint: "Email, SMS, phone, video",
    blurb: "Channels this desk uses. Phone line is Admin. My desk prefs stay on this login.",
    icon: "phone",
    badge: "Admin",
    children: [
      { id: "communications", href: "/settings/communications", label: "Communications", hint: "Email, SMS, phone, video" },
      { id: "email", href: "/settings/email", label: "Email", hint: "Inbox + templates" },
      { id: "sms", href: "/settings/sms", label: "SMS", hint: "Twilio stub" },
      { id: "phone", href: "/settings/phone", label: "Phone", hint: "Call log line" },
      { id: "video", href: "/settings/video", label: "Video", hint: "Zoom / Meet" },
      { id: "my-desk", href: "/settings/my-desk", label: "My desk", hint: "This login only" },
    ],
  },
  {
    id: "connect",
    href: "/settings/integrations",
    label: "Integrations / Connect",
    hint: "BYO catalog",
    blurb: "Gmail, Twilio, Zoom, Social / GBP, e-sign. Agency pays. No Zoho in the catalog.",
    icon: "connect",
    children: [
      { id: "integrations", href: "/settings/integrations", label: "Catalog", hint: "BYO providers" },
      { id: "social", href: "/settings/social", label: "Social / GBP", hint: "FB · IG · X · LI · GBP" },
      { id: "esign", href: "/settings/esign", label: "E-sign", hint: "DocuSign / Dropbox Sign" },
    ],
  },
  {
    id: "automations-dev",
    href: "/automations",
    label: "Automations & Developer",
    hint: "Campaigns, templates, triggers",
    blurb: "Automations hub is live. Developer Hub routes are not on this desk yet — use the hub and trigger library.",
    icon: "automations",
    children: [
      { id: "automations", href: "/automations", label: "Automations hub", hint: "Campaigns · SMS · builder" },
      { id: "templates", href: "/settings/email-templates", label: "Email templates", hint: "Client mail" },
      { id: "triggers", href: "/settings/email-triggers", label: "Triggers", hint: "Won-date jobs" },
      {
        id: "developer",
        href: "/automations",
        label: "Developer Hub",
        hint: "Placeholder — hub pages land with that slice",
      },
    ],
  },
  {
    id: "security",
    href: "/settings/security",
    label: "Security",
    hint: "Profile, 2FA, recovery",
    blurb: "Password and 2FA on this login. Admin recovery and the E&O trail sit here.",
    icon: "security",
    children: [
      { id: "profile", href: "/settings/profile", label: "Profile", hint: "Name on this login" },
      { id: "security", href: "/settings/security", label: "Password and 2FA", hint: "Enroll or recover" },
      { id: "recovery", href: "/settings/agents", label: "Recovery", hint: "Admin recovery actions" },
      { id: "compliance", href: "/compliance", label: "Compliance / E&O", hint: "Audit + flags" },
    ],
  },
  {
    id: "import-export",
    href: "/settings/import-export",
    label: "Import / Export",
    hint: "CSV + Open API",
    blurb: "Admin book move: contacts, businesses, policies, carriers, leads, deals, plus related packs.",
    icon: "import-export",
    badge: "Admin",
    children: [
      { id: "import-export", href: "/settings/import-export", label: "Hub", hint: "All packs" },
      { id: "import", href: "/settings/import", label: "Import", hint: "CSV stub" },
      { id: "export", href: "/settings/export", label: "Export", hint: "CSV of the book" },
    ],
  },
  {
    id: "billing",
    href: "/settings/billing",
    label: "Billing",
    hint: "No SaaS invoicing",
    blurb: "FitFirst does not bill producers from this desk. Book CSV lives under Import / Export.",
    icon: "billing",
    badge: "Admin",
    children: [
      { id: "billing", href: "/settings/billing", label: "Billing stub", hint: "No invoicing here" },
    ],
  },
];

export function settingsGroupFor(current: SettingsNavId): SettingsNavId {
  if (current === "overview") return "overview";
  if (current === "people" || current === "account" || current === "prefs") {
    if (current === "people") return "agency-people";
    if (current === "account") return "security";
    return "desk-phone";
  }
  const group = SETTINGS_NAV.find(
    (item) => item.id === current || item.children.some((child) => child.id === current),
  );
  return group?.id ?? "overview";
}

export const SETTINGS_KNOWN_HREFS = [
  "/settings",
  "/settings/agency",
  "/settings/agents",
  "/settings/offices",
  "/settings/territories",
  "/settings/routing",
  "/settings/lines",
  "/settings/lists",
  "/settings/email-signatures",
  "/settings/master-risk",
  "/settings/communications",
  "/settings/email",
  "/settings/sms",
  "/settings/phone",
  "/settings/video",
  "/settings/my-desk",
  "/settings/integrations",
  "/settings/social",
  "/settings/esign",
  "/automations",
  "/settings/email-templates",
  "/settings/email-triggers",
  "/settings/profile",
  "/settings/security",
  "/compliance",
  "/settings/billing",
  "/settings/import-export",
  "/settings/import",
  "/settings/export",
] as const;
