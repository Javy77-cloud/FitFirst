export const SETTINGS_NAV_IDS = [
  "overview",
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
  "lists",
  "lines",
  "templates",
  "triggers",
  "agency",
  "offices",
  "territories",
  "routing",
  "signatures",
  "prefs",
  "my-desk",
  "account",
  "profile",
  "security",
  "recovery",
  "compliance",
  "export",
  "import-export",
  "developer",
  "functions",
  "api-keys",
  "webhooks",
  "connections",
  "macros",
  "custom-buttons",
  "client-scripts",
  "widgets",
  "developer-hub",
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
  children: SettingsNavChild[];
};

export const SETTINGS_NAV: SettingsNavGroup[] = [
  {
    id: "overview",
    href: "/settings",
    label: "Overview",
    hint: "Admin vs agent at a glance",
    children: [],
  },
  {
    id: "people",
    href: "/settings/agents",
    label: "People / Agents",
    hint: "Create, freeze, notify",
    children: [
      { id: "agents", href: "/settings/agents", label: "Agents", hint: "Access and status" },
    ],
  },
  {
    id: "communications",
    href: "/settings/communications",
    label: "Communications",
    hint: "Email, SMS, phone, video",
    children: [
      { id: "email", href: "/settings/email", label: "Email", hint: "Inbox + templates" },
      { id: "sms", href: "/settings/sms", label: "SMS", hint: "Twilio stub" },
      { id: "outbound", href: "/settings/outbound", label: "Outbound queue", hint: "Email / SMS intent" },
      { id: "phone", href: "/settings/phone", label: "Phone", hint: "Call log line" },
      { id: "video", href: "/settings/video", label: "Video", hint: "Zoom / Meet" },
    ],
  },
  {
    id: "integrations",
    href: "/settings/integrations",
    label: "Integrations",
    hint: "Connectable catalog",
    children: [
      {
        id: "integrations",
        href: "/settings/integrations",
        label: "Catalog",
        hint: "BYO providers",
      },
      {
        id: "carrier-download",
        href: "/settings/carrier-download",
        label: "IVANS / AL3",
        hint: "Not connected",
      },
      {
        id: "social",
        href: "/settings/social",
        label: "Social / GBP",
        hint: "FB · IG · X · LI · GBP",
      },
      {
        id: "developer",
        href: "/settings/developer",
        label: "Developer Hub",
        hint: "Macros · functions · keys",
      },
    ],
  },
  {
    id: "lists",
    href: "/settings/lists",
    label: "Lines / Global lists",
    hint: "Books and picklists",
    children: [
      { id: "lines", href: "/settings/lines", label: "Lines of business", hint: "Life / Health" },
      { id: "templates", href: "/settings/email-templates", label: "Email templates", hint: "Client mail" },
      { id: "triggers", href: "/settings/email-triggers", label: "Triggers", hint: "Won-date jobs" },
    ],
  },
  {
    id: "agency",
    href: "/settings/agency",
    label: "Brand / Agency",
    hint: "Chrome every agent inherits",
    children: [
      { id: "agency", href: "/settings/agency", label: "Agency chrome", hint: "Name + logo" },
      { id: "offices", href: "/settings/offices", label: "Offices", hint: "Desks + states" },
      { id: "territories", href: "/settings/territories", label: "Territories", hint: "Geo books" },
      { id: "routing", href: "/settings/routing", label: "Lead routing", hint: "Territory · line · capacity" },
      { id: "signatures", href: "/settings/email-signatures", label: "Signatures", hint: "Client close" },
      { id: "export", href: "/settings/export", label: "Export", hint: "Open API CSV" },
      { id: "import-export", href: "/settings/import-export", label: "Import / Export", hint: "Agency data packs" },
    ],
  },
  {
    id: "developer-hub",
    href: "/settings/developer-hub",
    label: "Developer Hub",
    hint: "Functions, macros, buttons, scripts",
    children: [
      {
        id: "developer-hub",
        href: "/settings/developer-hub",
        label: "Overview",
        hint: "Hub home",
      },
      {
        id: "dev-functions",
        href: "/settings/developer-hub/functions",
        label: "Functions",
        hint: "Server functions",
      },
      { id: "dev-api", href: "/settings/developer-hub/api", label: "API", hint: "REST stubs" },
      {
        id: "dev-webhooks",
        href: "/settings/developer-hub/webhooks",
        label: "Webhooks",
        hint: "Outbound hooks",
      },
      {
        id: "dev-connections",
        href: "/settings/developer-hub/connections",
        label: "Connections",
        hint: "OAuth stubs",
      },
      { id: "dev-macros", href: "/settings/developer-hub/macros", label: "Macros", hint: "Manual run" },
      {
        id: "dev-buttons",
        href: "/settings/developer-hub/custom-buttons",
        label: "Custom Buttons",
        hint: "Links & buttons",
      },
      {
        id: "dev-scripts",
        href: "/settings/developer-hub/client-scripts",
        label: "Client Scripts",
        hint: "Form events",
      },
      { id: "dev-widgets", href: "/settings/developer-hub/widgets", label: "Widgets", hint: "Embed stubs" },
    ],
  },
  {
    id: "compliance",
    href: "/compliance",
    label: "Compliance",
    hint: "E&O trail + gap flags",
    children: [
      { id: "compliance", href: "/compliance", label: "E&O desk", hint: "Audit + flags" },
    ],
  },
  {
    id: "prefs",
    href: "/settings",
    label: "Admin vs Agent prefs",
    hint: "Agency vs this desk",
    children: [
      { id: "overview", href: "/settings", label: "Admin settings", hint: "Agency-wide" },
      { id: "my-desk", href: "/settings/my-desk", label: "My desk", hint: "This login only" },
    ],
  },
  {
    id: "account",
    href: "/settings/security",
    label: "Account",
    hint: "Profile, 2FA, recovery",
    children: [
      { id: "profile", href: "/settings/profile", label: "Profile", hint: "Name on this login" },
      { id: "security", href: "/settings/security", label: "Security", hint: "Password and 2FA" },
      { id: "recovery", href: "/settings/agents", label: "Recovery", hint: "Admin recovery actions" },
    ],
  },
];

const DEVELOPER_HUB_ALIASES = new Set<SettingsNavId>([
  "functions",
  "api-keys",
  "webhooks",
  "connections",
  "macros",
  "custom-buttons",
  "client-scripts",
  "widgets",
]);

export function settingsGroupFor(current: SettingsNavId): SettingsNavId {
  if (DEVELOPER_HUB_ALIASES.has(current)) return "developer-hub";
  if (SETTINGS_NAV.some((group) => group.id === current && group.children.length === 0)) {
    return current;
  }
  const group = SETTINGS_NAV.find(
    (item) => item.id === current || item.children.some((child) => child.id === current),
  );
  return group?.id ?? "overview";
}
