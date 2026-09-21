import Link from "next/link";
import { startByoOauth } from "@/app/actions/byo-oauth";
import { syncDeskBusyNow } from "@/app/actions/calendar-sync";
import { Button } from "@/components/ui/button";
import { byoOauthWallCopy } from "@/lib/integrations/byo-credentials";
import { displayBusySyncError, formatBusySyncedAt } from "@/lib/integrations/calendar-sync";

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
  return (
    <section className="ff-calendar-sync" data-ff-calendar-sync="">
      {notice === "busy-synced" && !vendorError ? (
        <p className="mb-2 text-sm text-navy">External busy is on the desk calendar.</p>
      ) : null}
      {showFailed ? (
        <p className="mb-2 text-sm text-navy" data-ff-calendar-busy-error="">
          Busy sync failed. {vendorError || "Try Sync now, or reconnect in Settings."}
        </p>
      ) : null}
      {notice === "byo-connected" ? (
        <p className="mb-2 text-sm text-navy">Google Calendar connected. External busy will sync onto this desk.</p>
      ) : null}
      {notice === "oauth-wall" ? (
        <p className="mb-2 text-sm text-navy" data-ff-oauth-wall="">
          {byoOauthWallCopy(lastOauthError)}
        </p>
      ) : null}
      {notice === "admin-only" ? (
        <p className="mb-2 text-sm text-navy">Only Agency Admin can connect Google Calendar.</p>
      ) : null}
      {connected ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-navy" data-ff-calendar-last-synced="">
            {googleConnected ? "Google" : ""}
            {googleConnected && outlookConnected ? " + " : ""}
            {outlookConnected ? "Outlook" : ""}{" "}
            busy last synced {formatBusySyncedAt(lastSyncedAt)}
            {googleEmail ? ` · ${googleEmail}` : ""}
            {overlayCount > 0 ? ` · ${overlayCount} Google event${overlayCount === 1 ? "" : "s"}` : ""}
          </p>
          <form action={syncDeskBusyNow}>
            <Button type="submit" size="sm" variant="outline" data-ff-calendar-sync-now="">
              Sync now
            </Button>
          </form>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2" data-ff-calendar-connect="">
          <p className="text-sm text-navy">
            Connect Google Calendar to show external busy on this desk. Two-way event push is later —
            busy blocks book around you today.
          </p>
          {canConnect ? (
            <form action={startByoOauth}>
              <input type="hidden" name="provider" value="google_calendar" />
              <input type="hidden" name="next" value="/calendar" />
              <Button type="submit" size="sm">
                Connect Google Calendar
              </Button>
            </form>
          ) : (
            <Link href="/settings/integrations#google_calendar" className="text-sm text-primary hover:underline">
              Settings → Integrations
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
