"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EventSpark } from "@/components/deals/event-spark";
import { VelocityClockRail } from "@/components/deals/velocity-clock-rail";
import { RenewalHealthMeter } from "@/components/renewals/renewal-health-meter";
import type { RadarDealCard } from "@/lib/deals/radar-desk";
import {
  bubbleSizeRem,
  formatClockDays,
  formatDealValue,
  HEAT_LABELS,
  HEAT_STATES,
  RADAR_X_AXIS_LABEL,
  RADAR_X_DAYS,
  RADAR_Y_AXIS_LABEL,
  RADAR_Y_DAYS,
  radarLegendCopy,
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
                const size = bubbleSizeRem(card.value || card.premium || 0);
                const name = card.insured !== "—" ? card.insured : card.title;
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
                    title={`${name} · ${HEAT_LABELS[card.heat]} · ${formatDealValue(card.value, card.valueMetric)} · ${formatClockDays(card.daysInPhase)} in phase · ${formatClockDays(card.silenceDays)} silent`}
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
                <h3>{open.insured !== "—" ? open.insured : open.title}</h3>
                <div className="ff-product-chips">
                  {(open.productLabels.length ? open.productLabels : [open.lineOfBusiness]).map((label) => (
                    <span key={label} className="ff-product-chip">
                      {label}
                    </span>
                  ))}
                  <span className="ff-stack-value">{formatDealValue(open.value, open.valueMetric)}</span>
                </div>
                <p className="ff-radar-clocks">
                  {formatClockDays(open.daysInPhase)} in phase · {formatClockDays(open.silenceDays)} silent
                  {open.quoteSent ? " (quote sent)" : ""}
                </p>
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
                <VelocityClockRail clocks={open.clocks} phase={open.phase} />
                <RenewalHealthMeter
                  stars={open.clientHealth / 20}
                  policyStars={open.policyHealth / 20}
                  flagged={open.heat === "cold" || open.clientHealth < 40}
                />
                <div className="ff-radar-card-actions">
                  <Link href={open.primaryAction.href} className="ff-stack-action">
                    {open.primaryAction.label}
                  </Link>
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
