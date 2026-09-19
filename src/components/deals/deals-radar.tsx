"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DealStatusStamp } from "@/components/deal/deal-status-stamp";
import type { RadarDealCard } from "@/lib/deals/radar-desk";
import {
  formatClockDays,
  formatDealValue,
  HEAT_LABELS,
  valueAxisLabel,
  VELOCITY_PHASE_LABELS,
} from "@/lib/deals/velocity";
import { cn } from "@/lib/utils";

export function DealsRadar({ cards }: { cards: RadarDealCard[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = cards.find((card) => card.id === openId) ?? null;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="ff-deals-radar" data-ff-deals-radar="">
      <div className="ff-radar-axis-y" aria-hidden>
        {valueAxisLabel(cards[0]?.valueMetric ?? "coverage_a")}
      </div>
      <button
        type="button"
        className="ff-radar-field"
        aria-label="Deal radar field. Click a dot to expand. Click empty space to collapse."
        data-ff-radar-field=""
        onClick={() => setOpenId(null)}
      >
        {cards.length === 0 ? (
          <p className="ff-deals-empty">No deals on this field.</p>
        ) : (
          cards.map((card) => (
            <span
              key={card.id}
              role="button"
              tabIndex={0}
              className={cn("ff-radar-dot", `ff-heat-${card.heat}`, openId === card.id && "is-open")}
              style={{ left: `${8 + card.x * 84}%`, bottom: `${8 + card.y * 78}%` }}
              data-ff-radar-dot={card.id}
              data-ff-heat={card.heat}
              title={`${card.insured !== "—" ? card.insured : card.title} · ${HEAT_LABELS[card.heat]}`}
              onClick={(event) => {
                event.stopPropagation();
                setOpenId((current) => (current === card.id ? null : card.id));
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setOpenId((current) => (current === card.id ? null : card.id));
                }
              }}
            />
          ))
        )}
        {open ? (
          <aside
            className={cn("ff-radar-card", `ff-heat-${open.heat}`)}
            data-ff-radar-card={open.id}
            onClick={(event) => event.stopPropagation()}
          >
            <p className="ff-radar-card-kicker">
              {HEAT_LABELS[open.heat]} · {open.clockLabel}
            </p>
            <h3>{open.insured !== "—" ? open.insured : open.title}</h3>
            <div className="ff-product-chips">
              {(open.productLabels.length ? open.productLabels : [open.lineOfBusiness]).map((label) => (
                <span key={label} className="ff-product-chip">
                  {label}
                </span>
              ))}
              <span className="ff-stack-meta">{formatDealValue(open.value, open.valueMetric)}</span>
            </div>
            <div className="ff-stack-foot">
              {open.stageStamp ? <DealStatusStamp stage={open.stageStamp} /> : <span className="ff-stage-stamp-quiet">{open.stageLabel}</span>}
              <span className="ff-health-chip">Client {open.clientHealth}</span>
              <span className="ff-health-chip">Policy {open.policyHealth}</span>
            </div>
            <dl className="ff-velocity-clocks">
              {(["details", "docs", "risk", "quotes", "post_quote_gap"] as const).map((phase) => {
                const clock = open.clocks[phase];
                return (
                  <div key={phase} data-ff-clock={phase} data-complete={clock.complete ? "true" : "false"}>
                    <dt>{VELOCITY_PHASE_LABELS[phase]}</dt>
                    <dd>{clock.complete && phase !== "post_quote_gap" ? "Done" : formatClockDays(clock.days)}</dd>
                  </div>
                );
              })}
              {open.clocks.lead_to_deal.complete ? (
                <div data-ff-clock="lead_to_deal">
                  <dt>Lead → deal</dt>
                  <dd>{formatClockDays(open.clocks.lead_to_deal.days)}</dd>
                </div>
              ) : null}
            </dl>
            <div className="ff-radar-card-actions">
              <Link href={open.primaryAction.href} className="ff-stack-action">
                {open.primaryAction.label}
              </Link>
              <Link href={open.href} className="ff-radar-open">
                Open workspace
              </Link>
            </div>
          </aside>
        ) : null}
      </button>
      <div className="ff-radar-axis-x" aria-hidden>
        Time in {cards[0] ? VELOCITY_PHASE_LABELS[cards[0].phase] : "current phase"}
      </div>
    </div>
  );
}
