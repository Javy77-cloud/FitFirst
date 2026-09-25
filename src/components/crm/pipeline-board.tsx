import Link from "next/link";
import { AddNewDealDialog } from "@/components/deals/add-new-deal-dialog";
import { DealBoardStageMove } from "@/components/deals/deal-board-stage-move";
import { DealRowActions } from "@/components/crm/deal-row-actions";
import { InsuredLink } from "@/components/crm/insured-link";
import { LinkedValue } from "@/components/crm/linked-value";
import { DealProductStageChips } from "@/components/deals/deal-product-stage-chips";
import { StagePill } from "@/components/fit-badge";
import { LINE_LABELS } from "@/lib/crm/bind";
import { insuredContactName, insuredHref, matchesDealFilters, type DealListFilter } from "@/lib/crm/lists";
import { homeAddressFromRecords } from "@/lib/meetings/types";
import { formatMoney } from "@/lib/domain";
import { visibleDealTitle } from "@/lib/deals/deal-title";
import { attachListProductStageHrefs, listProductStageChips } from "@/lib/deals/product-stages";
import type { DealListRow } from "@/lib/db/queries";
import type { PipelineStageRow } from "@/lib/db/schema";

export function PipelineBoard({
  rows,
  stages,
  filter = {},
}: {
  rows: DealListRow[];
  stages: PipelineStageRow[];
  filter?: DealListFilter;
}) {
  const known = new Set(stages.map((stage) => stage.slug));
  const filtered = rows.filter(({ deal, lead, contact, account, risk }) =>
    matchesDealFilters(
      {
        title: deal.title,
        pipelineStage: deal.pipelineStage,
        lineOfBusiness: deal.lineOfBusiness,
        quotingForm: deal.quotingForm,
        policySubType: deal.policySubType,
        state: deal.state,
        insured: insuredContactName({
          primaryNamedInsured: deal.primaryNamedInsured,
          secondaryNamedInsured: deal.secondaryNamedInsured,
          contact,
          lead,
        }),
        firstName: contact?.firstName ?? lead?.firstName,
        lastName: contact?.lastName ?? lead?.lastName,
        accountName: account?.name,
        phone: contact?.phone ?? lead?.phone,
        email: contact?.email ?? lead?.email,
        city: risk?.city ?? contact?.city,
      },
      filter,
    ),
  );
  const deals = filtered.map((row) => row.deal);
  const byId = new Map(filtered.map((row) => [row.deal.id, row]));
  const columns = [
    ...stages,
    ...(deals.some((deal) => !known.has(deal.pipelineStage))
      ? [
          {
            id: "unstaged",
            tenantId: "",
            pipelineId: "",
            slug: "_unstaged",
            name: "Unstaged",
            sortOrder: 999,
            color: "slate",
            seeded: false,
            createdAt: new Date(),
          } satisfies PipelineStageRow,
        ]
      : []),
  ];
  const movable = stages.filter((stage) => stage.slug !== "bound");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">

        <AddNewDealDialog triggerSize="sm" />
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
        {columns.map((stage) => {
          const column =
            stage.slug === "_unstaged"
              ? deals.filter((deal) => !known.has(deal.pipelineStage))
              : deals.filter((deal) => deal.pipelineStage === stage.slug);
          return (
            <section key={stage.id} className="ff-card min-h-48 overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <StagePill stage={stage.name || stage.slug} color={stage.color} />
                <span className="text-[11px] text-muted-foreground">{column.length}</span>
              </div>
              <div className="space-y-2 p-2">
                {column.length === 0 ? (
                  <p className="px-1 py-6 text-center text-xs text-muted-foreground">None</p>
                ) : (
                  column.map((deal) => {
                    const row = byId.get(deal.id);
                    const phone = row?.contact?.phone ?? row?.lead?.phone;
                    const email = row?.contact?.email ?? row?.lead?.email;
                    const insured = insuredContactName({
                      primaryNamedInsured: deal.primaryNamedInsured,
                      secondaryNamedInsured: deal.secondaryNamedInsured,
                      contact: row?.contact ?? null,
                      lead: row?.lead ?? null,
                    });
                    const href = insuredHref({ contactId: deal.contactId, leadId: deal.leadId });
                    return (
                      <article key={deal.id} className="rounded-md border border-border bg-background p-2.5">
                        <Link
                          href={`/deals/${deal.id}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {visibleDealTitle(deal)}
                        </Link>
                        <div className="mt-1 text-[11px] text-navy">
                          <InsuredLink href={href} name={insured} />
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {LINE_LABELS[deal.lineOfBusiness as keyof typeof LINE_LABELS] ??
                            deal.lineOfBusiness}{" "}
                          · {deal.state}
                          {row?.risk?.coverageA != null ? ` · ${formatMoney(row.risk.coverageA)}` : ""}
                        </div>
                        <div className="mt-1">
                          <DealProductStageChips
                            chips={attachListProductStageHrefs(listProductStageChips(deal), {
                              dealId: deal.id,
                            })}
                          />
                        </div>
                        <div className="mt-1 space-y-0.5 text-[11px]">
                          <LinkedValue value={phone} kind="tel" />
                          <div>
                            <LinkedValue value={email} kind="email" />
                          </div>
                        </div>
                        <div className="mt-2">
                          <DealRowActions
                            dealId={deal.id}
                            phone={phone}
                            email={email}
                            homeAddress={homeAddressFromRecords({
                              risk: row?.risk,
                              lead: row?.lead,
                              contact: row?.contact,
                            })}
                            contactId={deal.contactId}
                            leadId={deal.leadId}
                          />
                        </div>
                        {deal.pipelineStage !== "bound" && movable.length > 0 ? (
                          <DealBoardStageMove
                            dealId={deal.id}
                            dealTitle={deal.title}
                            currentStage={deal.pipelineStage}
                            options={movable.map((option) => ({
                              id: option.id,
                              slug: option.slug,
                              name: option.name,
                            }))}
                          />
                        ) : deal.pipelineStage === "bound" ? null : null}
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
