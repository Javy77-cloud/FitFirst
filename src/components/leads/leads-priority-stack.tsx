"use client";

import Link from "next/link";
import { ActivityGlyph, useActivityPick } from "@/components/desk/standard-activity-panel";
import { stackMidLine } from "@/lib/desk/stack-mid";
import {
  LeadHeatToggle,
  LeadPipelineStatusSelect,
  LeadTemplateOverride,
} from "@/components/leads/lead-queue-controls";
import { ResponseTimer } from "@/components/leads/response-timer";
import { StartShopForm } from "@/components/leads/start-shop-form";
import { useLiveContainsQuery } from "@/hooks/use-live-contains-query";
import type { LeadDeskRecord } from "@/lib/leads/lead-desk";
import { LEAD_TEMPERATURES, type LeadTemperature } from "@/lib/leads/queue";
import { matchesContains } from "@/lib/search/live-query";
import { cn } from "@/lib/utils";

const HEAT_LABEL: Record<LeadTemperature, string> = {
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
};

function heatCounts(records: LeadDeskRecord[]): Record<LeadTemperature, number> {
  const counts: Record<LeadTemperature, number> = { hot: 0, warm: 0, cold: 0 };
  for (const record of records) counts[record.temperature] += 1;
  return counts;
}

export function LeadsPriorityStack({
  records,
  templates,
  initialQuery = "",
}: {
  records: LeadDeskRecord[];
  templates: Array<{ id: string; name: string; triggerStatus: string }>;
  initialQuery?: string;
}) {
  const liveQuery = useLiveContainsQuery("leads", initialQuery);
  const activityDesk = useActivityPick();
  const visible = records.filter((record) => {
    if (record.parked && !liveQuery.trim()) return false;
    return matchesContains(liveQuery, record.hay);
  });
  if (visible.length === 0) {
    return (
      <p className="ff-deals-empty" data-ff-leads-stack-empty="">
        No open leads in this queue. Converted records are on Deals.
      </p>
    );
  }

  const counts = heatCounts(visible);

  return (
    <div data-ff-leads-stack="">
      <section className="ff-book-heat-header mb-0.5" data-ff-leads-heat="" aria-label="Lead heat">
        <div className="ff-book-heat-title">
          <p>Lead heat</p>
          <strong data-ff-leads-heat-total="">{visible.length}</strong>
          <span>{visible.length === 1 ? "lead" : "leads"} · first-call clock</span>
        </div>
        <ul className="ff-book-heat-counts" data-ff-leads-heat-counts="">
          {LEAD_TEMPERATURES.map((heat) => (
            <li key={heat} className={cn("ff-book-heat-count", `ff-heat-${heat}`)} data-ff-leads-heat-row={heat}>
              <i className="ff-book-heat-swatch" aria-hidden />
              <span>{HEAT_LABEL[heat]}</span>
              <strong>{counts[heat]}</strong>
            </li>
          ))}
        </ul>
      </section>
      <ol className="ff-priority-stack" data-ff-leads-priority-stack="">
        {visible.map((record) => {
          const policyLabel = record.lineLabel.trim();
          return (
            <li key={record.id}>
              <article
                className={cn("ff-stack-card", `ff-heat-${record.temperature}`)}
                data-ff-leads-stack-card={record.id}
                data-ff-heat={record.temperature}
                data-ff-activity-selected={activityDesk?.selectedId === record.id ? "true" : undefined}
                onClick={(event) => {
                  if (!activityDesk) return;
                  const target = event.target;
                  if (!(target instanceof Element)) return;
                  if (target.closest("a, button, input, select, textarea, label, form")) return;
                  activityDesk.pick(record.id);
                }}
              >
                <span className="ff-stack-glyph" aria-hidden data-ff-stack-glyph={record.temperature} />
                <div className="ff-stack-card-body">
                  <div className="ff-lead-stack-top" data-ff-lead-stack-top="">
                    <div className="ff-lead-stack-identity" data-ff-lead-stack-identity="">
                      <Link href={record.href} className="ff-stack-name">
                        {record.name}
                      </Link>
                      <ActivityGlyph
                        id={record.id}
                        menuTestId={`lead-stack-activity-${record.id}`}
                        listTestId={`lead-stack-activity-menu-${record.id}`}
                        optionAttr="data-ff-lead-activity-option"
                        leadId={record.id}
                        dealId={record.convertedDealId}
                      />
                    </div>
                    <Link
                      href={record.href}
                      className="ff-stack-mid"
                      data-ff-stack-mid=""
                      data-ff-lead-silence=""
                      data-ff-silence-cue=""
                      data-ff-next-chase=""
                      title={
                        record.waitingOnFirstCall
                          ? "No logged first call yet"
                          : "Since the first logged contact"
                      }
                    >
                      {stackMidLine([record.silence, record.nextChase])}
                    </Link>
                    <div className="ff-lead-stack-convert" data-ff-lead-stack-convert="">
                      {record.convertedDealId ? (
                        <Link href={`/deals/${record.convertedDealId}`} className="ff-lead-stack-open-deal">
                          Open deal
                        </Link>
                      ) : (
                        <StartShopForm leadId={record.id} />
                      )}
                    </div>
                  </div>
                  <div
                    className="ff-lead-stack-bottom"
                    data-ff-lead-stack-bottom=""
                    data-ff-lead-job=""
                    data-ff-lead-card-edits=""
                  >
                    <div className="ff-lead-stack-col" data-ff-lead-stack-col="policy">
                      {policyLabel ? (
                        <span
                          className="ff-lead-stack-policy"
                          data-ff-lead-policy-form={record.policyForm || undefined}
                          title={record.policyForm || record.lob || record.lineLabel}
                        >
                          {policyLabel}
                        </span>
                      ) : null}
                      {record.policyForm && record.lob ? (
                        <span className="ff-lead-stack-lob" data-ff-lead-lob="">
                          {record.lob}
                        </span>
                      ) : null}
                    </div>
                    <div
                      className="ff-lead-stack-col"
                      data-ff-lead-stack-col="follow-up"
                      data-ff-lead-follow-edit=""
                    >
                      <LeadTemplateOverride
                        leadId={record.id}
                        templateId={record.templateId}
                        templates={templates}
                        resolvedName={record.followUpName}
                        resolvedTemplateId={record.resolvedTemplateId}
                      />
                    </div>
                    <div className="ff-lead-stack-col" data-ff-lead-stack-col="status">
                      <LeadPipelineStatusSelect leadId={record.id} status={record.status} />
                    </div>
                    <div className="ff-lead-stack-col" data-ff-lead-stack-col="response">
                      <ResponseTimer leadId={record.id} dueAt={record.dueAt} done={record.clockDone} />
                    </div>
                    <div className="ff-lead-stack-col" data-ff-lead-stack-col="heat">
                      <LeadHeatToggle leadId={record.id} temperature={record.temperature} />
                    </div>
                  </div>
                </div>
                <span className="sr-only">{record.heatLabel}</span>
              </article>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
