import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { StagePill } from "@/components/fit-badge";
import { DealDocsUpload } from "@/components/deal/deal-docs-upload";
import { DealRowComms } from "@/components/deal-row-comms";
import { sourceLabel } from "@/lib/crm/sources";
import { formatDay, formatMoney } from "@/lib/domain";
import { formatInDeskEsignList } from "@/lib/esign/in-desk";
import { BookFilterBar } from "@/components/desk/book-filter-bar";
import { ModuleListActions } from "@/components/developer-hub/module-list-actions";
import { SelectRowCheckbox } from "@/components/developer-hub/list-selection";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import { DEALS_LIST_COLUMNS } from "@/lib/list-columns";
import { listBoundPendingDeals, listDealLookup, listDeals, listPartyTypeahead, listUsersById, type DealListFilter } from "@/lib/db/queries";
import { loadDeskLineSettings } from "@/lib/db/line-settings";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const STAGE_HINT: Record<string, string> = {
  open: "Open quotes — shopping, quoting, comparing.",
  quote_sent: "Quote sent. Still not coverage.",
  won: "Closed won / bound this book. Issue may still be outstanding.",
};

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filter: DealListFilter = {
    stage: first(params.stage),
    attention: first(params.attention),
    family: first(params.family),
    pcSub: first(params.pcSub),
    lifeSub: first(params.lifeSub),
    healthSub: first(params.healthSub),
  };
  const [rows, users, lineSettings, lookup, parties] = await Promise.all([
    filter.attention === "bound_pending" ? listBoundPendingDeals() : listDeals(filter),
    listUsersById(),
    loadDeskLineSettings(),
    listDealLookup(),
    listPartyTypeahead(),
  ]);
  const hint =
    filter.attention === "bound_pending"
      ? "Bound, waiting on the carrier to issue. No in-force policy on the file."
      : filter.stage
        ? (STAGE_HINT[filter.stage] ?? `Stage · ${filter.stage}`)
        : "Shopping lives on the deal. Quotes attach here. A policy is not created from a quote. Call, SMS, and email from the row write a durable log on the deal.";
  const notice = first(params.notice);

  return (
    <AppShell
      title="Deals"
      actions={
        <Link href="/deals/new" className={cn(buttonVariants())}>
          New shopping deal
        </Link>
      }
    >
      <p className="mb-3 text-sm text-muted-foreground">{hint}</p>
      {notice === "need-deal" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          Choose an existing Deal (person or business name) before files are stored.
        </p>
      ) : null}
      {notice === "no-files" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          Add at least one file on a line.
        </p>
      ) : null}
      <BookFilterBar
        action="/deals"
        settings={lineSettings}
        family={filter.family}
        pcSub={filter.pcSub}
        lifeSub={filter.lifeSub}
        healthSub={filter.healthSub}
        hidden={{
          ...(filter.stage ? { stage: filter.stage } : {}),
          ...(filter.attention ? { attention: filter.attention } : {}),
        }}
      />
      <div className="mb-4">
        <DealDocsUpload deals={lookup} parties={parties} />
      </div>
      {filter.stage || filter.attention || filter.family || filter.lifeSub || filter.healthSub || filter.pcSub ? (
        <p className="mb-3 text-sm">
          <Link href="/deals" className="text-primary hover:underline">
            Clear filter
          </Link>
        </p>
      ) : null}
      <section className="ff-card overflow-x-auto">
        <ModuleListActions
          module="deals"
          recordIds={rows.map(({ deal }) => deal.id)}
          records={rows.map(({ deal, contact, account }) => ({
            id: deal.id,
            label: deal.title,
            email: contact?.email ?? account?.email,
            phone: contact?.phone ?? account?.phone,
            boundAt: deal.boundAt,
            archivedAt: deal.archivedAt,
            dealId: deal.id,
            contactId: contact?.id ?? deal.contactId,
            accountId: account?.id ?? deal.accountId,
            leadId: deal.leadId,
          }))}
        >
          <DeskColumnTable
            moduleId="deals"
            columns={DEALS_LIST_COLUMNS}
            empty="No deals match this filter. Shopping stays on the deal list — quotes are not policies."
            rows={rows.map(({ deal, contact, account }) => ({
              key: deal.id,
              cells: {
                pick: <SelectRowCheckbox id={deal.id} />,
                title: (
                  <Link href={`/deals/${deal.id}`} className="font-medium text-primary hover:underline">
                    {deal.title}
                  </Link>
                ),
                stage: <StagePill stage={deal.pipelineStage} />,
                line: deal.lineOfBusiness,
                subType: deal.policySubType ?? "—",
                state: deal.state,
                city: contact?.city ?? account?.city ?? "—",
                zip: contact?.zip ?? account?.zip ?? "—",
                address: deal.propertyOneliner ?? contact?.mailingAddress ?? account?.mailingAddress ?? "—",
                shopLines: (deal.shopLines ?? []).join(", ") || "—",
                source: sourceLabel(deal.source),
                contact: contact ? (
                  <Link href={`/contacts/${contact.id}`} className="text-primary hover:underline">
                    {contact.lastName}, {contact.firstName}
                  </Link>
                ) : account ? (
                  <Link href={`/accounts/${account.id}`} className="text-primary hover:underline">
                    {account.name}
                  </Link>
                ) : (
                  "—"
                ),
                phone: contact?.phone ?? account?.phone ?? "—",
                email: contact?.email ?? account?.email ?? "—",
                assigned: deal.ownerId ? users.get(deal.ownerId) ?? "—" : "—",
                premium: formatMoney(deal.coverageAmount),
                updated: formatDay(deal.updatedAt),
                esign: formatInDeskEsignList(deal.esignStatus, deal.esignSignedAt, deal.esignRequestedAt),
                comms: (
                  <DealRowComms
                    dealId={deal.id}
                    contactId={contact?.id ?? deal.contactId}
                    accountId={account?.id ?? deal.accountId}
                    phone={contact?.phone ?? account?.phone}
                    email={contact?.email ?? account?.email}
                  />
                ),
              },
            }))}
          />
        </ModuleListActions>
      </section>
    </AppShell>
  );
}
