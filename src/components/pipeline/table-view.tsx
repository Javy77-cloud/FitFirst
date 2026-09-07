"use client";

import Link from "next/link";
import { DealNextActionTimer } from "@/components/deals/deal-next-action";
import { DealQuickActions } from "@/components/deals/deal-quick-actions";
import { DealRowActions } from "@/components/crm/deal-row-actions";
import { InsuredLink } from "@/components/crm/insured-link";
import { LinkedValue } from "@/components/crm/linked-value";
import { StagePill } from "@/components/fit-badge";
import { ColumnTable } from "@/components/lists/column-table";
import { LINE_LABELS } from "@/lib/crm/bind";
import { formatIsoDate } from "@/lib/crm/display";
import { formatMoney } from "@/lib/domain";
import type { DeskUserOption } from "@/lib/deals/transfer";
import { nextDealActionAt } from "@/lib/deals/pipeline-desk";
import { sheetAttr } from "@/lib/desk/sheet-attr";
import { dealSearchHaystack } from "@/lib/deals/deal-title";
import { PIPELINE_LIST_COLUMNS } from "@/lib/list-columns";
import { dealMatchesStage, pipelineHref } from "@/lib/wire/pipeline";
import type { PipelineBoardView, PipelineCardView } from "@/lib/wire/pipeline-cards";

export function PipelineTableView({
  board,
  cards,
  stageFilter,
  agents = [],
}: {
  board: PipelineBoardView;
  cards: PipelineCardView[];
  stageFilter?: string | null;
  agents?: DeskUserOption[];
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
      <ColumnTable
        moduleId="pipeline"
        columns={PIPELINE_LIST_COLUMNS}
        empty={
          filterStage
            ? "No deals in this stage. Clear the stage filter or create one above."
            : "No deals on this board. Create one or drag a shop here from another tab."
        }
        rows={filtered.map((deal) => ({
          key: deal.id,
          hay: dealSearchHaystack({
            title: deal.title,
            primaryNamedInsured: deal.insured,
            lineOfBusiness: deal.lineOfBusiness,
          }),
          sort: {
            title: sheetAttr(deal.title),
            insured: sheetAttr(deal.insured),
            phone: sheetAttr(deal.phone),
            email: sheetAttr(deal.email),
            address: sheetAttr(deal.address),
            line: sheetAttr(deal.lineOfBusiness),
            state: sheetAttr(deal.state),
            city: sheetAttr(deal.city),
            coverageA: sheetAttr(deal.coverageA),
            carrier: sheetAttr(deal.carrier),
            stage: sheetAttr(deal.pipelineStage),
            updated: sheetAttr(deal.updatedAt),
            bound: sheetAttr(deal.boundAt),
            actions: "",
          },
          cells: {
            title: (
              <div>
                <Link href={`/deals/${deal.id}`} className="font-medium text-primary hover:underline">
                  {deal.title}
                </Link>
                <div className="text-sm text-muted-foreground">{deal.phone || "—"}</div>
                <DealQuickActions
                  dealId={deal.id}
                  phone={deal.phone}
                  email={deal.email}
                  contactId={deal.contactId}
                  accountId={deal.accountId}
                  leadId={deal.leadId}
                />
                <div className="mt-1">
                  <DealNextActionTimer
                    dueAt={nextDealActionAt({ updatedAt: deal.updatedAt })?.toISOString() ?? null}
                  />
                </div>
              </div>
            ),
            insured: <InsuredLink href={deal.insuredHref} name={deal.insured} />,
            phone: <LinkedValue value={deal.phone} kind="tel" />,
            email: <LinkedValue value={deal.email} kind="email" />,
            address: <LinkedValue value={deal.address} />,
            line: LINE_LABELS[deal.lineOfBusiness as keyof typeof LINE_LABELS] ?? deal.lineOfBusiness,
            state: deal.state,
            city: deal.city ?? "—",
            coverageA: deal.coverageA != null ? formatMoney(deal.coverageA) : "—",
            carrier: deal.carrier ?? "—",
            stage: (
              <StagePill
                stage={labels.get(deal.pipelineStageSlug ?? "") ?? deal.pipelineStage}
                color={colors.get(deal.pipelineStageSlug ?? "") ?? colors.get(deal.pipelineStage)}
              />
            ),
            updated: deal.updatedAt ? formatIsoDate(new Date(deal.updatedAt)) : "—",
            bound: deal.boundAt ? formatIsoDate(new Date(deal.boundAt)) : "Unbound",
            actions: (
              <DealRowActions
                dealId={deal.id}
                phone={deal.phone}
                email={deal.email}
                homeAddress={deal.address}
                contactId={deal.contactId}
                accountId={deal.accountId}
                leadId={deal.leadId}
                ownerId={deal.ownerId}
                users={agents}
              />
            ),
          },
        }))}
      />
    </section>
  );
}
