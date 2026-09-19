"use client";

import Link from "next/link";
import { formatDay, formatMoney } from "@/lib/domain";
import type { RenewalBoardCard } from "@/lib/renewal/board-data";
import { PolicyQuickActions } from "@/components/policy/policy-quick-actions";

export function RenewalBoardCardView({
  card,
  canDrag = true,
}: {
  card: RenewalBoardCard;
  canDrag?: boolean;
}) {
  const daysLabel =
    card.daysUntil < 0
      ? `${Math.abs(card.daysUntil)}d overdue`
      : card.daysUntil === 0
        ? "Expires today"
        : `${card.daysUntil}d until expiration`;

  return (
    <article
      draggable={canDrag}
      onDragStart={(event) => {
        if (!canDrag) {
          event.preventDefault();
          return;
        }
        event.dataTransfer.setData("text/fitfirst-renewal", card.queueId);
        event.dataTransfer.effectAllowed = "move";
      }}
      className={
        canDrag
          ? "cursor-grab rounded-md border border-border bg-background p-2.5 active:cursor-grabbing"
          : "rounded-md border border-border bg-background p-2.5"
      }
      data-ff-renewal-card={card.queueId}
      data-ff-renewal-draggable={canDrag ? "true" : "false"}
    >
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
      </div>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        Exp {formatDay(card.expirationDate)} · {daysLabel}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        {card.carrierName} · {card.lineOfBusiness}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        Premium {card.premium != null && card.premium !== "" ? formatMoney(card.premium) : "—"}
      </p>
    </article>
  );
}
