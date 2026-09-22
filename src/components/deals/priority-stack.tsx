"use client";

import Link from "next/link";
import { DealHostJob, DealHostSpread } from "@/components/deals/deal-host-face";
import { ActivityGlyph, useActivityPick } from "@/components/desk/standard-activity-panel";
import { PriorityPinControl, usePriorityPins, orderWithPriorityPins } from "@/components/deals/priority-pin-control";
import type { RadarDealCard } from "@/lib/deals/radar-desk";
import { HEAT_LABELS } from "@/lib/deals/velocity";
import { cn } from "@/lib/utils";

const STACK_HEADER_COLS = [
  ["name", "Name"],
  ["form", "Form"],
  ["stage", "Stage"],
  ["stamp", "Stamp"],
  ["quotes", "Quotes"],
  ["health", "Health"],
] as const;

function DealStackColumnHeader() {
  return (
    <div className="ff-deal-stack-header" data-ff-deal-stack-header="" role="row">
      <span className="ff-deal-stack-header-name" data-ff-stack-col="name">
        Name
      </span>
      <div className="ff-deal-stack-header-center">
        <div className="ff-deal-stack-header-lines">
          <span data-ff-stack-col="form">Form</span>
          <span data-ff-stack-col="stage">Stage</span>
          <span data-ff-stack-col="stamp">Stamp</span>
          <span data-ff-stack-col="quotes">Quotes</span>
        </div>
        <span className="ff-deal-stack-header-health" data-ff-stack-col="health">
          Health
        </span>
      </div>
      <span className="ff-deal-stack-header-cue" aria-hidden="true" />
    </div>
  );
}

export function PriorityStack({ cards }: { cards: RadarDealCard[] }) {
  const { pins, setRank } = usePriorityPins();
  const activityDesk = useActivityPick();
  const ordered = orderWithPriorityPins(cards, pins);

  if (ordered.length === 0) {
    return (
      <p className="ff-deals-empty" data-ff-priority-stack-empty="">
        No shopping deals in this lens. Convert a lead or clear a chip.
      </p>
    );
  }

  return (
    <div className="ff-deal-priority-stack" data-ff-priority-stack="">
      <p className="ff-deal-stack-title" data-ff-deal-stack-title="">
        Priority Stack
      </p>
      <DealStackColumnHeader />
      <ol className="ff-priority-stack" data-ff-priority-stack-list="">
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
                data-ff-activity-selected={activityDesk?.selectedId === card.id ? "true" : undefined}
                onClick={(event) => {
                  if (!activityDesk) return;
                  const target = event.target;
                  if (!(target instanceof Element)) return;
                  if (target.closest("a, button, input, select, textarea, label, form")) return;
                  activityDesk.pick(card.id);
                }}
              >
                <div className="ff-stack-card-body">
                  <DealHostSpread
                    card={card}
                    glyph={<span className="ff-stack-glyph" aria-hidden data-ff-stack-glyph={card.heat} />}
                    center={<DealHostJob card={card} />}
                    comms={
                      <ActivityGlyph
                        id={card.id}
                        menuTestId={`deal-stack-activity-${card.id}`}
                        listTestId={`deal-stack-activity-menu-${card.id}`}
                        dealId={card.id}
                        leadId={card.leadId}
                        contactId={card.contactId}
                        accountId={card.accountId}
                      />
                    }
                    rank={<PriorityPinControl id={card.id} rank={rank} onSet={setRank} />}
                  />
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
                <span className="sr-only">{HEAT_LABELS[card.heat]}</span>
              </article>
            </li>
          );
        })}
      </ol>
      <span className="sr-only" data-ff-deal-stack-header-labels="">
        {STACK_HEADER_COLS.map(([, label]) => label).join(" · ")}
      </span>
    </div>
  );
}
