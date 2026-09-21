import type { ReactNode } from "react";
import Link from "next/link";
import { RenewalHealthMeter } from "@/components/renewals/renewal-health-meter";
import {
  docsGlanceLabel,
  formatSilenceCue,
  quotesGlanceLabel,
} from "@/lib/deals/card-glance";
import { stackMidLine } from "@/lib/desk/stack-mid";
import type { RadarDealCard } from "@/lib/deals/radar-desk";

export function dealDisplayName(card: Pick<RadarDealCard, "insured" | "title">): string {
  return card.insured !== "—" ? card.insured : card.title;
}

export function DealHostSpread({ card, comms }: { card: RadarDealCard; comms?: ReactNode }) {
  const line = stackMidLine([
    formatSilenceCue(card.silenceDays),
    card.primaryAction.label ? `Next ${card.primaryAction.label}` : null,
  ]);
  return (
    <div className="ff-stack-card-spread">
      <Link href={card.href} className="ff-stack-name">
        {dealDisplayName(card)}
      </Link>
      <Link
        href={card.primaryAction.href}
        className="ff-stack-mid"
        data-ff-stack-mid=""
        data-ff-next-action=""
        data-ff-silence-cue=""
        title={card.inboxCue || "Days since the last logged call, email, SMS, or meeting"}
      >
        {line}
      </Link>
      {comms}
    </div>
  );
}

export function DealHostJob({ card }: { card: RadarDealCard }) {
  if (card.productLines.length > 0) {
    return (
      <div className="ff-stack-job" data-ff-deal-job="">
        <ul className="ff-stack-products" data-ff-product-lines="">
          {card.productLines.map((line) => (
            <li key={line.product} data-ff-product-line={line.product}>
              <span className="ff-stack-product" data-ff-product-label="" title={line.label}>
                {line.label}
              </span>
              <span className="ff-stack-product-detail">
                <span data-ff-product-place="">{line.stageLabel}</span>
                {line.stamps.map((stamp) => (
                  <span key={stamp} className="ff-deal-job-stamp" data-ff-deal-stamp={stamp}>
                    {stamp}
                  </span>
                ))}
                <span data-ff-product-quotes="" data-ff-premium-column="">
                  {line.quoteSummary}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <RenewalHealthMeter
          stars={card.clientHealth / 20}
          policyStars={card.policyHealth / 20}
          flagged={card.heat === "cold" || card.clientHealth < 40}
        />
      </div>
    );
  }
  return (
    <div className="ff-stack-job" data-ff-deal-job="">
      <span data-ff-docs-cue="">{docsGlanceLabel(card.docsSubmitted)}</span>
      <span data-ff-quotes-cue="">
        {quotesGlanceLabel({
          count: card.quoteCount,
          bestPremium: card.premium,
          pending: card.pendingQuotes,
        })}
      </span>
      {card.stamps.map((stamp) => (
        <span key={stamp} className="ff-deal-job-stamp" data-ff-deal-stamp={stamp}>
          {stamp}
        </span>
      ))}
    </div>
  );
}
