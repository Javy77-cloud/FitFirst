import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { OwnerDesk } from "@/components/home/owner-desk";
import { buttonVariants } from "@/components/ui/button";
import { dashboardStats, ownerHomeDashboard } from "@/lib/db/queries";
import { loadDeskLineSettings } from "@/lib/db/line-settings";
import { cn } from "@/lib/utils";
import { parseAttentionWindow } from "@/lib/home/attention-window";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ attention?: string }>;
}) {
  const params = await searchParams;
  const [home, { recentDeals, unread }, lineSettings] = await Promise.all([
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
      <OwnerDesk
        snapshot={home.snapshot}
        scope={home.scope}
        tables={home.tables}
        lineSettings={lineSettings}
        attentionWindow={attentionWindow}
        prefs={home.prefs}
        contests={home.contests}
        leadOffers={home.leadOffers}
        agents={home.agents}
        currentUserId={home.currentUserId}
        showCompanyWidgets={home.showCompanyWidgets}
        agencyHighlight={home.agencyHighlight}
        isAdmin={home.isAdmin}
        isAgent={home.isAgent}
        unread={unread}
        recentDeals={recentDeals}
      />
    </AppShell>
  );
}
