import Link from "next/link";
import { RenewalHealthMeter } from "@/components/renewals/renewal-health-meter";
import { formatMoney } from "@/lib/domain";
import type { RenewalBoardCard } from "@/lib/renewal/board-data";
import {
  RENEWAL_URGENCY_META,
  rankRenewalCards,
  renewalDaysPhrase,
  renewalUrgencyBand,
} from "@/lib/renewal/urgency";
import { cn } from "@/lib/utils";

export function RenewalsPriorityStack({ cards }: { cards: RenewalBoardCard[] }) {
  const ranked = rankRenewalCards(cards);

  if (ranked.length === 0) {
    return (
      <p className="ff-deals-empty" data-ff-renewals-stack-empty="">
        No renewals in this lens.
      </p>
    );
  }

  return (
    <ol className="ff-priority-stack" data-ff-renewals-priority-stack="">
      {ranked.map((card) => {
        const band = renewalUrgencyBand(card.daysUntil);
        const meta = RENEWAL_URGENCY_META[band];
        return (
          <li key={card.queueId}>
            <article
              className={cn("ff-stack-card", `ff-urgency-tone-${meta.tone}`)}
              data-ff-renewals-stack-card={card.queueId}
              data-ff-urgency-card={band}
            >
              <span className="ff-stack-glyph" aria-hidden data-ff-stack-glyph={band} />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/policies/${card.policyId}`}
                  className="block truncate text-sm font-semibold text-navy hover:text-primary hover:underline"
                >
                  {card.clientName}
                </Link>
                <div className="ff-stack-glance">
                  <span className="ff-product-chip">{meta.shortLabel}</span>
                  <span className="ff-stack-value">{renewalDaysPhrase(card.daysUntil)}</span>
                  {card.premium ? <span className="ff-stack-value">{formatMoney(card.premium)}</span> : null}
                </div>
                {card.inboxCue ? (
                  <p className="ff-inbox-cue" data-ff-inbox-cue="">
                    {card.inboxHref ? (
                      <Link href={card.inboxHref} className="hover:underline">
                        {card.inboxCue}
                      </Link>
                    ) : (
                      card.inboxCue
                    )}
                  </p>
                ) : null}
                <RenewalHealthMeter
                  stars={card.healthStars}
                  policyStars={card.policyHealthStars}
                  flagged={card.healthFlagged}
                  source={card.healthSource}
                />
              </div>
              <Link href={`/policies/${card.policyId}`} className="ff-stack-action">
                Open
              </Link>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
