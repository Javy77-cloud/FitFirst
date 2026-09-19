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
  ListChecks,
  Share2,
  Shield,
  Users,
  Wallet,
} from "lucide-react";
import { isNavActive } from "@/lib/desk/nav";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/social", label: "Social", icon: Share2 },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/deals", label: "Deals", icon: ClipboardList },
  { href: "/contacts", label: "Contacts", icon: Contact },
  { href: "/accounts", label: "Accounts", icon: Briefcase },
  { href: "/policies", label: "Policies", icon: Shield },
  { href: "/documents", label: "Documents", icon: FileStack },
  { href: "/quotes", label: "Quotes", icon: ClipboardList },
  { href: "/merge", label: "Merge", icon: Users },
  { href: "/work-queue", label: "Work queue", icon: ListChecks },
  { href: "/claims", label: "Claims log", icon: FileStack },
  { href: "/commissions", label: "Commissions", icon: Wallet },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/carriers", label: "Carriers", icon: Building2 },
  { href: "/notifications", label: "Alerts", icon: Bell },
  { href: "/phone", label: "Phone", icon: Phone },
  { href: "/settings", label: "Settings", icon: ClipboardList },
];

export function SidebarNav({
  unread,
  variant,
}: {
  unread: number;
  variant: "side" | "mobile";
}) {
  const pathname = usePathname();

  if (variant === "mobile") {
    return (
      <>
        {NAV.map((item) => {
          const active = isNavActive(item.href, pathname);
          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className={cn(
                "whitespace-nowrap",
                active ? "font-semibold text-navy underline decoration-2 underline-offset-4" : "text-primary",
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
        const active = isNavActive(item.href, pathname);
        return (
          <Link
            key={`${item.href}-${item.label}`}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm",
              active
                ? "bg-sidebar-accent font-semibold text-sidebar-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent",
            )}
          >
            <Icon className="size-3.5 opacity-80" />
            <span className="flex-1">{item.label}</span>
            {item.href === "/notifications" && unread > 0 ? (
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
