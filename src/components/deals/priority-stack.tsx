import Link from "next/link";
import { DealStatusStamp } from "@/components/deal/deal-status-stamp";
import { DealQuickActions } from "@/components/deals/deal-quick-actions";
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
      {cards.map((card, index) => (
        <li key={card.id}>
          <article
            className={cn("ff-stack-card", `ff-heat-${card.heat}`)}
            data-ff-stack-card={card.id}
            data-ff-heat={card.heat}
            data-ff-phase={card.phase}
          >
            <span className="ff-stack-glyph" aria-hidden data-ff-stack-glyph={card.heat} />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-1">
                    <Link
                      href={card.href}
                      className="truncate text-sm font-semibold text-navy hover:text-primary hover:underline"
                    >
                      {card.insured !== "—" ? card.insured : card.title}
                    </Link>
                    <DealQuickActions
                      dealId={card.id}
                      phone={card.phone}
                      email={card.email}
                      contactId={card.contactId}
                      leadId={card.leadId}
                      accountId={card.accountId}
                    />
                  </div>
                  <p className="ff-stack-meta">
                    {card.productLabels[0] ?? card.lineOfBusiness}
                    {" · "}
                    {card.clockLabel}
                    {" · "}
                    {formatDealValue(card.value, card.valueMetric)}
                  </p>
                </div>
                <span className="ff-stack-rank" aria-hidden>
                  {index + 1}
                </span>
              </div>
              <div className="ff-stack-foot">
                {card.stageStamp ? <DealStatusStamp stage={card.stageStamp} /> : null}
                <span
                  className="ff-health-dot"
                  title={`Client health ${card.clientHealth}`}
                  data-health={card.clientHealth >= 70 ? "good" : card.clientHealth >= 40 ? "watch" : "low"}
                  aria-label={`Client health ${card.clientHealth}`}
                />
              </div>
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
