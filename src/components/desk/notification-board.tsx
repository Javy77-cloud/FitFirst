import Link from "next/link";
import { markAlertRead, markAllAlertsRead } from "@/app/actions/alerts";
import { Button } from "@/components/ui/button";
import {
  NOTIFICATION_EMPTY_BOARD,
  NOTIFICATION_IN_APP_COPY,
  notificationHref,
  notificationWhen,
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
            const href = notificationHref(recordHref(alert.entityType, alert.entityId));
            const read = Boolean(alert.readAt);
            return (
              <div key={alert.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {!read ? (
                      <span className="size-2 shrink-0 rounded-full bg-fit-flag" aria-hidden />
                    ) : null}
                    <Link
                      href={href}
                      className={cn("text-sm text-navy hover:underline", !read && "font-semibold")}
                    >
                      {alert.title}
                    </Link>
                  </div>
                  <p className="mt-1 text-base text-muted-foreground">{alert.body}</p>
                  <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                    {alert.severity} · {alert.kind}
                    {notificationWhen(alert.createdAt) ? ` · ${notificationWhen(alert.createdAt)}` : ""}
                    {read ? " · read" : " · unread"}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Link href={href} className="text-sm text-primary hover:underline">
                    Open
                  </Link>
                  {!read ? (
                    <form action={markAlertRead}>
                      <input type="hidden" name="alertId" value={alert.id} />
                      <Button type="submit" size="xs" variant="ghost">
                        Mark as read
                      </Button>
                    </form>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
