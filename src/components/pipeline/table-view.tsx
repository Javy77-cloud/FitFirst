"use client";

import Link from "next/link";
import { DealRowActions } from "@/components/crm/deal-row-actions";
import { InsuredLink } from "@/components/crm/insured-link";
import { LinkedValue } from "@/components/crm/linked-value";
import { StagePill } from "@/components/fit-badge";
import { LINE_LABELS } from "@/lib/crm/bind";
import { formatIsoDate } from "@/lib/crm/display";
import { formatMoney } from "@/lib/domain";
import { dealMatchesStage, PIPELINE_FIELDS, pipelineHref } from "@/lib/wire/pipeline";
import type { PipelineBoardView, PipelineCardView } from "@/lib/wire/pipeline-cards";

export function PipelineTableView({
  board,
  cards,
  stageFilter,
}: {
  board: PipelineBoardView;
  cards: PipelineCardView[];
  stageFilter?: string | null;
}) {
  const labels = new Map(board.stages.map((stage) => [stage.slug, stage.name]));
  const colors = new Map(board.stages.map((stage) => [stage.slug, stage.color]));
  const filtered =
    stageFilter && stageFilter !== "all"
      ? cards.filter((card) => dealMatchesStage(card, stageFilter))
      : cards;
  const filterStage = board.stages.find((stage) => stage.slug === stageFilter);

  return (
    <section className="ff-card overflow-x-auto">
      {filterStage ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2 text-sm">
          <span className="text-muted-foreground">Stage</span>
          <StagePill stage={filterStage.name} color={filterStage.color} />
          <Link href={pipelineHref(board.slug, "table")} className="text-primary hover:underline">
            Show all stages
          </Link>
        </div>
      ) : null}
      {filtered.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          {filterStage
            ? "No deals in this stage. Clear the stage filter or create one above."
            : "No deals on this board. Create one or drag a shop here from another tab."}
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
              <th>Call / SMS / Task / Meeting</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((deal) => (
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
                    color={colors.get(deal.pipelineStageSlug ?? "") ?? colors.get(deal.pipelineStage)}
                  />
                </td>
                <td data-col="pipeline_fields.updated">
                  {deal.updatedAt ? formatIsoDate(new Date(deal.updatedAt)) : "—"}
                </td>
                <td data-col="pipeline_fields.bound">
                  {deal.boundAt ? formatIsoDate(new Date(deal.boundAt)) : "Unbound"}
                </td>
                <td>
                  <DealRowActions
                    dealId={deal.id}
                    phone={deal.phone}
                    email={deal.email}
                    homeAddress={deal.address}
                    contactId={deal.contactId}
                    leadId={deal.leadId}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
