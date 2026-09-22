import type { ReactNode } from "react";
import Link from "next/link";
import { RenewalHealthMeter } from "@/components/renewals/renewal-health-meter";
import {
  docsGlanceLabel,
  formatSilenceCue,
  quotesGlanceLabel,
  type StackProductLine,
} from "@/lib/deals/card-glance";
import type { RadarDealCard } from "@/lib/deals/radar-desk";

export function dealDisplayName(card: Pick<RadarDealCard, "insured" | "title">): string {
  return card.insured !== "—" ? card.insured : card.title;
}

/** Blank cells stay empty. A dash is not a fact. */
function plainFact(value: string | null | undefined): string {
  const text = (value ?? "").trim();
  if (!text || text === "—" || text === "–" || text === "-") return "";
  return text;
}

export function DealHostSpread({
  card,
  comms,
  center,
  rank,
}: {
  card: RadarDealCard;
  comms?: ReactNode;
  center?: ReactNode;
  rank?: ReactNode;
}) {
  const silence = formatSilenceCue(card.silenceDays);
  const nextLabel = plainFact(card.primaryAction.label);
  const products = card.productLines.length > 1 ? "multi" : "single";
  const cueTitle = card.inboxCue || "Days since the last logged call, email, SMS, or meeting";
  return (
    <div className="ff-stack-card-spread ff-deal-host-spread" data-ff-deal-products={products}>
      <Link href={card.href} className="ff-stack-name" data-ff-deal-zone="name">
        {dealDisplayName(card)}
      </Link>
      <div className="ff-deal-host-center" data-ff-deal-center="" data-ff-deal-zone="center">
        {center}
      </div>
      <div className="ff-deal-host-cue" data-ff-deal-zone="cue">
        <span className="ff-deal-host-cue-copy">
          <Link
            href={card.primaryAction.href}
            className="ff-stack-mid"
            data-ff-stack-mid=""
            data-ff-silence-cue=""
            title={cueTitle}
          >
            {silence}
          </Link>
          {nextLabel ? (
            <Link href={card.primaryAction.href} className="ff-stack-mid" data-ff-next-action="">
              {`Next ${nextLabel}`}
            </Link>
          ) : null}
        </span>
        {comms}
        {rank}
      </div>
    </div>
  );
}

function ProductFacts({ line }: { line: StackProductLine }) {
  const form = plainFact(line.label);
  const stage = plainFact(line.stageLabel);
  const quotes = plainFact(line.quoteSummary);
  return (
    <>
      <span className="ff-stack-product" data-ff-product-label="" title={form || undefined}>
        {form}
      </span>
      <span className="ff-deal-host-stage" data-ff-product-place="">
        {stage}
      </span>
      <span className="ff-deal-host-stamps">
        {line.stamps.map((stamp) => {
          const label = plainFact(stamp);
          if (!label) return null;
          return (
            <span key={label} className="ff-deal-job-stamp" data-ff-deal-stamp={label}>
              {label}
            </span>
          );
        })}
      </span>
      <span className="ff-deal-host-quotes" data-ff-product-quotes="" data-ff-premium-column="" title={quotes || undefined}>
        {quotes}
      </span>
    </>
  );
}

function Health({ card }: { card: RadarDealCard }) {
  return (
    <div className="ff-deal-host-health">
      <RenewalHealthMeter
        stars={card.clientHealth / 20}
        policyStars={card.policyHealth / 20}
        flagged={card.heat === "cold" || card.clientHealth < 40}
      />
    </div>
  );
}

function fallbackLine(card: RadarDealCard): StackProductLine {
  return {
    product: "deal",
    label: plainFact(card.productLabels[0] ?? card.lineOfBusiness),
    stageLabel: docsGlanceLabel(card.docsSubmitted),
    stamps: card.stamps,
    quoteSummary: quotesGlanceLabel({
      count: card.quoteCount,
      bestPremium: card.premium,
      pending: card.pendingQuotes,
    }),
  };
}

export function DealHostJob({ card }: { card: RadarDealCard }) {
  if (card.productLines.length > 1) {
    return (
      <div className="ff-stack-job ff-deal-host-job ff-deal-host-job-multi" data-ff-deal-job="">
        <div className="ff-deal-host-lines" data-ff-product-lines="">
          {card.productLines.map((line) => (
            <div key={line.product} className="ff-deal-host-line" data-ff-product-line={line.product}>
              <ProductFacts line={line} />
            </div>
          ))}
        </div>
        <Health card={card} />
      </div>
    );
  }

  const line = card.productLines[0] ?? fallbackLine(card);
  return (
    <div
      className="ff-stack-job ff-deal-host-job ff-deal-host-job-single"
      data-ff-deal-job=""
      data-ff-product-lines=""
      data-ff-product-line={line.product}
    >
      <div className="ff-deal-host-facts">
        <span className="ff-stack-product" data-ff-product-label="" title={plainFact(line.label) || undefined}>
          {plainFact(line.label)}
        </span>
        <span className="ff-deal-host-stage" data-ff-product-place="">
          {plainFact(line.stageLabel)}
        </span>
        <span className="ff-deal-host-stamps">
          {line.stamps.map((stamp) => {
            const label = plainFact(stamp);
            if (!label) return null;
            return (
              <span key={label} className="ff-deal-job-stamp" data-ff-deal-stamp={label}>
                {label}
              </span>
            );
          })}
        </span>
      </div>
      <span
        className="ff-deal-host-quotes"
        data-ff-product-quotes=""
        data-ff-premium-column=""
        title={plainFact(line.quoteSummary) || undefined}
      >
        {plainFact(line.quoteSummary)}
      </span>
      <Health card={card} />
    </div>
  );
}
