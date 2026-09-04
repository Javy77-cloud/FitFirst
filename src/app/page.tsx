import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { OwnerDesk } from "@/components/home/owner-desk";
import { buttonVariants } from "@/components/ui/button";
import { dashboardStats, ownerHomeDashboard } from "@/lib/db/queries";
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
      <OwnerDesk
        snapshot={snapshot}
        scope={scope}
        tables={tables}
        alerts={unread.map((alert) => ({ id: alert.id, title: alert.title, body: alert.body }))}
        recentDeals={recentDeals.map((deal) => ({
          id: deal.id,
          title: deal.title,
          pipelineStage: deal.pipelineStage,
          lineOfBusiness: deal.lineOfBusiness,
        }))}
      />
    </AppShell>
  );
}
