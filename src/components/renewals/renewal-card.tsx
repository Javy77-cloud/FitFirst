"use client";

import { useState, type MouseEvent } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { sendRenewalChase } from "@/app/actions/renewals-wedge";
import { PolicyQuickActions } from "@/components/policy/policy-quick-actions";
import { RenewalCompareDrawer } from "@/components/renewals/renewal-compare-drawer";
import { RenewalHealthMeter } from "@/components/renewals/renewal-health-meter";
import { RenewalMiniReview } from "@/components/renewals/renewal-mini-review";
import { Button } from "@/components/ui/button";
import { formatSignedMoney } from "@/lib/renewal/compare";
import { chaseTemplateFor, primaryActionLabel, primaryRenewalAction } from "@/lib/renewal/chase";
import type { RenewalBoardCard } from "@/lib/renewal/board-data";
import {
  RENEWAL_RISK_LABEL,
  renewalUrgencyBand,
  renewalWhyLine,
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

function isInteractive(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("a, button, form, select, input, textarea, [data-ff-no-compare]"));
}

export function RenewalBoardCardView({
  card,
  canDrag = false,
}: {
  card: RenewalBoardCard;
  canDrag?: boolean;
}) {
  const [compareOpen, setCompareOpen] = useState(false);
  const band = renewalUrgencyBand(card.daysUntil);
  const risk = card.risk;
  const why =
    card.why ||
    renewalWhyLine({
      daysUntil: card.daysUntil,
      premiumDelta: card.premiumDelta,
      whyExtra: card.whyExtra,
    });
  const template = chaseTemplateFor({
    band,
    clientName: card.clientName,
    daysUntil: card.daysUntil,
    premiumDelta: card.premiumDelta,
    carrierName: card.carrierName,
    policyNumber: card.policyNumber,
  });
  const action = primaryRenewalAction({
    chasedThisBand: card.chasedThisBand,
    canCompare: card.canCompare,
  });

  function openCompare(event: MouseEvent) {
    if (isInteractive(event.target)) return;
    setCompareOpen(true);
  }

  return (
    <article
      draggable={canDrag}
      onClick={openCompare}
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
          <button
            type="button"
            className="min-w-0 truncate text-left text-sm font-semibold text-navy hover:text-primary hover:underline"
            title={`${card.clientName} — compare terms`}
            onClick={() => setCompareOpen(true)}
            data-ff-compare-name=""
          >
            {card.clientName}
          </button>
          <span data-ff-no-compare="">
            <PolicyQuickActions
              policyId={card.policyId}
              phone={card.phone}
              email={card.email}
              contactId={card.contactId}
              accountId={card.accountId}
            />
          </span>
          <RenewalCompareDrawer
            policyId={card.policyId}
            clientName={card.clientName}
            canCompare={card.canCompare}
            open={compareOpen}
            onOpenChange={setCompareOpen}
          />
        </div>
        <span className={cn("ff-renewal-risk-badge", `ff-renewal-risk-${risk}`)} data-ff-risk-badge={risk}>
          {RENEWAL_RISK_LABEL[risk]}
        </span>
      </div>
      <RenewalHealthMeter
        stars={card.healthStars}
        policyStars={card.policyHealthStars}
        flagged={card.healthFlagged}
        source={card.healthSource}
      />
      {card.premiumDelta != null ? <PremiumDeltaArrow delta={card.premiumDelta} /> : null}
      <p className="ff-renewal-why" title={why}>
        {why}
      </p>
      {action === "chase" ? (
        <form action={sendRenewalChase} className="ff-renewal-chase" data-ff-no-compare="">
          <input type="hidden" name="policyId" value={card.policyId} />
          {card.contactId ? <input type="hidden" name="contactId" value={card.contactId} /> : null}
          {card.accountId ? <input type="hidden" name="accountId" value={card.accountId} /> : null}
          {card.email ? <input type="hidden" name="email" value={card.email} /> : null}
          <input type="hidden" name="clientName" value={card.clientName} />
          <input type="hidden" name="carrierName" value={card.carrierName} />
          <input type="hidden" name="policyNumber" value={card.policyNumber} />
          <input type="hidden" name="daysUntil" value={String(card.daysUntil)} />
          {card.premiumDelta != null ? (
            <input type="hidden" name="premiumDelta" value={String(card.premiumDelta)} />
          ) : null}
          <Button type="submit" size="xs" data-ff-chase-send={band}>
            {primaryActionLabel(action, template)}
          </Button>
        </form>
      ) : (
        <p className="ff-renewal-chased" data-ff-chase-done={band}>
          {template.label} sent
        </p>
      )}
      {card.reviewDue ? (
        <div data-ff-no-compare="">
          <RenewalMiniReview
            policyId={card.policyId}
            contactId={card.contactId}
            accountId={card.accountId}
            skipCount={card.reviewSkipCount}
            seed={`${card.partyKey}:${card.stage}`}
          />
        </div>
      ) : null}
      <Link
        href={`/policies/${card.policyId}`}
        className="ff-renewal-policy-link"
        data-ff-no-compare=""
        onClick={(event) => event.stopPropagation()}
      >
        Policy
      </Link>
    </article>
  );
}
