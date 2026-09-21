"use client";

import Link from "next/link";
import {
  LeadCadenceSelect,
  LeadHeatToggle,
  LeadPipelineStatusSelect,
  LeadTemplateOverride,
} from "@/components/leads/lead-queue-controls";
import { ResponseTimer } from "@/components/leads/response-timer";
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
      <section className="ff-book-heat-header mb-3" data-ff-leads-heat="" aria-label="Lead heat">
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
        {visible.map((record) => (
          <li key={record.id}>
            <article
              className={cn("ff-stack-card", `ff-heat-${record.temperature}`)}
              data-ff-leads-stack-card={record.id}
              data-ff-heat={record.temperature}
            >
              <span className="ff-stack-glyph" aria-hidden data-ff-stack-glyph={record.temperature} />
              <div className="ff-stack-card-body">
                <div className="ff-stack-card-spread">
                  <Link href={record.href} className="ff-stack-name">
                    {record.name}
                  </Link>
                  <span
                    className="ff-stack-silent"
                    data-ff-lead-silence=""
                    data-ff-silence-cue=""
                    title={record.waitingOnFirstCall ? "No logged first call yet" : "Since the first logged contact"}
                  >
                    {record.silence}
                  </span>
                </div>
                <div className="ff-stack-job" data-ff-lead-job="">
                  <ul className="ff-stack-products">
                    <li data-ff-lead-line="">
                      <span
                        className="ff-stack-product"
                        data-ff-lead-policy-form={record.policyForm || undefined}
                        title={record.policyForm || record.lob || record.lineLabel}
                      >
                        {record.lineLabel}
                      </span>
                      <span className="ff-stack-product-detail">
                        {record.policyForm && record.lob ? (
                          <span data-ff-lead-lob="">{record.lob}</span>
                        ) : null}
                        <span className="ff-stack-edit" data-ff-lead-card-edits="">
                          <LeadCadenceSelect leadId={record.id} cadence={record.cadence} />
                          <LeadPipelineStatusSelect leadId={record.id} status={record.status} />
                          <ResponseTimer leadId={record.id} dueAt={record.dueAt} done={record.clockDone} />
                          <LeadHeatToggle leadId={record.id} temperature={record.temperature} />
                        </span>
                      </span>
                    </li>
                  </ul>
                </div>
                <div className="ff-stack-edit" data-ff-lead-follow-edit="">
                  <LeadTemplateOverride
                    leadId={record.id}
                    templateId={record.templateId}
                    templates={templates}
                    resolvedName={record.followUpName}
                    resolvedTemplateId={record.resolvedTemplateId}
                  />
                </div>
                <Link href={record.href} className="ff-stack-next" data-ff-next-chase="">
                  {record.nextChase}
                </Link>
              </div>
              <span className="sr-only">{record.heatLabel}</span>
            </article>
          </li>
        ))}
      </ol>
    </div>
  );
}
