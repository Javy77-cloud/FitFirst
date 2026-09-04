import Link from "next/link";
import { updateDealStage } from "@/app/actions/crm";
import { DealRowActions } from "@/components/crm/deal-row-actions";
import { InsuredLink } from "@/components/crm/insured-link";
import { LinkedValue } from "@/components/crm/linked-value";
import { StagePill } from "@/components/fit-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { LINE_LABELS } from "@/lib/crm/bind";
import { insuredContactName, insuredHref, matchesDealFilters, type DealListFilter } from "@/lib/crm/lists";
import { homeAddressFromRecords } from "@/lib/meetings/types";
import { formatMoney } from "@/lib/domain";
import { cn } from "@/lib/utils";
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
  const filtered = rows.filter(({ deal, lead, contact, risk }) =>
    matchesDealFilters(
      {
        title: deal.title,
        pipelineStage: deal.pipelineStage,
        lineOfBusiness: deal.lineOfBusiness,
        state: deal.state,
        insured: insuredContactName({
          primaryNamedInsured: deal.primaryNamedInsured,
          secondaryNamedInsured: deal.secondaryNamedInsured,
          contact,
          lead,
        }),
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
            slug: "_unstaged",
            name: "Unstaged",
            sortOrder: 999,
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
        <p className="text-sm text-muted-foreground">
          Call or schedule a meeting from the card. Phone and email are already on the shop — do
          not open the deal just to copy them. Bound stays locked.
        </p>
        <Link href="/deals/new" className={cn(buttonVariants({ size: "sm" }))}>
          Create deal
        </Link>
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
                <StagePill stage={"name" in stage ? stage.name : stage.slug} />
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
                          {deal.title}
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
                          <form action={updateDealStage} className="mt-2 flex items-center gap-1">
                            <input type="hidden" name="dealId" value={deal.id} />
                            <select
                              name="stage"
                              defaultValue={
                                movable.some((option) => option.slug === deal.pipelineStage)
                                  ? deal.pipelineStage
                                  : movable[0]?.slug
                              }
                              className="h-7 flex-1 rounded-md border border-input bg-card px-1.5 text-[11px]"
                            >
                              {movable.map((option) => (
                                <option key={option.id} value={option.slug}>
                                  {option.name}
                                </option>
                              ))}
                            </select>
                            <Button type="submit" size="xs" variant="ghost">
                              Move
                            </Button>
                          </form>
                        ) : deal.pipelineStage === "bound" ? (
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            Bound — policy already written
                          </p>
                        ) : null}
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
