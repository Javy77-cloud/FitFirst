import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ScorecardRankTable, ScorecardStatGrid } from "@/components/scorecards/scorecard-grid";
import { ScorecardSortTabs } from "@/components/scorecards/sort-tabs";
import { loadOneScorecard } from "@/lib/scorecards/load";

export const dynamic = "force-dynamic";

export default async function ProducerScorecardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { id } = await params;
  const q = await searchParams;
  const { session, sort, ranked, card, allowed } = await loadOneScorecard(id, q.sort);
  if (!card) notFound();
  if (!allowed) redirect("/scorecards");

  return (
    <AppShell title="Scorecards">
      <p className="mb-3 text-sm text-muted-foreground">
        <Link href="/scorecards" className="text-primary hover:underline">
          All scorecards
        </Link>
        {" · "}
        {card.name}
        {session.isAdmin ? (
          <>
            {" · "}
            <Link href={`/settings/agents/${card.userId}`} className="text-primary hover:underline">
              People / Agents
            </Link>
          </>
        ) : null}
        . Quotes are not written premium.
      </p>

      <div className="mb-4">
        <ScorecardSortTabs sort={sort} basePath={`/scorecards/${card.userId}`} />
      </div>

      <ScorecardStatGrid card={card} />

      {session.isAdmin ? (
        <section className="ff-card mt-4 overflow-x-auto">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-navy">Agency rank</h2>
          </div>
          <ScorecardRankTable rows={ranked} highlightId={card.userId} />
        </section>
      ) : null}
    </AppShell>
  );
}
