import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Col } from "@/components/column-picker";
import { SheetTbody } from "@/components/sheet/sheet-table";
import { OwnerDesk } from "@/components/home/owner-desk";
import { Button, buttonVariants } from "@/components/ui/button";
import { markAlertRead } from "@/app/actions/alerts";
import { dashboardStats, ownerHomeDashboard } from "@/lib/db/queries";
import { loadDeskLineSettings } from "@/lib/db/line-settings";
import { entityHref } from "@/lib/crm/display";
import { cn } from "@/lib/utils";
import { parseAttentionWindow } from "@/lib/home/attention-window";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ attention?: string; locked?: string }>;
}) {
  const params = await searchParams;
  const [{ snapshot, scope, tables }, { recentDeals, unread }, lineSettings] = await Promise.all([
    ownerHomeDashboard(),
    dashboardStats(),
    loadDeskLineSettings(),
  ]);
  const attentionWindow = parseAttentionWindow(params.attention);

  return (
    <AppShell
      title="Home"
      actions={
        <Link href="/deals/new" className={cn(buttonVariants())}>
          New shopping deal
        </Link>
      }
    >
      {params.locked === "modules" ? (
        <p className="mb-4 rounded-md bg-fit-yellow-bg px-3 py-2 text-sm text-fit-yellow">
          Modules are off for this login. Ask an Admin to turn on &quot;Can access modules&quot;
          under Settings → People / Agents.
        </p>
      ) : null}

      <OwnerDesk
        snapshot={snapshot}
        scope={scope}
        tables={tables}
        lineSettings={lineSettings}
        attentionWindow={attentionWindow}
      />

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
                <Col table="home-deals" col="title" as="th">Deal</Col>
                <Col table="home-deals" col="stage" as="th">Stage</Col>
                <Col table="home-deals" col="line" as="th">Line</Col>
              </tr>
            </thead>
            <SheetTbody>
              {recentDeals.map((deal) => (
                <tr key={deal.id}>
                  <Col table="home-deals" col="title">
                    <Link href={`/deals/${deal.id}`} className="font-medium text-primary hover:underline">
                      {deal.title}
                    </Link>
                  </Col>
                  <Col table="home-deals" col="stage" className="uppercase">
                    {deal.pipelineStage.replaceAll("_", " ")}
                  </Col>
                  <Col table="home-deals" col="line">{deal.lineOfBusiness}</Col>
                </tr>
              ))}
            </SheetTbody>
          </table>
        </section>
      </div>
    </AppShell>
  );
}
