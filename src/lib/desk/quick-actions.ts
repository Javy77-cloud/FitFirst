export type QuickAction = {
  id: string;
  label: string;
  href: string;
};

/** Header Quick actions — existing new routes, plus thin stubs. */
export const QUICK_ACTIONS: QuickAction[] = [
  { id: "lead", label: "Add Lead", href: "/leads/new" },
  { id: "deal", label: "Add Deal", href: "/deals/new" },
  { id: "policy", label: "Add Policy", href: "/policies/new" },
  { id: "task", label: "Add Task", href: "/tasks/new" },
  { id: "meeting", label: "Add Meeting", href: "/meetings/new" },
];

export const SUPPORT_HREF = "/support";
export const SUPPORT_COPY = "Coming soon — we'll wire this later.";
export const PROFILE_SETTINGS_HREF = "/settings/my-desk";

export const NOTIFICATION_LINKS = [
  { href: "/alerts", label: "All alerts" },
  { href: "/work-queue", label: "Work queue" },
  { href: "/tasks", label: "Open tasks" },
  { href: "/calendar", label: "Calendar" },
] as const;
