import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { OwnerDesk } from "@/components/home/owner-desk";
import { buttonVariants } from "@/components/ui/button";
import { dashboardStats, ownerHomeDashboard } from "@/lib/db/queries";
import { loadDeskLineSettings } from "@/lib/db/line-settings";
import { cn } from "@/lib/utils";
import { parseAttentionWindow } from "@/lib/home/attention-window";
import { currentDeskSession } from "@/lib/auth/session";
import { loadSocialPulse } from "@/lib/social/store";
import { HomeSocialPulse } from "@/components/social/home-pulse";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ attention?: string; book?: string; locked?: string }>;
}) {
  const params = await searchParams;
  const session = await currentDeskSession();
  const role = session.isAdmin ? "admin" : "agent";
  const [home, { recentDeals, unread }, lineSettings, socialPulse] = await Promise.all([
    ownerHomeDashboard(params.book),
    dashboardStats(),
    loadDeskLineSettings(),
    loadSocialPulse(role),
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
        bookOptions={home.bookOptions}
        bookValue={params.book ?? "company"}
        attentionValue={params.attention}
      />
      <div className="mt-4">
        <HomeSocialPulse pulse={socialPulse} />
      </div>
    </AppShell>
  );
}
