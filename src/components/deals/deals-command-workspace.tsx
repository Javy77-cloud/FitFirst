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
  const pulse = (
    <DealsHeatPulse
      heats={cards.map((card) => card.heat)}
      phases={cards.map((card) => card.phase)}
      view={view}
      rankLabel={rankLabel}
      coldRate={scorecards.coldRate}
      variant={view === "stack" ? "aside" : "banner"}
    />
  );

  return (
    <div className="ff-deals-command" data-ff-deals-command="" data-ff-deals-view={view}>
      {view === "radar" ? pulse : null}

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
