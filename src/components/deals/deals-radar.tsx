import Link from "next/link";
import { dealDisplayName } from "@/components/deals/deal-host-face";
import { RadarMetricStrip } from "@/components/deals/radar-metric-strip";
import { formatSilenceCue } from "@/lib/deals/card-glance";
import type { RadarDealCard } from "@/lib/deals/radar-desk";
import { HEAT_LABELS, HEAT_STATES } from "@/lib/deals/velocity";

/**
 * Heat glance — four rows in the same Hot / Cooling / Near cold / Cold language
 * as Stack. Names are readable in a glance; the scatter chart is gone.
 */
export function DealsRadar({ cards }: { cards: RadarDealCard[] }) {
  return (
    <div className="ff-heat-glance" data-ff-deals-radar="" data-ff-heat-glance="">
      <div data-ff-radar-strip="">
        <RadarMetricStrip cards={cards} />
      </div>
      {HEAT_STATES.map((heat) => {
        const rows = cards.filter((card) => card.heat === heat);
        return (
          <section
            key={heat}
            className={`ff-heat-row ff-heat-${heat}`}
            data-ff-heat-row={heat}
            aria-label={HEAT_LABELS[heat]}
          >
            <div className="ff-heat-row-label">
              <span className="ff-stack-glyph" aria-hidden data-ff-stack-glyph={heat} />
              <span>{HEAT_LABELS[heat]}</span>
              <strong data-ff-heat-count="">{rows.length}</strong>
            </div>
            <div className="ff-heat-row-deals">
              {rows.length === 0 ? (
                <span className="ff-heat-row-empty">None</span>
              ) : (
                rows.map((card) => {
                  const name = dealDisplayName(card);
                  return (
                    <Link
                      key={card.id}
                      href={card.href}
                      className="ff-heat-glance-card"
                      data-ff-heat-deal={card.id}
                      title={`${name} · ${HEAT_LABELS[heat]} · ${formatSilenceCue(card.silenceDays)} · Next · ${card.primaryAction.label}`}
                    >
                      <strong>{name}</strong>
                      <span>{formatSilenceCue(card.silenceDays)}</span>
                    </Link>
                  );
                })
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
