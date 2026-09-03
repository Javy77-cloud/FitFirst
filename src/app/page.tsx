import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { OwnerDesk } from "@/components/home/owner-desk";
import { Button, buttonVariants } from "@/components/ui/button";
import { markAlertRead } from "@/app/actions/alerts";
import { dashboardStats, ownerHomeDashboard } from "@/lib/db/queries";
import { entityHref } from "@/lib/crm/display";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [{ snapshot, scope, tables }, { recentDeals, unread }] = await Promise.all([
    ownerHomeDashboard(),
    dashboardStats(),
  ]);

  return (
    <AppShell
      title="Home"
      actions={
        <Link href="/deals/new" className={cn(buttonVariants())}>
          New shopping deal
        </Link>
      }
    >
      <OwnerDesk snapshot={snapshot} scope={scope} tables={tables} />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="ff-card overflow-hidden">
          <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
            In-app alerts
          </div>
          {unread.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No unread alerts.</p>
          ) : (
            <ul className="divide-y divide-border">
              {unread.map((alert) => (
                <li key={alert.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div>
                    {entityHref(alert.entityType, alert.entityId) ? (
                      <Link
                        href={entityHref(alert.entityType, alert.entityId)!}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {alert.title}
                      </Link>
                    ) : (
                      <div className="text-sm font-medium">{alert.title}</div>
                    )}
                    <p className="text-xs text-muted-foreground">{alert.body}</p>
                  </div>
                  <form action={markAlertRead}>
                    <input type="hidden" name="alertId" value={alert.id} />
                    <Button type="submit" variant="ghost" size="xs">
                      Dismiss
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="ff-card overflow-hidden">
          <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
            Recent deals
          </div>
          <table className="ff-table">
            <thead>
              <tr>
                <th>Deal</th>
                <th>Stage</th>
                <th>Line</th>
              </tr>
            </thead>
            <tbody>
              {recentDeals.map((deal) => (
                <tr key={deal.id}>
                  <td>
                    <Link href={`/deals/${deal.id}`} className="font-medium text-primary hover:underline">
                      {deal.title}
                    </Link>
                  </td>
                  <td className="uppercase">{deal.pipelineStage.replaceAll("_", " ")}</td>
                  <td>{deal.lineOfBusiness}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </AppShell>
  );
}
