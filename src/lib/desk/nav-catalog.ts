import type { LucideIcon } from "lucide-react";
import {
  BadgeDollarSign,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardList,
  Code2,
  Contact,
  FileStack,
  FileWarning,
  FolderKanban,
  FolderOpen,
  HeartPulse,
  Home,
  Landmark,
  ListChecks,
  PenLine,
  Phone,
  Plug,
  Settings,
  Shield,
  ShieldCheck,
  Store,
  Timer,
  Users,
  Workflow,
  Zap,
} from "lucide-react";

export type NavLinkDef = {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
  match?: string;
  exact?: boolean;
  /** Agency chrome, credentials, billing, people. Hidden from agents. */
  adminOnly?: boolean;
  /** Third profile. Hidden unless session.isDeveloper. */
  developerOnly?: boolean;
};

/** Every destination that can sit on the rail or inside a folder. Ids are stable for prefs. */
export const NAV_LINK_CATALOG: NavLinkDef[] = [
  { id: "home", href: "/", label: "Dashboard", icon: Home, match: "/", exact: true },
  { id: "social", href: "/social", label: "Social", icon: Users, match: "/social" },
  { id: "leads", href: "/leads", label: "Leads", icon: Users, match: "/leads" },
  { id: "deals", href: "/deals", label: "Deals", icon: ClipboardList, match: "/deals" },
  { id: "quotes", href: "/quotes", label: "Quotes", icon: ClipboardList, match: "/quotes" },
  { id: "contacts", href: "/contacts", label: "Contacts", icon: Contact, match: "/contacts" },
  { id: "business", href: "/accounts", label: "Accounts", icon: Briefcase, match: "/accounts" },
  { id: "merge", href: "/merge", label: "Merge", icon: Users, match: "/merge" },
  { id: "policies", href: "/policies", label: "Policies", icon: Shield, match: "/policies" },
  { id: "my-book", href: "/policies", label: "My Book", icon: Shield, match: "/policies", exact: true },
  {
    id: "book-health",
    href: "/book-health",
    label: "Book of Health",
    icon: Shield,
    match: "/book-health",
    adminOnly: true,
  },
  {
    id: "book-of-life",
    href: "/book-life",
    label: "Book of Life",
    icon: HeartPulse,
    match: "/book-life",
    adminOnly: true,
  },
  {
    id: "marketplace",
    href: "/marketplace",
    label: "Marketplace",
    icon: Store,
    match: "/marketplace",
    adminOnly: true,
  },
  { id: "renewals", href: "/renewals", label: "Renewals", icon: ClipboardList, match: "/renewals" },
  {
    id: "certificates",
    href: "/certificates",
    label: "Certificates",
    icon: FileStack,
    match: "/certificates",
  },
  {
    id: "service-requests",
    href: "/service-requests",
    label: "Service",
    icon: ListChecks,
    match: "/service-requests",
  },
  { id: "suspense", href: "/suspense", label: "Suspense", icon: Timer, match: "/suspense" },
  { id: "notices", href: "/notices", label: "Notices", icon: FileWarning, match: "/notices" },
  {
    id: "endorsements",
    href: "/endorsements",
    label: "Endorsements",
    icon: FileStack,
    match: "/endorsements",
    adminOnly: true,
  },
  {
    id: "service-timeline",
    href: "/service-timeline",
    label: "Service timeline",
    icon: Timer,
    match: "/service-timeline",
  },
  {
    id: "inspections",
    href: "/inspections",
    label: "Inspections",
    icon: ClipboardList,
    match: "/inspections",
  },
  {
    id: "installments",
    href: "/installments",
    label: "Installments",
    icon: Briefcase,
    match: "/installments",
  },
  { id: "documents", href: "/documents", label: "Documents", icon: FileStack, match: "/documents" },
  {
    id: "document-templates",
    href: "/documents",
    label: "Documents",
    icon: FileStack,
    match: "/documents",
  },
  { id: "forms", href: "/forms", label: "Forms", icon: FileStack, match: "/forms" },
  { id: "claims", href: "/claims", label: "Claims", icon: FileStack, match: "/claims", adminOnly: true },
  { id: "commissions", href: "/commissions", label: "Commissions", icon: Briefcase, match: "/commissions" },
  { id: "carriers", href: "/carriers", label: "Carriers", icon: Building2, match: "/carriers" },
  { id: "decline-log", href: "/logs", label: "Decline log", icon: FileStack, match: "/logs" },
  { id: "scorecards", href: "/scorecards", label: "Scorecards", icon: ClipboardList, match: "/scorecards" },
  { id: "glance", href: "/glance", label: "Glance", icon: ListChecks, match: "/glance" },
  { id: "work-queue", href: "/work-queue", label: "Work queue", icon: ListChecks, match: "/work-queue" },
  {
    id: "automations",
    href: "/automations",
    label: "Automations",
    icon: Workflow,
    match: "/automations",
    adminOnly: true,
  },
  { id: "calendar", href: "/calendar", label: "Calendar", icon: CalendarDays, match: "/calendar" },
  { id: "phone", href: "/phone", label: "Phone", icon: Phone, match: "/phone" },
  {
    id: "alerts",
    href: "/notifications",
    label: "Notifications",
    icon: Bell,
    match: "/notifications",
  },
  { id: "templates", href: "/templates", label: "Templates", icon: FolderOpen, match: "/templates" },
  {
    id: "email-signatures",
    href: "/me?section=signature",
    label: "Email signatures",
    icon: PenLine,
    match: "/me",
  },
  {
    id: "email-templates",
    href: "/automations/templates",
    label: "Email templates",
    icon: FileStack,
    match: "/automations/templates",
  },
  { id: "reports", href: "/reports", label: "Reports", icon: BarChart3, match: "/reports" },
  {
    id: "settings",
    href: "/settings",
    label: "Settings",
    icon: Settings,
    match: "/settings",
    adminOnly: true,
  },
  { id: "admin", href: "/admin", label: "Admin", icon: ShieldCheck, match: "/admin", adminOnly: true },
  {
    id: "operations",
    href: "/admin/operations",
    label: "Operations",
    icon: FolderKanban,
    match: "/admin/operations",
    adminOnly: true,
  },
  {
    id: "agents",
    href: "/settings/agents",
    label: "People",
    icon: Users,
    match: "/settings/agents",
    adminOnly: true,
  },
  {
    id: "billing",
    href: "/settings/billing",
    label: "Billing",
    icon: Landmark,
    match: "/settings/billing",
    adminOnly: true,
  },
  {
    id: "compliance",
    href: "/compliance",
    label: "Compliance",
    icon: ShieldCheck,
    match: "/compliance",
    adminOnly: true,
  },
  {
    id: "integrations",
    href: "/settings/integrations",
    label: "Integrations",
    icon: Plug,
    match: "/settings/integrations",
    adminOnly: true,
  },
  {
    id: "triggers",
    href: "/settings/email-triggers",
    label: "Triggers",
    icon: Zap,
    match: "/settings/email-triggers",
    adminOnly: true,
  },
  {
    id: "commission-rates",
    href: "/settings#commission",
    label: "Commission rates",
    icon: BadgeDollarSign,
    match: "/settings#commission",
    exact: true,
    adminOnly: true,
  },
  {
    id: "lines",
    href: "/settings/lines",
    label: "Lines of business",
    icon: ClipboardList,
    match: "/settings/lines",
    adminOnly: true,
  },
  {
    id: "offices",
    href: "/settings/offices",
    label: "Offices",
    icon: Building2,
    match: "/settings/offices",
    adminOnly: true,
  },
  {
    id: "agency",
    href: "/settings/agency",
    label: "Agency chrome",
    icon: Settings,
    match: "/settings/agency",
    adminOnly: true,
  },
  {
    id: "carrier-download",
    href: "/settings/carrier-download",
    label: "Carrier Downloads",
    icon: Building2,
    match: "/settings/carrier-download",
    adminOnly: true,
  },
  {
    id: "developer",
    href: "/developer",
    label: "Developer",
    icon: Code2,
    match: "/developer",
    developerOnly: true,
  },
];

export const NAV_LINK_BY_ID: Record<string, NavLinkDef> = Object.fromEntries(
  NAV_LINK_CATALOG.map((link) => [link.id, link]),
);

export function getNavLink(id: string): NavLinkDef | undefined {
  return NAV_LINK_BY_ID[id];
}

export function isAdminOnlyNavId(id: string): boolean {
  return Boolean(getNavLink(id)?.adminOnly);
}

export function isDeveloperOnlyNavId(id: string): boolean {
  return Boolean(getNavLink(id)?.developerOnly);
}

const PERSONAL_SETTINGS_PATHS = ["/me", "/settings/profile", "/settings/security", "/settings/my-desk"];

export function isPersonalSettingsPath(pathname: string): boolean {
  return PERSONAL_SETTINGS_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function navLinkIsActive(pathname: string, item: Pick<NavLinkDef, "href" | "match" | "exact">): boolean {
  const match = item.match ?? item.href.split("?")[0];
  if (match === "/" || item.exact) return pathname === match;
  if (match === "/settings" && isPersonalSettingsPath(pathname)) return false;
  if (match === "/admin" && (pathname === "/admin/operations" || pathname.startsWith("/admin/operations/"))) {
    return false;
  }
  if (match === "/notifications" && (pathname === "/alerts" || pathname.startsWith("/alerts/") || pathname === "/tasks" || pathname.startsWith("/tasks/"))) {
    return true;
  }
  if (match === "/accounts" && (pathname === "/businesses" || pathname.startsWith("/businesses/"))) {
    return true;
  }
  if (match === "/documents" && (pathname === "/forms" || pathname.startsWith("/forms/"))) {
    return true;
  }
  if (match === "/deals" && (pathname === "/pipeline" || pathname.startsWith("/pipeline/"))) {
    return true;
  }
  if (match === "/me" && pathname === "/me") return true;
  return pathname === match || pathname.startsWith(`${match}/`);
}
