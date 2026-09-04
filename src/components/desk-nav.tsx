"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Briefcase,
  Building2,
  ClipboardList,
  Contact,
  FileStack,
  Calendar,
  Home,
  LifeBuoy,
  Phone,
  Kanban,
  ListChecks,
  Search,
  Shield,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DESK_NAV_ITEMS } from "@/lib/desk/nav-items";
import { navItemIsActive } from "@/lib/desk/nav-active";

const NAV_ICONS: Record<(typeof DESK_NAV_ITEMS)[number]["label"], LucideIcon> = {
  "Get Started": ListChecks,
  Home,
  Pipeline: Kanban,
  Leads: Users,
  Deals: ClipboardList,
  Contacts: Contact,
  Businesses: Briefcase,
  Policies: Shield,
  Forms: FileStack,
  Quotes: ClipboardList,
  Merge: Users,
  "Work queue": ListChecks,
  "Claims log": FileStack,
  Commissions: Briefcase,
  Tasks: ListChecks,
  Calendar,
  Search,
  Carriers: Building2,
  Alerts: Bell,
  Phone,
  Support: LifeBuoy,
  Settings: ClipboardList,
};

export function DeskNav({
  unread,
  variant,
}: {
  unread: number;
  variant: "sidebar" | "mobile";
}) {
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
            {item.href === "/alerts" && unread > 0 ? (
              <span className="rounded-sm bg-fit-flag px-1.5 text-[10px] font-semibold text-white">
                {unread}
              </span>
            ) : null}
          </Link>
        );
      })}
    </>
  );
}
