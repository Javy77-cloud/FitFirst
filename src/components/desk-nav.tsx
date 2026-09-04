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
  Phone,
  Kanban,
  ListChecks,
  Search,
  Share2,
  Shield,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { navItemIsActive } from "@/lib/desk/nav-active";

const NAV = [
  { href: "/get-started", label: "Get Started", icon: ListChecks },
  { href: "/", label: "Home", icon: Home },
  { href: "/social", label: "Social", icon: Share2 },
  { href: "/pipeline?pipeline=p-c", label: "Pipeline", icon: Kanban },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/deals", label: "Deals", icon: ClipboardList },
  { href: "/contacts", label: "Contacts", icon: Contact },
  { href: "/accounts", label: "Businesses", icon: Briefcase },
  { href: "/policies", label: "Policies", icon: Shield },
  { href: "/forms", label: "Forms", icon: FileStack },
  { href: "/quotes", label: "Quotes", icon: ClipboardList },
  { href: "/merge", label: "Merge", icon: Users },
  { href: "/work-queue", label: "Work queue", icon: ListChecks },
  { href: "/claims", label: "Claims log", icon: FileStack },
  { href: "/commissions", label: "Commissions", icon: Briefcase },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/search", label: "Search", icon: Search },
  { href: "/carriers", label: "Carriers", icon: Building2 },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/phone", label: "Phone", icon: Phone },
  { href: "/settings", label: "Settings", icon: ClipboardList },
];

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
        {NAV.map((item) => {
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
      {NAV.map((item) => {
        const Icon = item.icon;
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
