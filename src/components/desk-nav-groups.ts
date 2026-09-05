import {
  Bell,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardList,
  Contact,
  FileStack,
  Home,
  Inbox,
  Kanban,
  ListChecks,
  Phone,
  Settings,
  Shield,
  Users,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  match?: string;
  exact?: boolean;
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

/** Always visible, never inside a Sales/Service/Settings accordion. */
export const PINNED_HOME: NavItem = { href: "/", label: "Home", icon: Home, match: "/" };

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "work",
    label: "Work",
    items: [
      { href: "/get-started", label: "Get Started", icon: ListChecks },
      { href: "/social", label: "Social", icon: Users, match: "/social" },
      { href: "/pipeline?pipeline=p-c", label: "Pipeline", icon: Kanban, match: "/pipeline" },
      { href: "/leads", label: "Leads", icon: Users, match: "/leads" },
      { href: "/deals", label: "Deals", icon: ClipboardList, match: "/deals" },
      { href: "/quotes", label: "Quotes", icon: ClipboardList, match: "/quotes" },
      { href: "/tasks", label: "Tasks", icon: ListChecks, match: "/tasks" },
      { href: "/work-queue", label: "Work queue", icon: ListChecks, match: "/work-queue" },
      { href: "/automations", label: "Automations", icon: ListChecks, match: "/automations" },
    ],
  },
  {
    id: "accounts",
    label: "Accounts",
    items: [
      { href: "/contacts", label: "Contacts", icon: Contact, match: "/contacts" },
      { href: "/accounts", label: "Businesses", icon: Briefcase, match: "/accounts" },
    ],
  },
  {
    id: "records",
    label: "Records",
    items: [
      { href: "/policies", label: "Policies", icon: Shield, match: "/policies" },
      { href: "/book-health", label: "Book health", icon: Shield, match: "/book-health" },
      { href: "/renewals", label: "Renewals", icon: ClipboardList, match: "/renewals" },
      { href: "/certificates", label: "Certificates", icon: FileStack, match: "/certificates" },
      { href: "/service-requests", label: "Service", icon: ListChecks, match: "/service-requests" },
      { href: "/documents", label: "Documents", icon: FileStack, match: "/documents" },
      { href: "/forms", label: "Forms", icon: FileStack, match: "/forms" },
      { href: "/merge", label: "Merge", icon: Users, match: "/merge" },
      { href: "/claims", label: "Claims log", icon: FileStack, match: "/claims" },
      { href: "/commissions", label: "Commissions", icon: Briefcase, match: "/commissions" },
      { href: "/carriers", label: "Carriers", icon: Building2, match: "/carriers" },
      { href: "/logs", label: "Decline log", icon: FileStack, match: "/logs" },
    ],
  },
  {
    id: "desk",
    label: "Desk",
    items: [
      { href: "/calendar", label: "Calendar", icon: CalendarDays, match: "/calendar" },
      { href: "/phone", label: "Phone", icon: Phone, match: "/phone" },
      { href: "/inbox", label: "Inbox", icon: Inbox, match: "/inbox" },
      { href: "/alerts", label: "Alerts", icon: Bell, match: "/alerts" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    items: [
      { href: "/settings", label: "Settings", icon: Settings, match: "/settings" },
    ],
  },
];

export const FLAT_NAV = [PINNED_HOME, ...NAV_GROUPS.flatMap((group) => group.items)];

export function pathIsActive(pathname: string, item: NavItem): boolean {
  const match = item.match ?? item.href.split("?")[0];
  if (match === "/" || item.exact) return pathname === match;
  return pathname === match || pathname.startsWith(`${match}/`);
}

export function groupIdForPath(pathname: string): string {
  if (pathIsActive(pathname, PINNED_HOME)) return "";
  if (pathname === "/settings" || pathname.startsWith("/settings/")) return "settings";
  for (const group of NAV_GROUPS) {
    if (group.items.some((item) => pathIsActive(pathname, item))) return group.id;
  }
  return "work";
}
