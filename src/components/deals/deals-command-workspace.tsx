import { PriorityStack } from "@/components/deals/priority-stack";
import { DealsRadar } from "@/components/deals/deals-radar";
import { DealsLenses } from "@/components/deals/deals-lenses";
import type { DealsViewId } from "@/lib/deals/deals-views";
import type { RadarDealCard } from "@/lib/deals/radar-desk";
import { heatPulseShares, HEAT_LABELS, type HeatState } from "@/lib/deals/velocity";
import { cn } from "@/lib/utils";

export function DealsCommandWorkspace({
  view,
  cards,
  href,
  canSeeTeam,
  scorecards,
  rankLabel,
}: {
  view: DealsViewId;
  cards: RadarDealCard[];
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
  const counts = { hot: 0, cooling: 0, near_cold: 0, cold: 0 } as Record<HeatState, number>;
  for (const card of cards) counts[card.heat] += 1;
  const shares = heatPulseShares(cards.map((card) => card.heat));

  return (
    <div className="ff-deals-command" data-ff-deals-command="" data-ff-deals-view={view}>
      <section className="ff-deals-pulse" data-ff-deals-pulse="" aria-label="Book heat">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-navy">
            {view === "radar" ? "Agency radar" : "Priority stack"}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {view === "radar" ? "Time in phase → · Coverage A ↑" : "Urgency now · auto-ranked"}
          </p>
          <ul className="ff-deals-pulse-legend">
            {shares.map((share) => (
              <li key={share.heat} data-ff-pulse-heat={share.heat}>
                <span className={cn("ff-deals-pulse-swatch", `ff-heat-${share.heat}`)} aria-hidden />
                <span>{HEAT_LABELS[share.heat]}</span>
                <strong>{share.count}</strong>
              </li>
            ))}
          </ul>
        </div>
        {canSeeTeam ? (
          <dl className="ff-deals-scorecards" data-ff-deals-scorecards="">
            <div>
              <dt>Cold rate</dt>
              <dd>{scorecards.coldRate}%</dd>
            </div>
            <div>
              <dt>Median post-quote gap</dt>
              <dd>{scorecards.medianPostQuoteGap}d</dd>
            </div>
            <div>
              <dt>Hot now</dt>
              <dd>{scorecards.hot}</dd>
            </div>
          </dl>
        ) : null}
        {rankLabel ? (
          <p className="ff-private-rank" data-ff-private-rank="">
            Your velocity · {rankLabel}
          </p>
        ) : null}
      </section>

      <DealsLenses href={href} canSeeTeam={canSeeTeam} counts={counts} />

      {view === "radar" ? <DealsRadar cards={cards} /> : <PriorityStack cards={cards} />}
    </div>
  );
}
