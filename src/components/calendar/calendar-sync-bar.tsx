"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, RefreshCw } from "lucide-react";
import { startByoOauth } from "@/app/actions/byo-oauth";
import { syncDeskBusyNow } from "@/app/actions/calendar-sync";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { flashAction } from "@/lib/flash-client";
import { byoOauthWallCopy } from "@/lib/integrations/byo-credentials";
import { displayBusySyncError, formatBusySyncedAt } from "@/lib/integrations/calendar-sync";

function vendorLabel(googleConnected: boolean, outlookConnected: boolean) {
  if (googleConnected && outlookConnected) return "Google + Outlook";
  if (outlookConnected) return "Outlook";
  return "Google";
}

function CalendarSyncNotice({
  notice,
  vendorError,
}: {
  notice?: string | null;
  vendorError: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!notice) return;
    if (notice === "busy-synced" && !vendorError) {
      flashAction("busy-synced");
    } else if (notice === "byo-connected") {
      flashAction("Google Calendar connected");
    } else if (notice === "busy-sync-failed") {
      flashAction(vendorError || "busy-sync-failed", "error");
    } else {
      return;
    }
    const next = new URLSearchParams(searchParams.toString());
    next.delete("notice");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [notice, pathname, router, searchParams, vendorError]);

  return null;
}

export function CalendarSyncBar({
  googleConnected,
  outlookConnected,
  lastSyncedAt,
  canConnect,
  googleEmail,
  overlayCount,
  notice,
  syncError,
  lastOauthError,
}: {
  googleConnected: boolean;
  outlookConnected: boolean;
  lastSyncedAt: Date | string | null;
  canConnect: boolean;
  googleEmail: string | null;
  overlayCount: number;
  notice?: string | null;
  syncError?: string | null;
  lastOauthError?: string | null;
}) {
  const connected = googleConnected || outlookConnected;
  const vendorError = displayBusySyncError(syncError);
  const showFailed = notice === "busy-sync-failed" || Boolean(vendorError);
  const needsConnectAction = !connected && (notice === "oauth-wall" || notice === "admin-only" || Boolean(lastOauthError));

  return (
    <div className="flex items-center justify-end" data-ff-calendar-sync="" data-calendar-toolbar="sync">
      <Suspense fallback={null}>
        <CalendarSyncNotice notice={notice} vendorError={vendorError} />
      </Suspense>
      {connected ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={
                  showFailed
                    ? "h-8 gap-1 border-destructive/50 text-destructive"
                    : "h-8 gap-1"
                }
                data-ff-calendar-sync-trigger=""
                aria-label={`${vendorLabel(googleConnected, outlookConnected)} calendar sync`}
              />
            }
          >
            <RefreshCw className="size-3.5" data-icon="inline-start" />
            Sync
            <ChevronDown className="size-3.5 opacity-80" data-icon="inline-end" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-2.5">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-navy">
                {vendorLabel(googleConnected, outlookConnected)} calendar
              </p>
              <p className="text-xs leading-snug text-muted-foreground" data-ff-calendar-last-synced="">
                Last synced {formatBusySyncedAt(lastSyncedAt)}
                {googleEmail ? (
                  <>
                    <br />
                    <span className="break-all">{googleEmail}</span>
                  </>
                ) : null}
                {overlayCount > 0 ? (
                  <>
                    <br />
                    {overlayCount} event{overlayCount === 1 ? "" : "s"}
                  </>
                ) : null}
              </p>
              {showFailed ? (
                <p className="text-xs leading-snug text-destructive" data-ff-calendar-busy-error="">
                  {vendorError || "Calendar sync failed. Try Sync now, or reconnect in Settings."}
                </p>
              ) : null}
              <form action={syncDeskBusyNow}>
                <Button type="submit" size="sm" className="w-full" data-ff-calendar-sync-now="">
                  Sync now
                </Button>
              </form>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <DropdownMenu defaultOpen={needsConnectAction}>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                size="sm"
                variant={needsConnectAction ? "default" : "outline"}
                className="h-8"
                data-ff-calendar-connect-trigger=""
              />
            }
          >
            Connect
            <ChevronDown className="size-3.5 opacity-80" data-icon="inline-end" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 p-2.5">
            <div className="space-y-2" data-ff-calendar-connect="">
              {notice === "oauth-wall" || lastOauthError ? (
                <p className="text-xs leading-snug text-navy" data-ff-oauth-wall="">
                  {byoOauthWallCopy(lastOauthError)}
                </p>
              ) : notice === "admin-only" ? (
                <p className="text-xs leading-snug text-navy">Only Agency Admin can connect Google Calendar.</p>
              ) : (
                <p className="text-xs leading-snug text-navy">
                  Show Google events on this desk.
                </p>
              )}
              {canConnect ? (
                <form action={startByoOauth}>
                  <input type="hidden" name="provider" value="google_calendar" />
                  <input type="hidden" name="next" value="/calendar" />
                  <Button type="submit" size="sm" className="w-full">
                    Connect Google Calendar
                  </Button>
                </form>
              ) : (
                <Link
                  href="/settings/integrations#google_calendar"
                  className="block text-xs font-medium text-primary hover:underline"
                >
                  Settings → Integrations
                </Link>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
