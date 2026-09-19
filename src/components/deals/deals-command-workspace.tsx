import { PriorityStack } from "@/components/deals/priority-stack";
import { DealsRadar } from "@/components/deals/deals-radar";
import { DealsLenses } from "@/components/deals/deals-lenses";
import { DealsHeatPulse } from "@/components/deals/deals-heat-pulse";
import type { DealsViewId } from "@/lib/deals/deals-views";
import type { RadarDealCard } from "@/lib/deals/radar-desk";
import type { HeatState } from "@/lib/deals/velocity";

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

  return (
    <div className="ff-deals-command" data-ff-deals-command="" data-ff-deals-view={view}>
      <DealsHeatPulse
        heats={cards.map((card) => card.heat)}
        view={view}
        rankLabel={rankLabel}
        coldRate={scorecards.coldRate}
      />

      <DealsLenses href={href} canSeeTeam={canSeeTeam} counts={counts} />

      {view === "radar" ? <DealsRadar cards={cards} /> : <PriorityStack cards={cards} />}
    </div>
  );
}
