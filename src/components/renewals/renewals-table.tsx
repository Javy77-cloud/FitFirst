"use client";

import Link from "next/link";
import { StagePill } from "@/components/fit-badge";
import { formatDay } from "@/lib/domain";
import {
  RENEWAL_QUEUE_STAGE_LABELS,
  isRenewalQueueStage,
} from "@/lib/domain-ams";
import type { RenewalBoardCard } from "@/lib/renewal/board-data";
import { GapCountBadge } from "@/components/coverage/gap-count-badge";
import { PolicyQuickActions } from "@/components/policy/policy-quick-actions";

function stageLabel(stage: string) {
  return isRenewalQueueStage(stage) ? RENEWAL_QUEUE_STAGE_LABELS[stage] : stage.replaceAll("_", " ");
}

function daysLabel(days: number) {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Expires today";
  return `${days}d`;
}

/** Renewals Grid view (denser cards). List uses RenewalsList + DeskColumnTable. */
export function RenewalsTable({ cards }: { cards: RenewalBoardCard[] }) {
  if (cards.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-ff-renewals-empty="">
        No renewals match this filter.
      </p>
    );
  }

  return (
    <div
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      data-ff-renewals-grid=""
    >
      {cards.map((card) => (
        <article key={card.queueId} className="ff-card p-3" data-ff-renewal-grid-card={card.queueId}>
          <div className="flex min-w-0 items-center gap-1">
            <Link
              href={`/policies/${card.policyId}`}
              className="min-w-0 truncate text-sm font-medium text-primary hover:underline"
              title={card.displayName}
            >
              {card.displayName}
            </Link>
            <PolicyQuickActions
              policyId={card.policyId}
              phone={card.phone}
              email={card.email}
              contactId={card.contactId}
              accountId={card.accountId}
            />
            <GapCountBadge count={card.gapCount} href={`/policies/${card.policyId}`} />
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {card.lineOfBusiness} · {card.carrierName}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Exp {formatDay(card.expirationDate)} · {daysLabel(card.daysUntil)}
          </p>
          <p className="mt-1">
            <StagePill stage={stageLabel(card.stage)} />
          </p>
        </article>
      ))}
    </div>
  );
}
