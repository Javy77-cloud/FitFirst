export const SETTINGS_NAV_IDS = [
  "overview",
  "agency-people",
  "desk-phone",
  "connect",
  "automations-dev",
  "developer-hub",
  "billing",
  "import-export",
  "import",
  "people",
  "agents",
  "communications",
  "email",
  "sms",
  "outbound",
  "phone",
  "video",
  "integrations",
  "carrier-download",
  "social",
  "esign",
  "lists",
  "lines",
  "field-builder",
  "tags",
  "templates",
  "triggers",
  "developer",
  "automations",
  "playbooks",
  "sequences",
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
  "functions",
  "api-keys",
  "webhooks",
  "connections",
  "macros",
  "custom-buttons",
  "client-scripts",
  "widgets",
  "dev-functions",
  "dev-api",
  "dev-webhooks",
  "dev-connections",
  "dev-macros",
  "dev-buttons",
  "dev-scripts",
  "dev-widgets",
] as const;

export type SettingsNavId = (typeof SETTINGS_NAV_IDS)[number];

export type SettingsGroupIcon =
  | "agency"
  | "phone"
  | "connect"
  | "automations"
  | "developer"
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

/** Zoho-like Setup categories. Every href is a route that already exists. */
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
      { id: "field-builder", href: "/settings/field-builder", label: "Deal field builder", hint: "Per-LOB layouts" },
      { id: "tags", href: "/settings/tags", label: "Tags", hint: "Rename · merge · delete" },
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
      { id: "sms", href: "/settings/sms", label: "SMS", hint: "Connect Twilio" },
      { id: "outbound", href: "/settings/outbound", label: "Outbound queue", hint: "Email / SMS intent" },
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
      { id: "carrier-download", href: "/settings/carrier-download", label: "IVANS / AL3", hint: "Not connected" },
      { id: "social", href: "/settings/social", label: "Social / GBP", hint: "BYO OAuth · X paid wall" },
      { id: "esign", href: "/settings/esign", label: "E-sign", hint: "DocuSign / Dropbox Sign" },
    ],
  },
  {
    id: "automations-dev",
    href: "/automations",
    label: "Automations & Developer",
    hint: "Playbooks, macros, developer tools",
    blurb: "One Setup card for the Automations hub and Developer Hub. Platform macros live once at /automations/macros (Settings editor at /settings/developer-hub/macros) — same desk_macros rows. No second Macros card.",
    icon: "automations",
    children: [
      { id: "automations", href: "/automations", label: "Automations hub", hint: "Playbooks · sequences · tools" },
      { id: "playbooks", href: "/automations/playbooks", label: "Playbooks", hint: "Tasks + Alerts" },
      { id: "sequences", href: "/automations/sequences", label: "Sequences", hint: "Nurture drafts" },
      { id: "templates", href: "/automations/templates", label: "Templates", hint: "EN/ES preview" },
      { id: "triggers", href: "/settings/email-triggers", label: "Email triggers", hint: "Won-date jobs" },
      { id: "macros", href: "/automations/macros", label: "Macros", hint: "Manual run" },
      { id: "functions", href: "/automations/functions", label: "Functions", hint: "Test + REST" },
      { id: "developer-hub", href: "/settings/developer-hub", label: "Developer Hub", hint: "API · webhooks · widgets" },
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
      { id: "import", href: "/settings/import", label: "Import", hint: "CSV + Zoho JSONL" },
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
      { id: "billing", href: "/settings/billing", label: "Billing", hint: "No invoicing here" },
    ],
  },
];

/** Old Developer Hub group ids + /settings/developer* pages fold into Automations & Developer. */
const AUTOMATIONS_DEVELOPER_ALIASES = new Set<SettingsNavId>([
  "developer",
  "developer-hub",
  "functions",
  "api-keys",
  "webhooks",
  "connections",
  "macros",
  "custom-buttons",
  "client-scripts",
  "widgets",
  "dev-functions",
  "dev-api",
  "dev-webhooks",
  "dev-connections",
  "dev-macros",
  "dev-buttons",
  "dev-scripts",
  "dev-widgets",
  "playbooks",
  "sequences",
]);

const SETTINGS_CHILD_ALIASES: Partial<Record<SettingsNavId, SettingsNavId>> = {
  developer: "developer-hub",
  "dev-macros": "macros",
  "dev-functions": "functions",
  "dev-api": "developer-hub",
  "dev-webhooks": "developer-hub",
  "dev-connections": "developer-hub",
  "dev-buttons": "developer-hub",
  "dev-scripts": "developer-hub",
  "dev-widgets": "developer-hub",
  "api-keys": "developer-hub",
  webhooks: "developer-hub",
  connections: "developer-hub",
  "custom-buttons": "developer-hub",
  "client-scripts": "developer-hub",
  widgets: "developer-hub",
};

export function settingsGroupFor(current: SettingsNavId): SettingsNavId {
  if (AUTOMATIONS_DEVELOPER_ALIASES.has(current)) return "automations-dev";
  if (current === "overview") return "overview";
  if (current === "people") return "agency-people";
  if (current === "account") return "security";
  if (current === "prefs") return "desk-phone";
  const group = SETTINGS_NAV.find(
    (item) => item.id === current || item.children.some((child) => child.id === current),
  );
  return group?.id ?? "overview";
}

/** Highlight the one visible child when an alias page is open (macros, not a second Macros row). */
export function settingsChildFor(current: SettingsNavId): SettingsNavId {
  return SETTINGS_CHILD_ALIASES[current] ?? current;
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
  "/settings/field-builder",
  "/settings/tags",
  "/settings/email-signatures",
  "/settings/master-risk",
  "/settings/communications",
  "/settings/email",
  "/settings/sms",
  "/settings/outbound",
  "/settings/phone",
  "/settings/video",
  "/settings/my-desk",
  "/settings/integrations",
  "/settings/carrier-download",
  "/settings/social",
  "/settings/esign",
  "/automations",
  "/automations/playbooks",
  "/automations/sequences",
  "/automations/templates",
  "/automations/macros",
  "/automations/functions",
  "/settings/email-templates",
  "/settings/email-triggers",
  "/settings/developer-hub",
  "/settings/developer-hub/functions",
  "/settings/developer-hub/api",
  "/settings/developer-hub/webhooks",
  "/settings/developer-hub/connections",
  "/settings/developer-hub/macros",
  "/settings/developer-hub/custom-buttons",
  "/settings/developer-hub/client-scripts",
  "/settings/developer-hub/widgets",
  "/settings/profile",
  "/settings/security",
  "/compliance",
  "/settings/billing",
  "/settings/import-export",
  "/settings/import",
  "/settings/export",
] as const;
