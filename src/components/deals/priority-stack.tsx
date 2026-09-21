"use client";

import Link from "next/link";
import { DealHostJob, DealHostSpread } from "@/components/deals/deal-host-face";
import { StackQuickComms } from "@/components/desk/stack-quick-comms";
import { PriorityPinControl, usePriorityPins, orderWithPriorityPins } from "@/components/deals/priority-pin-control";
import type { RadarDealCard } from "@/lib/deals/radar-desk";
import { HEAT_LABELS } from "@/lib/deals/velocity";
import { cn } from "@/lib/utils";

export function PriorityStack({ cards }: { cards: RadarDealCard[] }) {
  const { pins, setRank } = usePriorityPins();
  const ordered = orderWithPriorityPins(cards, pins);

  if (ordered.length === 0) {
    return (
      <p className="ff-deals-empty" data-ff-priority-stack-empty="">
        No shopping deals in this lens. Convert a lead or clear a chip.
      </p>
    );
  }

  return (
    <ol className="ff-priority-stack" data-ff-priority-stack="">
      {ordered.map((card) => {
        const rank = pins[card.id] ?? null;
        return (
          <li key={card.id}>
            <article
              className={cn("ff-stack-card", `ff-heat-${card.heat}`)}
              data-ff-stack-card={card.id}
              data-ff-heat={card.heat}
              data-ff-phase={card.phase}
              data-ff-priority-rank={rank ?? undefined}
            >
              <span className="ff-stack-glyph" aria-hidden data-ff-stack-glyph={card.heat} />
              <div className="ff-stack-card-body">
                <DealHostSpread
                  card={card}
                  comms={
                    <StackQuickComms
                      name={card.insured !== "—" ? card.insured : card.title}
                      email={card.email}
                      phone={card.phone}
                      dealId={card.id}
                      leadId={card.leadId}
                      contactId={card.contactId}
                      accountId={card.accountId}
                    />
                  }
                />
                <DealHostJob card={card} />
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
              </div>
              <PriorityPinControl id={card.id} rank={rank} onSet={setRank} />
              <span className="sr-only">{HEAT_LABELS[card.heat]}</span>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
