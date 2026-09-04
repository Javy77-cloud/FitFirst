import Link from "next/link";
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
      <p className="mb-3 text-sm text-muted-foreground">
        {session.isAdmin
          ? "Admin ranks every producer on conversion, retention, in-force premium, and binds. Quotes — including Ana Dib HO3 at $321,000 — are not written premium."
          : "Your book only. Other producers stay hidden. Ana Dib HO3 stays Quote Sent / unbound at $321,000."}{" "}
        Open{" "}
        <Link href="/glance" className="text-primary hover:underline">
          Glance
        </Link>{" "}
        for Sales / Service / Claims / Renewals.
      </p>

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
            <p className="text-[11px] text-muted-foreground">
              Rank follows the selected metric. Frozen logins stay on the sheet with historical figures.
            </p>
          </div>
          <ScorecardRankTable rows={visible} highlightId={session.userId} />
        </section>
      ) : (
        <section className="ff-card p-4">
          <h2 className="text-sm font-semibold text-navy">What you see</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Agents see their own conversion, retention, premium, and binds. Rank is your place on the
            agency sort — not a list of other producers. Admin opens the full ranked board.
          </p>
        </section>
      )}
    </AppShell>
  );
}
