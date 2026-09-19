import Link from "next/link";
import { VelocityClockRail } from "@/components/deals/velocity-clock-rail";
import { RenewalHealthMeter } from "@/components/renewals/renewal-health-meter";
import type { RadarDealCard } from "@/lib/deals/radar-desk";
import { formatDealValue } from "@/lib/deals/velocity";
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
      {cards.map((card) => (
        <li key={card.id}>
          <article
            className={cn("ff-stack-card", `ff-heat-${card.heat}`)}
            data-ff-stack-card={card.id}
            data-ff-heat={card.heat}
            data-ff-phase={card.phase}
          >
            <span className="ff-stack-glyph" aria-hidden data-ff-stack-glyph={card.heat} />
            <div className="min-w-0 flex-1">
              <Link
                href={card.href}
                className="block truncate text-sm font-semibold text-navy hover:text-primary hover:underline"
              >
                {card.insured !== "—" ? card.insured : card.title}
              </Link>
              <div className="ff-stack-glance">
                <span className="ff-product-chip">{card.productLabels[0] ?? card.lineOfBusiness}</span>
                <span className="ff-stack-value">{formatDealValue(card.value, card.valueMetric)}</span>
                <VelocityClockRail clocks={card.clocks} phase={card.phase} compact />
              </div>
              <RenewalHealthMeter
                stars={card.clientHealth / 20}
                policyStars={card.policyHealth / 20}
                flagged={card.heat === "cold" || card.clientHealth < 40}
              />
              <span className="sr-only">{`Client health ${card.clientHealth}`}</span>
            </div>
            <Link href={card.primaryAction.href} className="ff-stack-action">
              {card.primaryAction.label}
            </Link>
          </article>
        </li>
      ))}
    </ol>
  );
}
