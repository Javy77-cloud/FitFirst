import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardList,
  Contact,
  FileStack,
  FileWarning,
  Home,
  Inbox,
  Kanban,
  LifeBuoy,
  ListChecks,
  Phone,
  Settings,
  Shield,
  Timer,
  Users,
} from "lucide-react";
import { SUPPORT_HREF } from "@/lib/desk/quick-actions";

export type NavLinkDef = {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
  match?: string;
  exact?: boolean;
};

/** Every destination Javy can pin under a primary. Ids are stable for prefs. */
export const NAV_LINK_CATALOG: NavLinkDef[] = [
  { id: "home", href: "/", label: "Home", icon: Home, match: "/", exact: true },
  { id: "get-started", href: "/get-started", label: "Get Started", icon: ListChecks },
  { id: "social", href: "/social", label: "Social", icon: Users, match: "/social" },
  { id: "leads", href: "/leads", label: "Leads", icon: Users, match: "/leads" },
  { id: "deals", href: "/deals", label: "Deals", icon: ClipboardList, match: "/deals" },
  {
    id: "pipeline",
    href: "/pipeline?pipeline=p-c",
    label: "Pipeline",
    icon: Kanban,
    match: "/pipeline",
  },
  { id: "quotes", href: "/quotes", label: "Quotes", icon: ClipboardList, match: "/quotes" },
  { id: "contacts", href: "/contacts", label: "Contacts", icon: Contact, match: "/contacts" },
  { id: "business", href: "/accounts", label: "Business", icon: Briefcase, match: "/accounts" },
  { id: "merge", href: "/merge", label: "Merge", icon: Users, match: "/merge" },
  { id: "policies", href: "/policies", label: "Policies", icon: Shield, match: "/policies" },
  { id: "book-health", href: "/book-health", label: "Book health", icon: Shield, match: "/book-health" },
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
  { id: "forms", href: "/forms", label: "Forms", icon: FileStack, match: "/forms" },
  { id: "claims", href: "/claims", label: "Claims log", icon: FileStack, match: "/claims" },
  { id: "commissions", href: "/commissions", label: "Commissions", icon: Briefcase, match: "/commissions" },
  { id: "carriers", href: "/carriers", label: "Carriers", icon: Building2, match: "/carriers" },
  { id: "decline-log", href: "/logs", label: "Decline log", icon: FileStack, match: "/logs" },
  { id: "scorecards", href: "/scorecards", label: "Scorecards", icon: ClipboardList, match: "/scorecards" },
  { id: "glance", href: "/glance", label: "Glance", icon: ListChecks, match: "/glance" },
  { id: "tasks", href: "/tasks", label: "Tasks", icon: ListChecks, match: "/tasks" },
  { id: "work-queue", href: "/work-queue", label: "Work queue", icon: ListChecks, match: "/work-queue" },
  {
    id: "automations",
    href: "/automations",
    label: "Automations",
    icon: ListChecks,
    match: "/automations",
  },
  { id: "calendar", href: "/calendar", label: "Calendar", icon: CalendarDays, match: "/calendar" },
  { id: "phone", href: "/phone", label: "Phone", icon: Phone, match: "/phone" },
  { id: "inbox", href: "/inbox", label: "Inbox", icon: Inbox, match: "/inbox" },
  {
    id: "alerts",
    href: "/notifications",
    label: "Alerts",
    icon: Bell,
    match: "/notifications",
  },
  { id: "support", href: SUPPORT_HREF, label: "Support", icon: LifeBuoy, match: "/support" },
  { id: "settings", href: "/settings", label: "Settings", icon: Settings, match: "/settings" },
];

export const NAV_LINK_BY_ID: Record<string, NavLinkDef> = Object.fromEntries(
  NAV_LINK_CATALOG.map((link) => [link.id, link]),
);

export function getNavLink(id: string): NavLinkDef | undefined {
  return NAV_LINK_BY_ID[id];
}

export function navLinkIsActive(pathname: string, item: Pick<NavLinkDef, "href" | "match" | "exact">): boolean {
  const match = item.match ?? item.href.split("?")[0];
  if (match === "/" || item.exact) return pathname === match;
  if (match === "/notifications" && (pathname === "/alerts" || pathname.startsWith("/alerts/"))) {
    return true;
  }
  if (match === "/accounts" && (pathname === "/businesses" || pathname.startsWith("/businesses/"))) {
    return true;
  }
  if (match === "/documents" && (pathname === "/forms" || pathname.startsWith("/forms/"))) {
    return true;
  }
  return pathname === match || pathname.startsWith(`${match}/`);
}
