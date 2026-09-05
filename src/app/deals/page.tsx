import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { StagePill } from "@/components/fit-badge";
import { ColumnPicker, Col } from "@/components/column-picker";
import { SheetTbody } from "@/components/sheet/sheet-table";
import { DealDocsUpload } from "@/components/deal/deal-docs-upload";
import { DealRowComms } from "@/components/deal-row-comms";
import { defaultColumns } from "@/lib/desk/columns";
import { sourceLabel } from "@/lib/crm/sources";
import { formatDay, formatMoney } from "@/lib/domain";
import { formatInDeskEsignList } from "@/lib/esign/in-desk";
import { BookFilterBar } from "@/components/desk/book-filter-bar";
import { LiveContainsInput } from "@/components/search/live-contains-input";
import { LiveContainsScope } from "@/components/search/live-contains-scope";
import { haystack } from "@/lib/search/live-query";
import { ModuleListActions } from "@/components/developer-hub/module-list-actions";
import { SelectRowCheckbox } from "@/components/developer-hub/list-selection";
import { listBoundPendingDeals, listDealLookup, listDeals, listUsersById, type DealListFilter } from "@/lib/db/queries";
import { loadDeskLineSettings } from "@/lib/db/line-settings";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const STAGE_HINT: Record<string, string> = {
  open: "Open quotes — shopping, quoting, comparing. Ana's HO3 lives here.",
  quote_sent: "Quote sent. Still not coverage.",
  won: "Closed won / bound this book. Issue may still be outstanding.",
};

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = first(params.q) ?? "";
  const filter: DealListFilter = {
    stage: first(params.stage),
    attention: first(params.attention),
    family: first(params.family),
    pcSub: first(params.pcSub),
    lifeSub: first(params.lifeSub),
    healthSub: first(params.healthSub),
  };
  const [rows, users, lineSettings, lookup] = await Promise.all([
    filter.attention === "bound_pending" ? listBoundPendingDeals() : listDeals(filter),
    listUsersById(),
    loadDeskLineSettings(),
    listDealLookup(),
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
      columns={<ColumnPicker tableKey="deals" initial={defaultColumns("deals")} />}
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
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <LiveContainsInput
          moduleId="deals"
          initialQuery={q}
          placeholder="Contains deal, contact, phone…"
          aria-label="Search deals"
          inputClassName="h-8 w-56 text-sm"
        />
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
          searchModuleId="deals"
        />
      </div>
      <div className="mb-4">
        <DealDocsUpload deals={lookup} />
      </div>
      {filter.stage || filter.attention || filter.family || filter.lifeSub || filter.healthSub || filter.pcSub ? (
        <p className="mb-3 text-sm">
          <Link href="/deals" className="text-primary hover:underline">
            Clear filter
          </Link>
        </p>
      ) : null}
      <LiveContainsScope moduleId="deals" initialQuery={q}>
      <section className="ff-card overflow-x-auto">
        <ModuleListActions module="deals" recordIds={rows.map(({ deal }) => deal.id)}>
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No deals match this filter. Shopping stays on the deal list — quotes are not
            policies.
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th className="w-8" aria-label="Select" />
                <Col table="deals" col="title" as="th">Deal</Col>
                <Col table="deals" col="stage" as="th">Stage</Col>
                <Col table="deals" col="line" as="th">Line</Col>
                <Col table="deals" col="subType" as="th">Life / Health type</Col>
                <Col table="deals" col="state" as="th">State</Col>
                <Col table="deals" col="city" as="th">City</Col>
                <Col table="deals" col="zip" as="th">ZIP</Col>
                <Col table="deals" col="address" as="th">Property address</Col>
                <Col table="deals" col="shopLines" as="th">Shop lines</Col>
                <Col table="deals" col="source" as="th">Source</Col>
                <Col table="deals" col="contact" as="th">Contact</Col>
                <Col table="deals" col="phone" as="th">Phone</Col>
                <Col table="deals" col="email" as="th">Email</Col>
                <Col table="deals" col="assigned" as="th">Assigned</Col>
                <Col table="deals" col="premium" as="th">Coverage $</Col>
                <Col table="deals" col="updated" as="th">Updated</Col>
                <Col table="deals" col="esign" as="th">E-sign</Col>
                <Col table="deals" col="comms" as="th">Comms</Col>
              </tr>
            </thead>
            <SheetTbody>
              {              rows.map(({ deal, contact, account }) => (
                <tr
                  key={deal.id}
                  data-hay={haystack([
                    deal.title,
                    deal.pipelineStage,
                    deal.lineOfBusiness,
                    deal.state,
                    deal.propertyOneliner,
                    deal.source,
                    contact?.firstName,
                    contact?.lastName,
                    contact?.phone,
                    contact?.email,
                    contact?.city,
                    account?.name,
                    account?.phone,
                    account?.email,
                  ])}
                >
                  <td>
                    <SelectRowCheckbox id={deal.id} />
                  </td>
                  <Col table="deals" col="title">
                    <Link href={`/deals/${deal.id}`} className="font-medium text-primary hover:underline">
                      {deal.title}
                    </Link>
                  </Col>
                  <Col table="deals" col="stage">
                    <StagePill stage={deal.pipelineStage} />
                  </Col>
                  <Col table="deals" col="line">{deal.lineOfBusiness}</Col>
                  <Col table="deals" col="subType">{deal.policySubType ?? "—"}</Col>
                  <Col table="deals" col="state">{deal.state}</Col>
                  <Col table="deals" col="city">{contact?.city ?? account?.city ?? "—"}</Col>
                  <Col table="deals" col="zip">{contact?.zip ?? account?.zip ?? "—"}</Col>
                  <Col table="deals" col="address">
                    {deal.propertyOneliner ?? contact?.mailingAddress ?? account?.mailingAddress ?? "—"}
                  </Col>
                  <Col table="deals" col="shopLines">
                    {(deal.shopLines ?? []).join(", ") || "—"}
                  </Col>
                  <Col table="deals" col="source">{sourceLabel(deal.source)}</Col>
                  <Col table="deals" col="contact">
                    {contact ? (
                      <Link href={`/contacts/${contact.id}`} className="text-primary hover:underline">
                        {contact.lastName}, {contact.firstName}
                      </Link>
                    ) : account ? (
                      <Link href={`/accounts/${account.id}`} className="text-primary hover:underline">
                        {account.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </Col>
                  <Col table="deals" col="phone">{contact?.phone ?? account?.phone ?? "—"}</Col>
                  <Col table="deals" col="email">{contact?.email ?? account?.email ?? "—"}</Col>
                  <Col table="deals" col="assigned">{deal.ownerId ? users.get(deal.ownerId) ?? "—" : "—"}</Col>
                  <Col table="deals" col="premium" sortValue={deal.coverageAmount}>
                    {formatMoney(deal.coverageAmount)}
                  </Col>
                  <Col table="deals" col="updated">{formatDay(deal.updatedAt)}</Col>
                  <Col table="deals" col="esign">
                    {formatInDeskEsignList(deal.esignStatus, deal.esignSignedAt, deal.esignRequestedAt)}
                  </Col>
                  <Col table="deals" col="comms">
                    <DealRowComms
                      dealId={deal.id}
                      contactId={contact?.id ?? deal.contactId}
                      accountId={account?.id ?? deal.accountId}
                      phone={contact?.phone ?? account?.phone}
                      email={contact?.email ?? account?.email}
                    />
                  </Col>
                </tr>
              ))}
            </SheetTbody>
          </table>
        )}
        </ModuleListActions>
      </section>
      </LiveContainsScope>
    </AppShell>
  );
}
