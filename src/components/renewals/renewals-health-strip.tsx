"use client";

import { useRef, useState } from "react";
import type { AgentHealthRollup } from "@/lib/health/model";
import type { HealthChipView } from "@/lib/health/model";
import { HealthFactorList } from "@/components/health/health-factor-list";
import { HealthWhyPanel } from "@/components/health/health-why-popover";
import { RENEWAL_RISK_LABEL } from "@/lib/renewal/urgency";
import type { RoleHealthSummary } from "@/lib/renewal/health-rollup";
import { cn } from "@/lib/utils";

function MiniRing({ score, band }: { score: number; band: AgentHealthRollup["band"] }) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const dash = ((score || 0) / 100) * circumference;
  const color =
    band === "high"
      ? "var(--ff-terracotta)"
      : band === "medium"
        ? "var(--ff-urgency-amber)"
        : "var(--ff-urgency-gray)";
  return (
    <svg viewBox="0 0 44 44" className="ff-health-strip-ring" aria-hidden>
      <circle cx="22" cy="22" r={radius} fill="none" stroke="color-mix(in srgb, var(--ff-border) 80%, white)" strokeWidth="6" />
      <circle
        cx="22"
        cy="22"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeDasharray={`${dash} ${circumference - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 22 22)"
      />
    </svg>
  );
}

export function RenewalsHealthStrip({
  summary,
  book,
  agents = [],
  weakest,
}: {
  summary: RoleHealthSummary;
  book?: AgentHealthRollup | null;
  agents?: AgentHealthRollup[];
  weakest?: HealthChipView | null;
}) {
  const [openWhy, setOpenWhy] = useState(false);
  const whyRef = useRef<HTMLButtonElement>(null);
  const stars = summary.combinedStars;
  const total = book ? book.highCount + book.mediumCount + book.lowCount : 0;
  const pct = (count: number) => (total === 0 ? 0 : Math.round((count / total) * 100));
  const showAgents = summary.scope === "agency" && (agents.length > 0 || summary.perAgent.length > 0);

  return (
    <section
      className="ff-renewals-health-strip"
      data-ff-renewals-health-strip=""
      data-ff-health-scope={summary.scope}
      data-ff-health-book-score={book?.averageScore}
      data-ff-health-book-band={book?.band}
    >
      <div className="ff-renewals-health-combined">
        {book ? (
          <div className="ff-health-strip-ring-wrap">
            <MiniRing score={book.averageScore} band={book.band} />
            <span className="ff-health-strip-ring-label">{RENEWAL_RISK_LABEL[book.band]}</span>
          </div>
        ) : (
          <strong>{stars == null ? "—" : stars.toFixed(1)}</strong>
        )}
        <span>
          {summary.label}
          {summary.clients === 1 ? " · 1 client" : ` · ${summary.clients} clients`}
          {stars != null ? ` · reviews ${stars.toFixed(1)}` : ""}
        </span>
      </div>
      {book && total > 0 ? (
        <div className="min-w-0 flex-1" data-ff-health-mix="">
          <div className="ff-health-strip-bar" aria-hidden>
            {book.highCount ? <span className="ff-health-band-high" style={{ width: `${pct(book.highCount)}%` }} /> : null}
            {book.mediumCount ? (
              <span className="ff-health-band-medium" style={{ width: `${pct(book.mediumCount)}%` }} />
            ) : null}
            {book.lowCount ? <span className="ff-health-band-low" style={{ width: `${pct(book.lowCount)}%` }} /> : null}
          </div>
          <ul className="ff-health-strip-legend">
            <li>
              <span className="ff-health-swatch ff-health-band-high" />
              High {pct(book.highCount)}%
            </li>
            <li>
              <span className="ff-health-swatch ff-health-band-medium" />
              Medium {pct(book.mediumCount)}%
            </li>
            <li>
              <span className="ff-health-swatch ff-health-band-low" />
              Low {pct(book.lowCount)}%
            </li>
          </ul>
        </div>
      ) : null}
      <div className="ff-renewals-health-flagged">
        <strong>{summary.flagged}</strong>
        <span>flagged (2× under 3)</span>
      </div>
      {showAgents ? (
        <ul className="ff-renewals-health-agents" data-ff-health-per-agent="" data-ff-health-agent-rollups="">
          {agents.length > 0
            ? agents.map((agent) => (
                <li key={agent.ownerId ?? agent.ownerName} data-ff-health-agent={agent.ownerId ?? "unassigned"}>
                  <span className={cn("ff-health-agent-dot", `ff-health-band-${agent.band}`)} aria-hidden />
                  <span>{agent.ownerName}</span>
                  <em>{RENEWAL_RISK_LABEL[agent.band]}</em>
                </li>
              ))
            : summary.perAgent.map((agent) => (
                <li key={agent.ownerId}>
                  <span>{agent.ownerName}</span>
                  <em>{agent.stars.toFixed(1)}</em>
                  {agent.flagged > 0 ? <b>{agent.flagged}</b> : null}
                </li>
              ))}
        </ul>
      ) : null}
      {weakest ? (
        <div className="ff-renewals-health-why">
          <button
            ref={whyRef}
            type="button"
            className="ff-renewals-health-why-btn"
            data-ff-health-why=""
            data-ff-no-title-tip=""
            aria-expanded={openWhy}
            onClick={() => setOpenWhy((value) => !value)}
          >
            Why
          </button>
          <HealthWhyPanel
            open={openWhy}
            onOpenChange={setOpenWhy}
            anchorRef={whyRef}
            align="end"
          >
            <HealthFactorList health={weakest} />
          </HealthWhyPanel>
        </div>
      ) : null}
    </section>
  );
}
