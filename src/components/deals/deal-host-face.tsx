import Link from "next/link";
import {
  docsGlanceLabel,
  formatPremiumColumn,
  formatSilenceCue,
  quotesGlanceLabel,
} from "@/lib/deals/card-glance";
import type { RadarDealCard } from "@/lib/deals/radar-desk";

export function dealDisplayName(card: Pick<RadarDealCard, "insured" | "title">): string {
  return card.insured !== "—" ? card.insured : card.title;
}

export function DealHostSpread({ card }: { card: RadarDealCard }) {
  const product = card.productLabels[0] ?? card.lineOfBusiness;
  return (
    <div className="ff-stack-card-spread">
      <Link href={card.href} className="ff-stack-name">
        {dealDisplayName(card)}
      </Link>
      <span className="ff-stack-product" title={product}>
        {product}
      </span>
      <span
        className="ff-stack-silent"
        data-ff-silence-cue=""
        title="Days since the last logged call, email, SMS, or meeting"
      >
        {formatSilenceCue(card.silenceDays)}
      </span>
      <span className="ff-stack-value" data-ff-premium-column="" title="Premium">
        {formatPremiumColumn(card.premium)}
      </span>
    </div>
  );
}

export function DealHostJob({ card }: { card: RadarDealCard }) {
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

export function DealHostNext({ card }: { card: RadarDealCard }) {
  return (
    <Link href={card.primaryAction.href} className="ff-stack-next" data-ff-next-action="">
      Next · {card.primaryAction.label}
    </Link>
  );
}
