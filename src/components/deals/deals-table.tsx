import Link from "next/link";
import { StagePill } from "@/components/fit-badge";
import { ColumnPicker, Col } from "@/components/column-picker";
import { SheetTbody } from "@/components/sheet/sheet-table";
import { DealRowComms } from "@/components/deal-row-comms";
import { ModuleListActions } from "@/components/developer-hub/module-list-actions";
import { SelectRowCheckbox } from "@/components/developer-hub/list-selection";
import { defaultColumns } from "@/lib/desk/columns";
import { sourceLabel } from "@/lib/crm/sources";
import { formatDay, formatMoney } from "@/lib/domain";
import { formatInDeskEsignList } from "@/lib/esign/in-desk";
import type { DealListRow } from "@/lib/db/queries";

export function DealsColumnPicker() {
  return <ColumnPicker tableKey="deals" initial={defaultColumns("deals")} />;
}

export function DealsTable({
  rows,
  users,
}: {
  rows: DealListRow[];
  users: Map<string, string>;
}) {
  return (
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
              {rows.map(({ deal, contact, account }) => (
                <tr key={deal.id}>
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
  );
}
