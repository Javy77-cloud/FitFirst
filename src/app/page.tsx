import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { dashboardStats } from "@/lib/db/queries";
import { DEAL_ID, FILL_DEAL_ID } from "@/lib/fixtures/ids";
import { markAlertRead } from "@/app/actions/alerts";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { stats, recentDeals, tasks, unread, expiring } = await dashboardStats();

  return (
    <AppShell
      title="Desk"
      actions={
        <Link href="/deals/new" className={cn(buttonVariants())}>
          New shopping deal
        </Link>
      }
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Leads", stats?.leads ?? 0, "/leads"],
          ["Open shops", stats?.shopping ?? 0, "/deals"],
          ["Contacts", stats?.contacts ?? 0, "/contacts"],
          ["Unread alerts", stats?.unreadAlerts ?? 0, "/alerts"],
        ].map(([label, value, href]) => (
          <Link key={label} href={String(href)} className="ff-card p-4 hover:border-primary">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-2xl font-semibold text-navy">{String(value)}</div>
          </Link>
        ))}
      </div>

      <div className="mb-4 ff-card p-4">
        <h2 className="text-sm font-semibold text-navy">Start here</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          FitFirst copies a solo Florida P&amp;C desk: lead → deal (shopping) → one Quote Sheet
          per line → contact and policy only after bind. Source PDFs stay on Files. Super-Copy
          is the packet the rater pastes. The day-one fixture is Ana Dib&apos;s 2026-09-02 Palm
          Bay HO3 shop: eight markets, zero bindable at $321,000.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href={`/deals/${DEAL_ID}`} className={cn(buttonVariants())}>
            Open Ana Dib HO3 shop
          </Link>
          <Link href={`/deals/${FILL_DEAL_ID}`} className={cn(buttonVariants({ variant: "outline" }))}>
            Ortega fill-demo shop
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
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
                    <div className="text-sm font-medium">{alert.title}</div>
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
            30 / 60 / 90 and expirations
          </div>
          {tasks.length === 0 && expiring.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Review tasks appear after bind. Nothing on the book yet besides the open shop.
            </p>
          ) : (
            <table className="ff-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <td>{task.title}</td>
                    <td>{task.dueDate.toISOString().slice(0, 10)}</td>
                  </tr>
                ))}
                {expiring.map((policy) => (
                  <tr key={policy.id}>
                    <td>Policy {policy.policyNumber} expires</td>
                    <td>{policy.expirationDate.toISOString().slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <section className="ff-card mt-4 overflow-hidden">
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
                <td className="uppercase">{deal.pipelineStage}</td>
                <td>{deal.lineOfBusiness}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
