import Link from "next/link";
import { markAlertRead } from "@/app/actions/alerts";
import { AppShell } from "@/components/app-shell";
import { RecordLink } from "@/components/record-links";
import { Button } from "@/components/ui/button";
import { listAlerts } from "@/lib/db/queries";
import { recordHref } from "@/lib/desk/record-href";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const rows = await listAlerts();
  return (
    <AppShell title="In-app alerts">
      <p className="mb-3 text-sm text-muted-foreground">
        Alerts stay in the desk. Nothing emails the agent.
      </p>
      <section className="ff-card divide-y divide-border">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No alerts.</p>
        ) : (
          rows.map((alert) => {
            const href = recordHref(alert.entityType, alert.entityId);
            return (
            <div key={alert.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div>
                <div className="text-sm font-medium">{alert.title}</div>
                <p className="text-xs text-muted-foreground">{alert.body}</p>
                {href ? (
                  <p className="mt-1 text-xs">
                    <RecordLink href={href}>Open record</RecordLink>
                  </p>
                ) : null}
                <div className="mt-1 text-[11px] uppercase text-muted-foreground">
                  {alert.severity} · {alert.kind}
                  {alert.readAt ? " · read" : " · unread"}
                </div>
                {recordHref(alert.entityType, alert.entityId) ? (
                  <Link
                    href={recordHref(alert.entityType, alert.entityId)!}
                    className="mt-1 inline-block text-xs text-primary hover:underline"
                  >
                    Open record
                  </Link>
                ) : null}
              </div>
              {!alert.readAt ? (
                <form action={markAlertRead}>
                  <input type="hidden" name="alertId" value={alert.id} />
                  <Button type="submit" size="xs" variant="ghost">
                    Dismiss
                  </Button>
                </form>
              ) : null}
            </div>
            );
          })
        )}
      </section>
    </AppShell>
  );
}
