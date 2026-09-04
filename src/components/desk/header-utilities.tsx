"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Clock,
  LifeBuoy,
  Plus,
  RefreshCw,
  Sparkles,
  UserRound,
} from "lucide-react";
import { logoutDesk } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { HeaderAlert } from "@/lib/desk/header-alerts";
import {
  NOTIFICATION_LINKS,
  PROFILE_SETTINGS_HREF,
  QUICK_ACTIONS,
  SUPPORT_COPY,
  SUPPORT_HREF,
} from "@/lib/desk/quick-actions";
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

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={chromeButtonClass()}
              aria-label="Notifications"
              title="Notifications"
            />
          }
        >
          <Bell className="size-3.5" />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 min-w-3.5 rounded-sm bg-fit-flag px-1 text-[9px] font-semibold leading-4 text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 min-w-72">
          <DropdownMenuLabel>In-app alerts</DropdownMenuLabel>
          {alerts.length === 0 ? (
            <p className="px-1.5 py-3 text-xs text-muted-foreground">No alerts.</p>
          ) : (
            alerts.map((alert) => (
              <DropdownMenuItem
                key={alert.id}
                className="items-start"
                render={<Link href={alert.href ?? "/alerts"} />}
              >
                <span className="min-w-0">
                  <span className={cn("block truncate", !alert.read && "font-semibold")}>{alert.title}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{alert.body}</span>
                </span>
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Quick links</DropdownMenuLabel>
          {NOTIFICATION_LINKS.map((link) => (
            <DropdownMenuItem key={link.href} render={<Link href={link.href} />}>
              {link.label}
            </DropdownMenuItem>
          ))}
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
              aria-label="What’s New"
              title="What’s New"
            />
          }
        >
          <Sparkles className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 min-w-72">
          <DropdownMenuLabel>What’s New</DropdownMenuLabel>
          {whatsNew.map((entry) => (
            <div key={entry.id} className="px-1.5 py-1.5">
              <div className="text-sm font-medium text-navy">{entry.title}</div>
              <p className="text-xs text-muted-foreground">{entry.body}</p>
              <div className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">{entry.date}</div>
            </div>
          ))}
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
          <DropdownMenuLabel>Recently accessed</DropdownMenuLabel>
          {recent.length === 0 ? (
            <p className="px-1.5 py-3 text-xs text-muted-foreground">
              Open a contact, deal, or policy. Last records also fill from the book.
            </p>
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
          <DropdownMenuLabel>Quick actions</DropdownMenuLabel>
          {QUICK_ACTIONS.map((action) => (
            <DropdownMenuItem key={action.id} render={<Link href={action.href} />}>
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog>
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={chromeButtonClass()}
              aria-label="Support"
              title="Support"
            />
          }
        >
          <LifeBuoy className="size-3.5" />
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Support</DialogTitle>
            <DialogDescription>{SUPPORT_COPY}</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Same stub for Admin and Agent. The sidebar Support row stays so this is not forgotten.
          </p>
          <Link href={SUPPORT_HREF} className="text-sm text-primary hover:underline">
            Open Support page
          </Link>
        </DialogContent>
      </Dialog>

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
          <DropdownMenuLabel>
            <span className="block truncate text-sm font-medium text-navy">{session.name || "Not signed in"}</span>
            <span className="mt-1 inline-flex rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy">
              {roleLabel(session)}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
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
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
