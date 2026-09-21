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
  "people-access",
  "book-desk",
  "growth",
  "roles-access",
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
  "email-templates",
  "field-builder",
  "policy-labels",
  "agent-policy-access",
  "picklists",
  "tags",
  "templates",
  "documents-library",
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
  "api-vault",
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
  "missing-questions",
  "carrier-login-issues",
] as const;

export type SettingsNavId = (typeof SETTINGS_NAV_IDS)[number];

export type SettingsGroupIcon =
  | "agency"
  | "people"
  | "phone"
  | "book"
  | "growth"
  | "connect"
  | "automations"
  | "developer"
  | "security"
  | "billing"
  | "import-export"
  | "templates";

export type SettingsNavChild = {
  id: SettingsNavId;
  href: string;
  label: string;
  hint: string;
  aliases?: string[];
  /** Macros / functions / developer — not agent-primary. */
  advanced?: boolean;
};

export type SettingsNavGroup = {
  id: SettingsNavId;
  href: string;
  label: string;
  hint: string;
  blurb: string;
  icon: SettingsGroupIcon;
  badge?: "Admin";
  /** Thin groups stay in the rail but off the 8 home umbrellas. */
  thin?: boolean;
  aliases?: string[];
  children: SettingsNavChild[];
};

/** FitFirst Setup umbrellas — not a Zoho clone. Every href is a live route. */
export const SETTINGS_NAV: SettingsNavGroup[] = [
  {
    id: "agency",
    href: "/settings/agency",
    label: "Agency",
    hint: "Chrome, lines, desks",
    blurb: "Admin chrome every agent inherits: name, lines of business, offices, territories, and routing.",
    icon: "agency",
    badge: "Admin",
    aliases: ["Agency & People", "brand", "logo"],
    children: [
      { id: "agency", href: "/settings/agency", label: "Agency chrome", hint: "Name + logo" },
      { id: "lines", href: "/settings/lines", label: "Lines of business", hint: "Agency catalog" },
      { id: "offices", href: "/settings/offices", label: "Offices", hint: "Desks + states" },
      { id: "territories", href: "/settings/territories", label: "Territories", hint: "Geo books" },
      { id: "routing", href: "/settings/routing", label: "Lead routing", hint: "Territory · line · capacity" },
      { id: "lists", href: "/settings/lists", label: "Global lists", hint: "Books and picklists" },
      { id: "signatures", href: "/settings/email-signatures", label: "Email signatures", hint: "Agency close" },
      { id: "master-risk", href: "/settings/master-risk", label: "Master risk", hint: "Admin appetite worksheet" },
    ],
  },
  {
    id: "people-access",
    href: "/settings/roles-access",
    label: "People & access",
    hint: "Agents, roles, toggles",
    blurb: "Who can sign in, the roles matrix, and what agents may do on this desk — including agency-book widgets.",
    icon: "people",
    badge: "Admin",
    aliases: ["credentials", "roles", "permissions", "agency-people", "people"],
    children: [
      { id: "agents", href: "/settings/agents", label: "People / Agents", hint: "Create, freeze, notify" },
      {
        id: "roles-access",
        href: "/settings/roles-access",
        label: "Roles & access",
        hint: "Matrix + agency toggles",
        aliases: ["credentials", "permissions", "Google", "macros", "team"],
      },
      { id: "agent-policy-access", href: "/settings/agent-policy-access", label: "Agent Policy Access", hint: "Read / write gates" },
    ],
  },
  {
    id: "communications",
    href: "/settings/communications",
    label: "Communications",
    hint: "Email, SMS, phone, video",
    blurb: "Channels this desk uses — email, SMS, phone, video, templates, and calendar prefs. Phone line is Admin.",
    icon: "phone",
    badge: "Admin",
    aliases: ["Desk & Phone", "desk", "inbox", "Google"],
    children: [
      { id: "communications", href: "/settings/communications", label: "Communications hub", hint: "Email, SMS, phone, video" },
      {
        id: "email",
        href: "/settings/email",
        label: "Email",
        hint: "Gmail + Yahoo inbox",
        aliases: ["Google", "Gmail", "Workspace", "inbox", "mail"],
      },
      { id: "sms", href: "/settings/sms", label: "SMS", hint: "Connect Twilio" },
      { id: "outbound", href: "/settings/outbound", label: "Outbound queue", hint: "Email / SMS intent" },
      { id: "phone", href: "/settings/phone", label: "Phone", hint: "Call log line" },
      {
        id: "video",
        href: "/settings/video",
        label: "Video",
        hint: "Zoom / Meet",
        aliases: ["Google", "Google Meet", "Meet", "Zoom"],
      },
      {
        id: "templates",
        href: "/settings/email-templates",
        label: "Email templates",
        hint: "Admin library",
        aliases: ["Gmail", "mail", "email-templates"],
      },
      {
        id: "prefs",
        href: "/settings/communications",
        label: "Calendar prefs",
        hint: "Sunday tint · holidays",
        aliases: ["Google", "Google Calendar", "Calendar", "holidays"],
      },
    ],
  },
  {
    id: "book-desk",
    href: "/settings/field-builder",
    label: "Book & desk",
    hint: "Layouts, labels, My desk",
    blurb: "How the book looks on every record: field layouts, policy labels, picklists, tags, documents, and this login’s desk.",
    icon: "book",
    children: [
      { id: "field-builder", href: "/settings/field-builder", label: "Field layouts", hint: "Leads · Deals · Policies · Contacts · Accounts · Carriers · Tasks" },
      { id: "policy-labels", href: "/settings/policy-labels", label: "Policy labels", hint: "Auto-name template" },
      { id: "picklists", href: "/settings/picklists", label: "Picklists", hint: "Reusable field options" },
      { id: "tags", href: "/settings/tags", label: "Tags", hint: "Per-module catalog · colors" },
      { id: "my-desk", href: "/settings/my-desk", label: "My desk", hint: "This login only" },
      { id: "documents-library", href: "/documents", label: "Documents library", hint: "Type folders · carriers" },
    ],
  },
  {
    id: "growth",
    href: "/settings/social",
    label: "Growth",
    hint: "Social / GBP",
    blurb: "Agency Social and Google Business Profile. Agents advertise only after Admin approval.",
    icon: "growth",
    aliases: ["Google", "GBP", "Google Business", "Facebook", "Instagram", "LinkedIn", "social"],
    children: [
      {
        id: "social",
        href: "/settings/social",
        label: "Social / GBP",
        hint: "BYO OAuth · X paid wall",
        aliases: ["Google", "GBP", "Google Business", "Facebook", "Instagram", "LinkedIn", "X", "Twitter"],
      },
    ],
  },
  {
    id: "connect",
    href: "/settings/integrations",
    label: "Integrations",
    hint: "BYO catalog",
    blurb: "Gmail, Twilio, Zoom, e-sign, IVANS. Agency pays. No Zoho in the catalog.",
    icon: "connect",
    aliases: ["Connect", "Google", "Gmail", "catalog"],
    children: [
      {
        id: "integrations",
        href: "/settings/integrations",
        label: "Catalog",
        hint: "BYO providers",
        aliases: ["Google", "Gmail", "Twilio", "Connect"],
      },
      { id: "esign", href: "/settings/esign", label: "E-sign", hint: "DocuSign / Dropbox Sign" },
      { id: "carrier-download", href: "/settings/carrier-download", label: "IVANS / AL3", hint: "Not connected" },
    ],
  },
  {
    id: "import-export",
    href: "/settings/import-export",
    label: "Data",
    hint: "CSV + Open API",
    blurb: "Admin book move: contacts, accounts, policies, carriers, leads, deals, plus related packs.",
    icon: "import-export",
    badge: "Admin",
    aliases: ["Import / Export", "CSV", "Zoho JSONL"],
    children: [
      { id: "import-export", href: "/settings/import-export", label: "Hub", hint: "All packs" },
      { id: "import", href: "/settings/import", label: "Import", hint: "CSV + Zoho JSONL" },
      { id: "export", href: "/settings/export", label: "Export", hint: "CSV of the book" },
    ],
  },
  {
    id: "automations-dev",
    href: "/automations",
    label: "Automations & tools",
    hint: "Playbooks first, then admin tools",
    blurb: "Playbooks and sequences first. Macros, functions, and Developer Hub stay under Advanced / Admin — not agent-primary settings.",
    icon: "automations",
    aliases: ["Automations & Developer", "developer", "macros"],
    children: [
      { id: "automations", href: "/automations", label: "Automations hub", hint: "Playbooks · sequences · tools" },
      { id: "playbooks", href: "/automations/playbooks", label: "Playbooks", hint: "Tasks + Alerts" },
      { id: "sequences", href: "/automations/sequences", label: "Sequences", hint: "Nurture drafts" },
      { id: "triggers", href: "/settings/email-triggers", label: "Email triggers", hint: "Won-date jobs" },
      { id: "macros", href: "/automations/macros", label: "Macros", hint: "Manual run · Admin", advanced: true },
      { id: "functions", href: "/automations/functions", label: "Functions", hint: "Test + REST · Admin", advanced: true },
      { id: "developer-hub", href: "/settings/developer-hub", label: "Developer Hub", hint: "API · webhooks · widgets", advanced: true },
      { id: "api-vault", href: "/settings/developer-hub/api-vault", label: "API vault", hint: "FedEx · site developers", advanced: true },
      { id: "missing-questions", href: "/settings/developer-hub/missing-questions", label: "Missing questions", hint: "Carrier field gaps", advanced: true },
      { id: "carrier-login-issues", href: "/settings/developer-hub/carrier-login-issues", label: "Carrier login issues", hint: "Quote-bot auth failures", advanced: true },
    ],
  },
  {
    id: "security",
    href: "/settings/security",
    label: "Security",
    hint: "Profile, 2FA, recovery",
    blurb: "Password and 2FA on this login. Admin recovery and the E&O trail sit here.",
    icon: "security",
    thin: true,
    children: [
      { id: "profile", href: "/settings/profile", label: "Profile", hint: "Name on this login" },
      { id: "security", href: "/settings/security", label: "Password and 2FA", hint: "Enroll or recover" },
      { id: "recovery", href: "/settings/agents", label: "Recovery", hint: "Admin recovery actions" },
      { id: "compliance", href: "/compliance", label: "Compliance / E&O", hint: "Audit + flags" },
    ],
  },
  {
    id: "billing",
    href: "/settings/billing",
    label: "Billing",
    hint: "No SaaS invoicing",
    blurb: "FitFirst does not bill producers from this desk. Book CSV lives under Data.",
    icon: "billing",
    badge: "Admin",
    thin: true,
    children: [
      { id: "billing", href: "/settings/billing", label: "Billing", hint: "No invoicing here" },
    ],
  },
];

/** Home umbrellas — Security and Billing stay on the rail only. */
export const SETTINGS_HOME_NAV = SETTINGS_NAV.filter((group) => !group.thin);

/** Always-visible Admin catalog shortcuts — not buried in a collapsed Setup group. */
export const SETTINGS_PINNED_LINKS = [
  { id: "lines" as const, href: "/settings/lines", label: "Lines of business" },
  { id: "templates" as const, href: "/settings/email-templates", label: "Email templates" },
] as const;

/** Old Developer Hub group ids + /settings/developer* pages fold into Automations & tools. */
const AUTOMATIONS_DEVELOPER_ALIASES = new Set<SettingsNavId>([
  "developer",
  "developer-hub",
  "functions",
  "api-keys",
  "api-vault",
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
  "missing-questions",
  "carrier-login-issues",
]);

const SETTINGS_CHILD_ALIASES: Partial<Record<SettingsNavId, SettingsNavId>> = {
  "email-templates": "templates",
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
  "api-vault": "api-vault",
  webhooks: "developer-hub",
  connections: "developer-hub",
  "custom-buttons": "developer-hub",
  "client-scripts": "developer-hub",
  widgets: "developer-hub",
};

const SETTINGS_GROUP_ALIASES: Partial<Record<SettingsNavId, SettingsNavId>> = {
  "agency-people": "agency",
  "desk-phone": "communications",
  "email-templates": "communications",
  people: "people-access",
  account: "security",
  prefs: "communications",
  templates: "communications",
};

export function settingsGroupFor(current: SettingsNavId): SettingsNavId {
  if (AUTOMATIONS_DEVELOPER_ALIASES.has(current)) return "automations-dev";
  if (current === "overview") return "overview";
  const aliased = SETTINGS_GROUP_ALIASES[current];
  if (aliased) return aliased;
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
  "/settings/policy-labels",
  "/settings/agent-policy-access",
  "/settings/roles-access",
  "/settings/picklists",
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
  "/documents",
  "/settings/email-triggers",
  "/settings/developer-hub",
  "/settings/developer-hub/functions",
  "/settings/developer-hub/api",
  "/settings/developer-hub/api-vault",
  "/settings/developer-hub/webhooks",
  "/settings/developer-hub/connections",
  "/settings/developer-hub/macros",
  "/settings/developer-hub/custom-buttons",
  "/settings/developer-hub/client-scripts",
  "/settings/developer-hub/widgets",
  "/settings/developer-hub/missing-questions",
  "/settings/developer-hub/carrier-login-issues",
  "/settings/profile",
  "/settings/security",
  "/compliance",
  "/settings/billing",
  "/settings/import-export",
  "/settings/import",
  "/settings/export",
] as const;
