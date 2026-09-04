export const SETTINGS_NAV_IDS = [
  "overview",
  "people",
  "agents",
  "communications",
  "email",
  "sms",
  "phone",
  "video",
  "integrations",
  "social",
  "lists",
  "lines",
  "templates",
  "triggers",
  "agency",
  "offices",
  "territories",
  "signatures",
  "prefs",
  "my-desk",
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
        id: "social",
        href: "/settings/social",
        label: "Social / GBP",
        hint: "FB · IG · X · LI · GBP",
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
      { id: "signatures", href: "/settings/email-signatures", label: "Signatures", hint: "Client close" },
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
];

export function settingsGroupFor(current: SettingsNavId): SettingsNavId {
  if (SETTINGS_NAV.some((group) => group.id === current && group.children.length === 0)) {
    return current;
  }
  const group = SETTINGS_NAV.find(
    (item) => item.id === current || item.children.some((child) => child.id === current),
  );
  return group?.id ?? "overview";
}
