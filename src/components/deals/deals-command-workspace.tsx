import { PriorityStack } from "@/components/deals/priority-stack";
import { DealsRadar } from "@/components/deals/deals-radar";
import { DealsLenses } from "@/components/deals/deals-lenses";
import { DealsHeatPulse } from "@/components/deals/deals-heat-pulse";
import type { DealsViewId } from "@/lib/deals/deals-views";
import type { RadarDealCard } from "@/lib/deals/radar-desk";
import { HEAT_LABELS, HEAT_STATES, heatCounts, type HeatState } from "@/lib/deals/velocity";
import { cn } from "@/lib/utils";

function BookHeatHeader({
  counts,
  total,
}: {
  counts: Record<HeatState, number>;
  total: number;
}) {
  return (
    <section className="ff-book-heat-header" data-ff-book-heat="" aria-label="Book heat">
      <div className="ff-book-heat-title">
        <p>Book heat</p>
        <strong data-ff-book-heat-total="">{total}</strong>
        <span>{total === 1 ? "deal" : "deals"} · silence clock</span>
      </div>
      <ul className="ff-book-heat-counts" data-ff-book-heat-counts="">
        {HEAT_STATES.map((heat) => (
          <li key={heat} className={cn("ff-book-heat-count", `ff-heat-${heat}`)} data-ff-book-heat-row={heat}>
            <i className="ff-book-heat-swatch" aria-hidden />
            <span>{HEAT_LABELS[heat]}</span>
            <strong>{counts[heat]}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DealsCommandWorkspace({
  view,
  cards,
  chipCounts,
  href,
  canSeeTeam,
  scorecards,
  rankLabel,
}: {
  view: DealsViewId;
  cards: RadarDealCard[];
  chipCounts: Record<HeatState, number>;
  href: {
    view: DealsViewId;
    pipeline?: string | null;
    family?: string | null;
    pcSub?: string | null;
    lifeSub?: string | null;
    healthSub?: string | null;
    heat?: string | null;
    lens?: string | null;
    scope?: string | null;
    valueBand?: string | null;
    q?: string | null;
  };
  canSeeTeam: boolean;
  scorecards: { open: number; cold: number; coldRate: number; medianPostQuoteGap: number; hot: number };
  rankLabel: string | null;
}) {
  const shownHeats = cards.map((card) => card.heat);
  const bookHeatCounts = heatCounts(shownHeats);
  const pulse = (
    <DealsHeatPulse
      heats={shownHeats}
      phases={cards.map((card) => card.phase)}
      view={view}
      rankLabel={rankLabel}
      coldRate={scorecards.coldRate}
      variant="aside"
    />
  );

  return (
    <div className="ff-deals-command" data-ff-deals-command="" data-ff-deals-view={view}>
      {view === "radar" ? <BookHeatHeader counts={bookHeatCounts} total={cards.length} /> : null}

      <DealsLenses href={href} canSeeTeam={canSeeTeam} counts={chipCounts} />

      {view === "radar" ? (
        <DealsRadar cards={cards} />
      ) : (
        <div className="ff-stack-workspace" data-ff-stack-workspace="">
          <PriorityStack cards={cards} />
          {pulse}
        </div>
      )}
    </div>
  );
}
