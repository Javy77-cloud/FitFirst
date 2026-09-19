import { NOTIFICATION_BOARD_HREF, NOTIFICATION_BOARD_LABEL } from "./notifications";

export { NOTIFICATION_BOARD_HREF, NOTIFICATION_BOARD_LABEL };

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
  { id: "task", label: "Add promise", href: "/notifications?newCommitment=1#commitments" },
  { id: "meeting", label: "Add Meeting", href: "/meetings/new" },
];

export const SUPPORT_HREF = "/support";
export const SUPPORT_COPY = "How-to and Q&A live in the desk help panel.";
export const PROFILE_SETTINGS_HREF = "/settings/my-desk";

export const NOTIFICATION_LINKS = [
  { href: NOTIFICATION_BOARD_HREF, label: NOTIFICATION_BOARD_LABEL },
  { href: "/work-queue", label: "Work queue" },
  { href: "/notifications#commitments", label: "Open commitments" },
  { href: "/calendar", label: "Calendar" },
] as const;
