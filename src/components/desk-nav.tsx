"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Briefcase,
  Building2,
  ClipboardList,
  Contact,
  FileStack,
  Calendar,
  Home,
  Layers,
  LifeBuoy,
  Phone,
  Kanban,
  ListChecks,
  Share2,
  Shield,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DESK_NAV_ITEMS } from "@/lib/desk/nav-items";
import { navItemIsActive } from "@/lib/desk/nav-active";

const NAV_ICONS: Record<(typeof DESK_NAV_ITEMS)[number]["label"], LucideIcon> = {
  "Get Started": ListChecks,
  Home,
  Social: Share2,
  Pipeline: Kanban,
  Leads: Users,
  Deals: ClipboardList,
  Contacts: Contact,
  Businesses: Briefcase,
  Policies: Shield,
  Documents: FileStack,
  Quotes: ClipboardList,
  Merge: Users,
  "Work queue": ListChecks,
  "Claims log": FileStack,
  Commissions: Briefcase,
  Scorecards: BarChart3,
  Glance: Layers,
  Tasks: ListChecks,
  Automations: Workflow,
  Calendar,
  Carriers: Building2,
  Phone,
  Support: LifeBuoy,
  Settings: ClipboardList,
};

export function DeskNav({ variant }: { variant: "sidebar" | "mobile" }) {
  const pathname = usePathname() ?? "";

  if (variant === "mobile") {
    return (
      <>
        {DESK_NAV_ITEMS.map((item) => {
          const active = navItemIsActive(pathname, item.href);
          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "whitespace-nowrap",
                active ? "font-semibold text-navy" : "text-primary",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </>
    );
  }

  return (
    <>
      {DESK_NAV_ITEMS.map((item) => {
        const Icon = NAV_ICONS[item.label];
        const active = navItemIsActive(pathname, item.href);
        return (
          <Link
            key={`${item.href}-${item.label}`}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-md px-2.5 py-2 text-[15px]",
              active
                ? "bg-sidebar-accent font-semibold text-sidebar-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent",
            )}
          >
            <Icon className="size-3.5 opacity-80" />
            <span className="flex-1">{item.label}</span>
          </Link>
        );
      })}
    </>
  );
}
