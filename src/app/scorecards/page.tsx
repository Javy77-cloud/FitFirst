import { AppShell } from "@/components/app-shell";
import { ScorecardRankTable, ScorecardStatGrid } from "@/components/scorecards/scorecard-grid";
import { ScorecardSortTabs } from "@/components/scorecards/sort-tabs";
import { loadProducerScorecards } from "@/lib/scorecards/load";

export const dynamic = "force-dynamic";

export default async function ScorecardsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const params = await searchParams;
  const { session, sort, visible } = await loadProducerScorecards(params.sort);
  const own = visible.find((row) => row.userId === session.userId) ?? visible[0] ?? null;

  return (
    <AppShell title="Scorecards">

      <div className="mb-4">
        <ScorecardSortTabs sort={sort} />
      </div>

      {own ? (
        <section className="mb-4">
          <h2 className="mb-2 text-sm font-semibold text-navy">
            {session.isAdmin ? `${own.name} · your card` : `${own.name} · rank ${own.rank}`}
          </h2>
          <ScorecardStatGrid card={own} />
        </section>
      ) : (
        <p className="mb-4 rounded-md bg-fit-yellow-bg px-3 py-2 text-sm text-fit-yellow">
          No scorecard for this login yet. Bind a shop (not Ana) to start the count.
        </p>
      )}

      {session.isAdmin ? (
        <section className="ff-card overflow-x-auto">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-navy">Ranked producers</h2>

          </div>
          <ScorecardRankTable rows={visible} highlightId={session.userId} />
        </section>
      ) : (
        <section className="ff-card p-4">
          <h2 className="text-sm font-semibold text-navy">What you see</h2>

        </section>
      )}
    </AppShell>
  );
}
