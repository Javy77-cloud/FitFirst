"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Clock,
  Plus,
  RefreshCw,
  Sparkles,
  UserRound,
} from "lucide-react";
import { logoutDesk } from "@/app/actions/auth";
import { NotificationBell } from "@/components/desk/notification-bell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { HeaderAlert } from "@/lib/desk/header-alerts";
import { PROFILE_SETTINGS_HREF, QUICK_ACTIONS } from "@/lib/desk/quick-actions";
import {
  mergeRecent,
  parseRecordPath,
  pushLocalRecent,
  readLocalRecent,
  recentKindLabel,
  RECENT_STORAGE_KEY,
  type RecentRecord,
} from "@/lib/desk/recently-accessed";
import { listWhatsNew } from "@/lib/desk/whats-new";
import { cn } from "@/lib/utils";

export type HeaderSession = {
  name: string;
  isAdmin: boolean;
  isAgent: boolean;
  signedIn: boolean;
};

function chromeButtonClass(active = false) {
  return cn(
    "relative size-8 text-navy hover:bg-secondary",
    active && "bg-secondary",
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function roleLabel(session: HeaderSession) {
  if (session.isAdmin) return "Admin";
  if (session.isAgent) return "Agent";
  return "Guest";
}

export function HeaderUtilities({
  pageTitle,
  session,
  unread,
  alerts,
  recentStub,
}: {
  pageTitle: string;
  session: HeaderSession;
  unread: number;
  alerts: HeaderAlert[];
  recentStub: RecentRecord[];
}) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [spinning, setSpinning] = useState(false);
  const [localRecent, setLocalRecent] = useState<RecentRecord[]>([]);
  const whatsNew = listWhatsNew();
  const recent = useMemo(() => mergeRecent(localRecent, recentStub), [localRecent, recentStub]);

  useEffect(() => {
    setLocalRecent(readLocalRecent(window.localStorage.getItem(RECENT_STORAGE_KEY)));
  }, []);

  useEffect(() => {
    const parsed = parseRecordPath(pathname);
    if (!parsed) return;
    const title = pageTitle.trim() || recentKindLabel(parsed.kind);
    setLocalRecent((prev) => {
      const next = pushLocalRecent(prev, { ...parsed, title });
      window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, [pathname, pageTitle]);

  function refreshDesk() {
    setSpinning(true);
    router.refresh();
    window.setTimeout(() => setSpinning(false), 700);
  }

  return (
    <div className="flex shrink-0 items-center gap-0.5" data-testid="header-utilities">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={chromeButtonClass()}
        aria-label="Refresh"
        title="Refresh"
        onClick={refreshDesk}
      >
        <RefreshCw className={cn("size-3.5", spinning && "animate-spin")} />
      </Button>

      <NotificationBell
        unread={unread}
        alerts={alerts}
        triggerClassName={chromeButtonClass()}
      />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={chromeButtonClass()}
              aria-label="What’s New"
              title="What’s New"
            />
          }
        >
          <Sparkles className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 min-w-72">
          <DropdownMenuGroup>
            <DropdownMenuLabel>What’s New</DropdownMenuLabel>
            {whatsNew.map((entry) => (
              <DropdownMenuItem key={entry.id} className="items-start" disabled>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-navy">{entry.title}</span>
                  <span className="block text-xs text-muted-foreground">{entry.body}</span>
                  <span className="mt-0.5 block text-[11px] uppercase tracking-wide text-muted-foreground">
                    {entry.date}
                  </span>
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={chromeButtonClass()}
              aria-label="Recently accessed"
              title="Recently accessed"
            />
          }
        >
          <Clock className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 min-w-72">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Recently accessed</DropdownMenuLabel>
            {recent.length === 0 ? (
              <DropdownMenuItem disabled>
                Open a contact, deal, or policy. Last records also fill from the book.
              </DropdownMenuItem>
            ) : (
              recent.map((row) => (
                <DropdownMenuItem key={`${row.kind}-${row.id}`} render={<Link href={row.href} />}>
                  <span className="min-w-0">
                    <span className="block truncate">{row.title}</span>
                    <span className="block text-[11px] text-muted-foreground">{recentKindLabel(row.kind)}</span>
                  </span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={chromeButtonClass()}
              aria-label="Quick actions"
              title="Quick actions"
            />
          }
        >
          <Plus className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Quick actions</DropdownMenuLabel>
            {QUICK_ACTIONS.map((action) => (
              <DropdownMenuItem key={action.id} render={<Link href={action.href} />}>
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={chromeButtonClass()}
              aria-label="Profile menu"
              title="Profile"
            />
          }
        >
          {session.signedIn ? (
            <span className="flex size-6 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-navy">
              {initials(session.name)}
            </span>
          ) : (
            <UserRound className="size-3.5" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <span className="block truncate text-sm font-medium text-navy">{session.name || "Not signed in"}</span>
              <span className="mt-1 inline-flex rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy">
                {roleLabel(session)}
              </span>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem render={<Link href={PROFILE_SETTINGS_HREF} />}>Profile settings</DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/login" />}>
              {session.signedIn ? "Switch user" : "Sign in"}
            </DropdownMenuItem>
            {session.signedIn ? (
              <DropdownMenuItem
                onClick={() => {
                  void logoutDesk();
                }}
              >
                Sign out
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
