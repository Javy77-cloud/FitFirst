import Link from "next/link";
import { VelocityClockRail } from "@/components/deals/velocity-clock-rail";
import { RenewalHealthMeter } from "@/components/renewals/renewal-health-meter";
import type { RadarDealCard } from "@/lib/deals/radar-desk";
import { formatClockDays, formatDealValue, HEAT_LABELS } from "@/lib/deals/velocity";
import { cn } from "@/lib/utils";

export function PriorityStack({ cards }: { cards: RadarDealCard[] }) {
  if (cards.length === 0) {
    return (
      <p className="ff-deals-empty" data-ff-priority-stack-empty="">
        No shopping deals in this lens. Convert a lead or clear a chip.
      </p>
    );
  }

  return (
    <ol className="ff-priority-stack" data-ff-priority-stack="">
      {cards.map((card) => {
        const name = card.insured !== "—" ? card.insured : card.title;
        const product = card.productLabels[0] ?? card.lineOfBusiness;
        return (
          <li key={card.id}>
            <article
              className={cn("ff-stack-card", `ff-heat-${card.heat}`)}
              data-ff-stack-card={card.id}
              data-ff-heat={card.heat}
              data-ff-phase={card.phase}
            >
              <span className="ff-stack-glyph" aria-hidden data-ff-stack-glyph={card.heat} />
              <div className="ff-stack-card-body">
                <div className="ff-stack-card-spread">
                  <Link href={card.href} className="ff-stack-name">
                    {name}
                  </Link>
                  <span className="ff-stack-product" title={product}>
                    {product}
                  </span>
                  <span className="ff-stack-phase-days" title="Days in current phase">
                    {formatClockDays(card.daysInPhase)}
                    <small>in phase</small>
                  </span>
                  <span className="ff-stack-silent-days" title="Days silent">
                    {formatClockDays(card.silenceDays)}
                    <small>silent</small>
                  </span>
                  <span className="ff-stack-value">{formatDealValue(card.value, card.valueMetric)}</span>
                  <span className="sr-only">{HEAT_LABELS[card.heat]}</span>
                </div>
                <div className="ff-stack-card-meta">
                  <VelocityClockRail clocks={card.clocks} phase={card.phase} />
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
                    stars={card.clientHealth / 20}
                    policyStars={card.policyHealth / 20}
                    flagged={card.heat === "cold" || card.clientHealth < 40}
                  />
                  <span className="sr-only">{`Client health ${card.clientHealth}`}</span>
                </div>
              </div>
              <Link href={card.primaryAction.href} className="ff-stack-action">
                {card.primaryAction.label}
              </Link>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
