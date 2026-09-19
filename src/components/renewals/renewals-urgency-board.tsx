import { RenewalBoardCardView } from "@/components/renewals/renewal-card";
import type { RenewalBoardCard } from "@/lib/renewal/board-data";
import {
  RENEWAL_URGENCY_BANDS,
  RENEWAL_URGENCY_META,
  renewalUrgencyBand,
  type RenewalUrgencyBand,
} from "@/lib/renewal/urgency";
import { cn } from "@/lib/utils";

function groupByUrgency(cards: RenewalBoardCard[]): Record<RenewalUrgencyBand, RenewalBoardCard[]> {
  const groups: Record<RenewalUrgencyBand, RenewalBoardCard[]> = {
    under30: [],
    "30to60": [],
    "60to90": [],
    "90plus": [],
  };
  for (const card of cards) {
    groups[renewalUrgencyBand(card.daysUntil)].push(card);
  }
  return groups;
}

export function RenewalsUrgencyBoard({ cards }: { cards: RenewalBoardCard[] }) {
  const groups = groupByUrgency(cards);

  return (
    <div className="ff-renewals-urgency-board" data-ff-renewals-urgency-board="">
      {RENEWAL_URGENCY_BANDS.map((band) => {
        const column = groups[band];
        const meta = RENEWAL_URGENCY_META[band];
        return (
          <section
            key={band}
            className={cn("ff-renewals-urgency-col", `ff-urgency-tone-${meta.tone}`)}
            data-ff-urgency-band={band}
          >
            <header className="ff-renewals-urgency-head">
              <h2>{meta.label}</h2>
              <span>{column.length}</span>
            </header>
            <div className="ff-renewals-urgency-cards">
              {column.length === 0 ? (
                <p className="ff-renewals-urgency-empty">No renewals in this band.</p>
              ) : (
                column.map((card) => <RenewalBoardCardView key={card.queueId} card={card} canDrag={false} />)
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
