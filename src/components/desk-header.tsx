"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { HeaderRecordActions } from "@/components/desk/header-record-actions";
import { NotificationBell } from "@/components/desk/notification-bell";
import { ProfileMenu } from "@/components/profile-menu";
import { SmartSearch } from "@/components/smart-search";
import { useSupport } from "@/components/support/support-context";
import type { Actor } from "@/lib/auth/rbac";
import type { HeaderAlert } from "@/lib/desk/header-alerts";
import type { HeaderRecordContext } from "@/lib/desk/header-record";

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
  showBrand = true,
  recordContext,
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
  showBrand?: boolean;
  recordContext?: HeaderRecordContext | null;
}) {
  const { openSupport } = useSupport();
  return (
    <header
      className="ff-no-print flex flex-wrap items-center gap-3 border-b border-border bg-card px-5 py-3"
      data-ff-utility-chrome={utilityChrome ? "true" : "false"}
    >
      {utilityChrome ? (
        <div className="flex min-w-0 shrink-0 items-baseline gap-3">
          {showBrand ? (
            <Link href="/" className="shrink-0 text-base font-semibold text-navy" title="FitFirst home">
              FitFirst
            </Link>
          ) : null}
          <h1 className="text-xl font-semibold text-navy">{title}</h1>
        </div>
      ) : (
        <div className="min-w-0 shrink-0">
          {eyebrow ? (
            <div className="text-caption uppercase tracking-wide text-muted-foreground">
              {eyebrow}
            </div>
          ) : null}
          <h1 className="text-xl font-semibold text-navy">{title}</h1>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <SmartSearch />
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <HeaderRecordActions record={recordContext} />
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
