"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Bell, CalendarDays, CircleHelp, Inbox, Phone } from "lucide-react";
import { SmartSearch } from "@/components/smart-search";
import { useSupport } from "@/components/support/support-context";
import { cn } from "@/lib/utils";

const ICONS = [
  { href: "/phone", label: "Phone", icon: Phone, className: "text-[#0f766e] hover:bg-[#ccfbf1]" },
  {
    href: "/calendar",
    label: "Calendar",
    icon: CalendarDays,
    className: "text-[#b45309] hover:bg-[#fef3c7]",
  },
  { href: "/inbox", label: "Mail", icon: Inbox, className: "text-[#1d6fb8] hover:bg-[#dbeafe]" },
  { href: "/alerts", label: "Alerts", icon: Bell, className: "text-[#c2410c] hover:bg-[#ffedd5]" },
];

export function DeskHeader({
  title,
  eyebrow,
  actions,
  unread,
}: {
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
  unread: number;
}) {
  const { openSupport } = useSupport();
  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-5 py-3">
      <div className="min-w-0 shrink-0">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {eyebrow ?? "Personal lines worksheet"}
        </div>
        <h1 className="text-lg font-semibold text-navy">{title}</h1>
      </div>
      <div className="min-w-0 flex-1">
        <SmartSearch />
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        {ICONS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "relative inline-flex size-10 items-center justify-center rounded-md",
                item.className,
              )}
            >
              <Icon className="size-6" strokeWidth={2.25} />
              <span className="sr-only">{item.label}</span>
              {item.href === "/alerts" && unread > 0 ? (
                <span className="absolute top-1 right-1 size-2 rounded-full bg-fit-flag" />
              ) : null}
            </Link>
          );
        })}
        <button
          type="button"
          title="Support"
          onClick={() => openSupport()}
          className="relative inline-flex size-10 items-center justify-center rounded-md text-[#b4532a] hover:bg-[#f3eee6]"
        >
          <CircleHelp className="size-6" strokeWidth={2.25} />
          <span className="sr-only">Support</span>
        </button>
        {actions}
      </div>
    </header>
  );
}
