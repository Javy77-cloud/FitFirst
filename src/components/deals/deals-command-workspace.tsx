import { DealsHostList } from "@/components/deals/deals-host-list";
import { dealDisplayName } from "@/components/deals/deal-host-face";
import { StandardActivityShell } from "@/components/desk/standard-activity-panel";
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
  const shownHeats = cards.map((card) => card.heat);
  const pulse = (
    <DealsHeatPulse
      heats={shownHeats}
      phases={cards.map((card) => card.phase)}
      view={view === "radar" ? "radar" : "stack"}
      rankLabel={rankLabel}
      coldRate={scorecards.coldRate}
      variant="banner"
    />
  );

  return (
    <div className="ff-deals-command" data-ff-deals-command="" data-ff-deals-view={view}>
      <DealsLenses href={href} canSeeTeam={canSeeTeam} counts={chipCounts} />

      {view === "radar" ? (
        <section data-ff-book-heat="" aria-label="Book heat">
          <DealsRadar cards={cards} />
        </section>
      ) : view === "list" ? (
        <StandardActivityShell
          surface="deals-list"
          rows={cards.map((card) => ({
            id: card.id,
            name: dealDisplayName(card),
            email: card.email,
            phone: card.phone,
            dealId: card.id,
            leadId: card.leadId,
            contactId: card.contactId,
            accountId: card.accountId,
          }))}
        >
          <DealsHostList cards={cards} />
        </StandardActivityShell>
      ) : (
        <div className="ff-stack-workspace" data-ff-stack-workspace="">
          {pulse}
          <StandardActivityShell
            surface="deals-stack"
            rows={cards.map((card) => ({
              id: card.id,
              name: dealDisplayName(card),
              email: card.email,
              phone: card.phone,
              dealId: card.id,
              leadId: card.leadId,
              contactId: card.contactId,
              accountId: card.accountId,
            }))}
          >
            <PriorityStack cards={cards} />
          </StandardActivityShell>
        </div>
      )}
    </div>
  );
}
