import Link from "next/link";
import { dropLeadPacket, dropSampleDecPacket } from "@/app/actions/lifecycle";
import { AppShell } from "@/components/app-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { StagePill } from "@/components/fit-badge";
import { ColumnPicker, Col } from "@/components/column-picker";
import { DecDropForm } from "@/components/crm/dec-drop-form";
import { DealRowComms } from "@/components/deal-row-comms";
import { DeskDrop } from "@/components/desk-drop";
import { defaultColumns } from "@/lib/desk/columns";
import { formatDay, formatMoney } from "@/lib/domain";
import { BookFilterBar } from "@/components/desk/book-filter-bar";
import { listBoundPendingDeals, listDeals, listUsersById, type DealListFilter } from "@/lib/db/queries";
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
  const filter: DealListFilter = {
    stage: first(params.stage),
    attention: first(params.attention),
    family: first(params.family),
    pcSub: first(params.pcSub),
    lifeSub: first(params.lifeSub),
    healthSub: first(params.healthSub),
  };
  const [rows, users, lineSettings] = await Promise.all([
    filter.attention === "bound_pending" ? listBoundPendingDeals() : listDeals(filter),
    listUsersById(),
    loadDeskLineSettings(),
  ]);
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
        <Link href="/deals/new" className={cn(buttonVariants())}>
          New shopping deal
        </Link>
      }
      columns={<ColumnPicker tableKey="deals" initial={defaultColumns("deals")} />}
    >
      <p className="mb-3 text-sm text-muted-foreground">{hint}</p>
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
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <DeskDrop compact />
        <div className="space-y-3">
          <form action={dropSampleDecPacket} className="ff-card space-y-2 p-4">
            <h2 className="text-sm font-semibold text-navy">Melbourne sample dec</h2>
            <p className="text-xs text-muted-foreground">
              Matches Elena Ruiz (name + phone/email) and attaches the dec on her deal. A new
              named insured opens a new shop. Source docs stay on the deal.
            </p>
            <Button type="submit" size="sm" variant="outline">
              Drop Melbourne dec (matches Elena)
            </Button>
          </form>
          <form action={dropLeadPacket} className="ff-card space-y-3 p-4">
            <h2 className="text-sm font-semibold text-navy">Drop a dec, wind mit, or 4-point</h2>
            <p className="text-xs text-muted-foreground">
              PDF or text. Named insured + phone or email matches an existing lead. Empty file
              uses the Melbourne sample. The file attaches to the shopping deal.
            </p>
            <input name="file" type="file" className="block w-full text-xs" />
            <Button type="submit" size="sm">
              Import packet onto a deal
            </Button>
          </form>
          <DecDropForm />
        </div>
      </div>
      {filter.stage || filter.attention || filter.family || filter.lifeSub || filter.healthSub || filter.pcSub ? (
        <p className="mb-3 text-[12px]">
          <Link href="/deals" className="text-primary hover:underline">
            Clear filter
          </Link>
        </p>
      ) : null}
      <section className="ff-card overflow-x-auto">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No deals match this filter. Shopping stays on the deal list — quotes are not
            policies.
          </p>
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
