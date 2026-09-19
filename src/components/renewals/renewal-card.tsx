"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { PolicyQuickActions } from "@/components/policy/policy-quick-actions";
import { formatSignedMoney } from "@/lib/renewal/compare";
import type { RenewalBoardCard } from "@/lib/renewal/board-data";
import {
  RENEWAL_RISK_LABEL,
  renewalUrgencyBand,
  renewalWhyLine,
  stubRenewalRisk,
} from "@/lib/renewal/urgency";
import { cn } from "@/lib/utils";

function PremiumDeltaArrow({ delta }: { delta: number }) {
  if (delta > 0) {
    return (
      <span className="ff-renewal-delta ff-renewal-delta-up" data-ff-premium-delta="up" title={`Premium up ${formatSignedMoney(delta)}`}>
        <ArrowUp className="size-3.5" aria-hidden />
        <span>{formatSignedMoney(delta)}</span>
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="ff-renewal-delta ff-renewal-delta-down" data-ff-premium-delta="down" title={`Premium down ${formatSignedMoney(Math.abs(delta))}`}>
        <ArrowDown className="size-3.5" aria-hidden />
        <span>{formatSignedMoney(delta)}</span>
      </span>
    );
  }
  return (
    <span className="ff-renewal-delta ff-renewal-delta-flat" data-ff-premium-delta="flat" title="Premium unchanged">
      <Minus className="size-3.5" aria-hidden />
      <span>Flat</span>
    </span>
  );
}

export function RenewalBoardCardView({
  card,
  canDrag = false,
}: {
  card: RenewalBoardCard;
  canDrag?: boolean;
}) {
  const band = renewalUrgencyBand(card.daysUntil);
  const risk = stubRenewalRisk(band);
  const why = renewalWhyLine({ daysUntil: card.daysUntil, premiumDelta: card.premiumDelta });

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
      className={cn(
        "ff-renewal-urgency-card",
        canDrag && "cursor-grab active:cursor-grabbing",
      )}
      data-ff-renewal-card={card.queueId}
      data-ff-renewal-draggable={canDrag ? "true" : "false"}
      data-ff-urgency-card={band}
      data-ff-risk={risk}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          <Link
            href={`/policies/${card.policyId}`}
            className="min-w-0 truncate text-sm font-semibold text-navy hover:text-primary hover:underline"
            title={card.clientName}
          >
            {card.clientName}
          </Link>
          <PolicyQuickActions
            policyId={card.policyId}
            phone={card.phone}
            email={card.email}
            contactId={card.contactId}
            accountId={card.accountId}
          />
        </div>
        <span className={cn("ff-renewal-risk-badge", `ff-renewal-risk-${risk}`)} data-ff-risk-badge={risk}>
          {RENEWAL_RISK_LABEL[risk]}
        </span>
      </div>
      {card.premiumDelta != null ? <PremiumDeltaArrow delta={card.premiumDelta} /> : null}
      <p className="ff-renewal-why" title={why}>
        {why}
      </p>
    </article>
  );
}
