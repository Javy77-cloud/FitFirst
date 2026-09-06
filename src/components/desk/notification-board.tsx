import Link from "next/link";
import { Check } from "lucide-react";
import { markAlertRead, markAllAlertsRead } from "@/app/actions/alerts";
import { Button } from "@/components/ui/button";
import {
  NOTIFICATION_EMPTY_BOARD,
  NOTIFICATION_IN_APP_COPY,
  followUpLeadHref,
  notificationHref,
  notificationWhen,
  parseFollowUpNotification,
} from "@/lib/desk/notifications";
import { recordHref } from "@/lib/desk/record-href";
import { cn } from "@/lib/utils";

export type BoardAlert = {
  id: string;
  title: string;
  body: string;
  severity: string;
  kind: string;
  readAt: Date | null;
  entityType: string | null;
  entityId: string | null;
  createdAt: Date;
};

export function NotificationBoard({ rows }: { rows: BoardAlert[] }) {
  const unread = rows.filter((row) => !row.readAt).length;

  return (
    <div data-testid="notification-board">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-base text-muted-foreground">{NOTIFICATION_IN_APP_COPY}</p>
        {unread > 0 ? (
          <form action={markAllAlertsRead}>
            <Button type="submit" size="sm" variant="outline">
              Mark all as read
            </Button>
          </form>
        ) : null}
      </div>

      <section className="ff-card divide-y divide-border">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-base text-muted-foreground">{NOTIFICATION_EMPTY_BOARD}</p>
        ) : (
          rows.map((alert) => {
            const href = notificationHref(
              recordHref(alert.entityType, alert.entityId) ??
                (alert.kind === "lead_follow_up" ? followUpLeadHref(alert.entityId) : null),
            );
            const read = Boolean(alert.readAt);
            const copy = parseFollowUpNotification(alert);
            return (
              <div key={alert.id} className="flex items-start gap-3 px-4 py-3">
                <form action={markAlertRead}>
                  <input type="hidden" name="alertId" value={alert.id} />
                  <button
                    type="submit"
                    disabled={read}
                    aria-label={read ? "Read" : "Mark as read"}
                    className={cn(
                      "mt-0.5 inline-flex size-7 items-center justify-center rounded-sm border",
                      read ? "border-fit-red/30 text-fit-red/40" : "border-fit-red text-fit-red hover:bg-fit-red-bg",
                    )}
                  >
                    <Check className="size-4" strokeWidth={3} />
                  </button>
                </form>
                <Link href={href} className="min-w-0 flex-1 text-left">
                  <span className={cn("block text-sm text-navy", !read && "font-semibold")}>
                    {copy.action}
                  </span>
                  <span className="mt-0.5 block text-sm text-navy/80">{copy.leadName}</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {notificationWhen(alert.createdAt)}
                  </span>
                </Link>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
