import { markAlertRead } from "@/app/actions/alerts";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { listAlerts } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const rows = await listAlerts();
  return (
    <AppShell title="In-app alerts">
      <p className="mb-3 text-base text-muted-foreground">
        Alerts stay in the desk. Nothing emails the agent.
      </p>
      <section className="ff-card divide-y divide-border">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-base text-muted-foreground">No alerts.</p>
        ) : (
          rows.map((alert) => (
            <div key={alert.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div>
                <div className="text-sm font-medium">{alert.title}</div>
                <p className="text-base text-muted-foreground">{alert.body}</p>
                <div className="mt-1 text-[11px] uppercase text-muted-foreground">
                  {alert.severity} · {alert.kind}
                  {alert.readAt ? " · read" : " · unread"}
                </div>
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
          ))
        )}
      </section>
    </AppShell>
  );
}
