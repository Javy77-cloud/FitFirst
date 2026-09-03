import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { StagePill } from "@/components/fit-badge";
import { ColumnPicker, Col } from "@/components/column-picker";
import { DealRowComms } from "@/components/deal-row-comms";
import { defaultColumns } from "@/lib/desk/columns";
import { formatDay, formatMoney } from "@/lib/domain";
import { listBoundPendingDeals, listDeals, listUsersById, type DealListFilter } from "@/lib/db/queries";
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
  const filter: DealListFilter = {
    stage: first(params.stage),
    attention: first(params.attention),
  };
  const rows =
    filter.attention === "bound_pending" ? await listBoundPendingDeals() : await listDeals(filter);
  const users = await listUsersById();
  const hint =
    filter.attention === "bound_pending"
      ? "Bound, waiting on the carrier to issue. No in-force policy on the file."
      : filter.stage
        ? (STAGE_HINT[filter.stage] ?? `Stage · ${filter.stage}`)
        : "Shopping lives on the deal. Quotes attach here. A policy is not created from a quote. Call, SMS, and email from the row write a durable log on the deal.";

  return (
    <AppShell
      title="Deals"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <ColumnPicker tableKey="deals" initial={defaultColumns("deals")} />
          <Link href="/deals/new" className={cn(buttonVariants())}>
            New shopping deal
          </Link>
        </div>
      }
    >
      <p className="mb-3 text-sm text-muted-foreground">{hint}</p>
      {filter.stage || filter.attention ? (
        <p className="mb-3 text-[12px]">
          <Link href="/deals" className="text-primary hover:underline">
            Clear filter
          </Link>
        </p>
      ) : null}
      <section className="ff-card overflow-x-auto">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No deals match.</p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <Col table="deals" col="title" as="th">Deal</Col>
                <Col table="deals" col="stage" as="th">Stage</Col>
                <Col table="deals" col="line" as="th">Line</Col>
                <Col table="deals" col="state" as="th">State</Col>
                <Col table="deals" col="contact" as="th">Contact</Col>
                <Col table="deals" col="phone" as="th">Phone</Col>
                <Col table="deals" col="email" as="th">Email</Col>
                <Col table="deals" col="assigned" as="th">Assigned</Col>
                <Col table="deals" col="premium" as="th">Coverage $</Col>
                <Col table="deals" col="updated" as="th">Updated</Col>
                <Col table="deals" col="comms" as="th">Comms</Col>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ deal, contact, account }) => (
                <tr key={deal.id}>
                  <Col table="deals" col="title">
                    <Link href={`/deals/${deal.id}`} className="font-medium text-primary hover:underline">
                      {deal.title}
                    </Link>
                  </Col>
                  <Col table="deals" col="stage">
                    <StagePill stage={deal.pipelineStage} />
                  </Col>
                  <Col table="deals" col="line">{deal.lineOfBusiness}</Col>
                  <Col table="deals" col="state">{deal.state}</Col>
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
                  <Col table="deals" col="premium">{formatMoney(deal.coverageAmount)}</Col>
                  <Col table="deals" col="updated">{formatDay(deal.updatedAt)}</Col>
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
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
