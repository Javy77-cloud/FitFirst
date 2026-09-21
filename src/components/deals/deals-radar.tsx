"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DealHostJob, DealHostNext, dealDisplayName } from "@/components/deals/deal-host-face";
import { EventSpark } from "@/components/deals/event-spark";
import { formatPremiumColumn, formatSilenceCue } from "@/lib/deals/card-glance";
import type { RadarDealCard } from "@/lib/deals/radar-desk";
import {
  HEAT_LABELS,
  HEAT_STATES,
  RADAR_X_AXIS_LABEL,
  RADAR_X_DAYS,
  RADAR_Y_AXIS_LABEL,
  RADAR_Y_DAYS,
  radarLegendCopy,
  radarPulseSizeRem,
} from "@/lib/deals/velocity";
import { cn } from "@/lib/utils";

const TICKS = [0, 7, 14, 21] as const;

export function DealsRadar({ cards }: { cards: RadarDealCard[] }) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = cards.find((card) => card.id === openId) ?? null;
  const legend = radarLegendCopy();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function previewCard(id: string) {
    setOpenId(id);
  }

  function openDeal(href: string) {
    router.push(href);
  }

  return (
    <div className="ff-deals-radar" data-ff-deals-radar="" data-ff-book-heat-bubbles="">
      <div className="ff-radar-legend" data-ff-radar-legend="">
        <p data-ff-radar-legend-x="">
          <span className="ff-radar-legend-key">X</span>
          {legend.x}
        </p>
        <p data-ff-radar-legend-y="">
          <span className="ff-radar-legend-key">Y</span>
          {legend.y}
        </p>
        <ul className="ff-radar-heat-key" aria-label="Heat">
          {HEAT_STATES.map((heat) => (
            <li key={heat} className={cn("ff-radar-heat-swatch", `ff-heat-${heat}`)}>
              <i className="ff-radar-dot" aria-hidden />
              {HEAT_LABELS[heat]}
            </li>
          ))}
        </ul>
      </div>
      <div className="ff-radar-plot" data-ff-radar-plot="">
        <div className="ff-radar-axis-y" data-ff-radar-axis-y="">
          <span className="ff-radar-axis-y-high">{legend.yHigh}</span>
          <span className="ff-radar-axis-y-title">{RADAR_Y_AXIS_LABEL}</span>
          <span className="ff-radar-axis-y-low">{legend.yLow}</span>
        </div>
        <div className="ff-radar-plot-main">
          <button
            type="button"
            className="ff-radar-field"
            aria-label={`${legend.x}. ${legend.y}. Hover a bubble for preview. Click to open the deal.`}
            data-ff-radar-field=""
            onClick={() => setOpenId(null)}
          >
            <span className="ff-radar-ticks-x" aria-hidden>
              {TICKS.map((day) => (
                <span key={`x-${day}`} style={{ left: `${8 + (day / RADAR_X_DAYS) * 84}%` }}>
                  {day}d
                </span>
              ))}
            </span>
            <span className="ff-radar-ticks-y" aria-hidden>
              {TICKS.map((day) => (
                <span key={`y-${day}`} style={{ bottom: `${8 + (day / RADAR_Y_DAYS) * 78}%` }}>
                  {day}d
                </span>
              ))}
            </span>
            {cards.length === 0 ? (
              <p className="ff-deals-empty">No deals on this field.</p>
            ) : (
              cards.map((card) => {
                const size = radarPulseSizeRem(card.heat);
                const name = dealDisplayName(card);
                return (
                  <span
                    key={card.id}
                    role="link"
                    tabIndex={0}
                    className={cn("ff-radar-dot", `ff-heat-${card.heat}`, openId === card.id && "is-open")}
                    style={{
                      left: `${8 + card.x * 84}%`,
                      bottom: `${8 + card.y * 78}%`,
                      width: `${size}rem`,
                      height: `${size}rem`,
                      marginLeft: `${-size / 2}rem`,
                      marginTop: `${-size / 2}rem`,
                    }}
                    data-ff-radar-dot={card.id}
                    data-ff-heat={card.heat}
                    data-ff-bubble-size={size}
                    title={`${name} · ${HEAT_LABELS[card.heat]} · Premium ${formatPremiumColumn(card.premium)} · ${formatSilenceCue(card.silenceDays)}`}
                    onMouseEnter={() => previewCard(card.id)}
                    onFocus={() => previewCard(card.id)}
                    onClick={(event) => {
                      event.stopPropagation();
                      openDeal(card.href);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openDeal(card.href);
                      }
                    }}
                  />
                );
              })
            )}
            {open ? (
              <aside
                className={cn("ff-radar-card", `ff-heat-${open.heat}`)}
                data-ff-radar-card={open.id}
                onClick={(event) => event.stopPropagation()}
              >
                <p className="ff-radar-card-kicker">
                  {HEAT_LABELS[open.heat]}
                  <EventSpark values={open.spark} label="14-day activity" />
                </p>
                <h3>{dealDisplayName(open)}</h3>
                <div className="ff-product-chips">
                  {(open.productLabels.length ? open.productLabels : [open.lineOfBusiness]).map((label) => (
                    <span key={label} className="ff-product-chip">
                      {label}
                    </span>
                  ))}
                  <span className="ff-stack-value" data-ff-premium-column="">
                    {formatPremiumColumn(open.premium)}
                  </span>
                </div>
                <p className="ff-stack-silent" data-ff-silence-cue="">
                  {formatSilenceCue(open.silenceDays)}
                </p>
                <DealHostJob card={open} />
                {open.inboxCue ? (
                  <p className="ff-inbox-cue" data-ff-inbox-cue="">
                    {open.inboxHref ? (
                      <Link href={open.inboxHref} className="hover:underline">
                        {open.inboxCue}
                      </Link>
                    ) : (
                      open.inboxCue
                    )}
                  </p>
                ) : null}
                <div className="ff-radar-card-actions">
                  <DealHostNext card={open} />
                  <Link href={open.href} className="ff-radar-open">
                    Open
                  </Link>
                </div>
              </aside>
            ) : null}
          </button>
          <div className="ff-radar-axis-x" data-ff-radar-axis-x="">
            <span>{legend.xStart}</span>
            <span className="ff-radar-axis-x-title">{RADAR_X_AXIS_LABEL}</span>
            <span>{legend.xEnd}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
