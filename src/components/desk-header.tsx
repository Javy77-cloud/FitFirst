"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { CalendarDays, CircleHelp, Inbox, Phone } from "lucide-react";
import { NotificationBell } from "@/components/desk/notification-bell";
import { ProfileMenu } from "@/components/profile-menu";
import { SmartSearch } from "@/components/smart-search";
import { useSupport } from "@/components/support/support-context";
import type { Actor } from "@/lib/auth/rbac";
import type { HeaderAlert } from "@/lib/desk/header-alerts";
import { cn } from "@/lib/utils";

const ICONS = [
  { href: "/phone", label: "Phone", icon: Phone, className: "text-[#0f766e] hover:bg-[#ccfbf1]" },
  {
    href: "/calendar",
    label: "Calendar",
    icon: CalendarDays,
    className: "text-[#b45309] hover:bg-[#fef3c7]",
  },
  { href: "/settings/email", label: "Email", icon: Inbox, className: "text-[#1d6fb8] hover:bg-[#dbeafe]" },
];

export function DeskHeader({
  title,
  eyebrow,
  actions,
  unread,
  alerts,
  actor,
  users,
  signedIn,
  canSwitchRole,
  impersonatorName,
  isImpersonating,
  utilityChrome = false,
}: {
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
  unread: number;
  alerts: HeaderAlert[];
  actor: Actor;
  users: Actor[];
  signedIn: boolean;
  canSwitchRole: boolean;
  impersonatorName: string | null;
  isImpersonating: boolean;
  utilityChrome?: boolean;
}) {
  const { openSupport } = useSupport();
  return (
    <header
      className="ff-no-print flex flex-wrap items-center gap-3 border-b border-border bg-card px-5 py-3"
      data-ff-utility-chrome={utilityChrome ? "true" : "false"}
    >
      {utilityChrome ? (
        <Link href="/" className="shrink-0 text-base font-semibold text-navy" title="FitFirst home">
          FitFirst
        </Link>
      ) : (
        <div className="min-w-0 shrink-0">
          <div className="text-caption uppercase tracking-wide text-muted-foreground">
            {eyebrow ?? "Personal lines worksheet"}
          </div>
          <h1 className="text-xl font-semibold text-navy">{title}</h1>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <SmartSearch />
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        {utilityChrome
          ? null
          : ICONS.map((item) => {
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
                </Link>
              );
            })}
        <NotificationBell unread={unread} alerts={alerts} />
        {utilityChrome ? null : (
          <button
            type="button"
            title="Support"
            onClick={() => openSupport()}
            className="relative inline-flex size-10 items-center justify-center rounded-md text-[#b4532a] hover:bg-[#f3eee6]"
          >
            <CircleHelp className="size-6" strokeWidth={2.25} />
            <span className="sr-only">Support</span>
          </button>
        )}
        <ProfileMenu
          actor={actor}
          users={users}
          signedIn={signedIn}
          canSwitchRole={canSwitchRole}
          impersonatorName={impersonatorName}
          isImpersonating={isImpersonating}
        />
        {utilityChrome ? null : actions}
      </div>
    </header>
  );
}
