"use client";

import Link from "next/link";
import { DealRowActions } from "@/components/crm/deal-row-actions";
import { InsuredLink } from "@/components/crm/insured-link";
import { LinkedValue } from "@/components/crm/linked-value";
import { StagePill } from "@/components/fit-badge";
import { LINE_LABELS } from "@/lib/crm/bind";
import { formatIsoDate } from "@/lib/crm/display";
import { formatMoney } from "@/lib/domain";
import { PIPELINE_FIELDS } from "@/lib/wire/pipeline";
import type { PipelineBoardView, PipelineCardView } from "@/lib/wire/pipeline-cards";

export function PipelineTableView({
  board,
  cards,
}: {
  board: PipelineBoardView;
  cards: PipelineCardView[];
}) {
  const labels = new Map(board.stages.map((stage) => [stage.slug, stage.name]));

  return (
    <section className="ff-card overflow-x-auto">
      {cards.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          No deals on this board. Create one or drag a shop here from another tab.
        </p>
      ) : (
        <table className="ff-table">
          <thead>
            <tr>
              {PIPELINE_FIELDS.map((field) => (
                <th key={field.id} data-col={`pipeline_fields.${field.id}`}>
                  {field.label}
                </th>
              ))}
              <th>Call / SMS / Email / Task</th>
            </tr>
          </thead>
          <tbody>
            {cards.map((deal) => (
              <tr key={deal.id}>
                <td data-col="pipeline_fields.title">
                  <Link href={`/deals/${deal.id}`} className="font-medium text-primary hover:underline">
                    {deal.title}
                  </Link>
                </td>
                <td data-col="pipeline_fields.insured">
                  <InsuredLink href={deal.insuredHref} name={deal.insured} />
                </td>
                <td data-col="pipeline_fields.phone">
                  <LinkedValue value={deal.phone} kind="tel" />
                </td>
                <td data-col="pipeline_fields.email">
                  <LinkedValue value={deal.email} kind="email" />
                </td>
                <td data-col="pipeline_fields.address">
                  <LinkedValue value={deal.address} />
                </td>
                <td data-col="pipeline_fields.line">
                  {LINE_LABELS[deal.lineOfBusiness as keyof typeof LINE_LABELS] ?? deal.lineOfBusiness}
                </td>
                <td data-col="pipeline_fields.state">{deal.state}</td>
                <td data-col="pipeline_fields.city">{deal.city ?? "—"}</td>
                <td data-col="pipeline_fields.coverageA">
                  {deal.coverageA != null ? formatMoney(deal.coverageA) : "—"}
                </td>
                <td data-col="pipeline_fields.carrier">{deal.carrier ?? "—"}</td>
                <td data-col="pipeline_fields.stage">
                  <StagePill
                    stage={labels.get(deal.pipelineStageSlug ?? "") ?? deal.pipelineStage}
                  />
                </td>
                <td data-col="pipeline_fields.updated">
                  {deal.updatedAt ? formatIsoDate(new Date(deal.updatedAt)) : "—"}
                </td>
                <td data-col="pipeline_fields.bound">
                  {deal.boundAt ? formatIsoDate(new Date(deal.boundAt)) : "Unbound"}
                </td>
                <td>
                  <DealRowActions dealId={deal.id} phone={deal.phone} email={deal.email} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
