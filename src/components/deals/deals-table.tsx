import Link from "next/link";
import { StagePill } from "@/components/fit-badge";
import { DealNextActionTimer } from "@/components/deals/deal-next-action";
import { DealQuickActions } from "@/components/deals/deal-quick-actions";
import { DealStaleBadge } from "@/components/deals/deal-stale-badge";
import { DealRowActions } from "@/components/crm/deal-row-actions";
import { ModuleListActions } from "@/components/developer-hub/module-list-actions";
import { SelectRowCheckbox } from "@/components/developer-hub/list-selection";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import { DEALS_LIST_COLUMNS } from "@/lib/list-columns";
import { sourceLabel } from "@/lib/crm/sources";
import { isDealStale, nextDealActionAt } from "@/lib/deals/pipeline-desk";
import { formatDay, formatMoney } from "@/lib/domain";
import { formatInDeskEsignList } from "@/lib/esign/in-desk";
import type { DeskUserOption } from "@/lib/deals/transfer";
import type { DealListRow } from "@/lib/db/queries";
import { haystack } from "@/lib/search/live-query";
import { sheetAttr } from "@/lib/desk/sheet-attr";

type DealsSheetRow = Pick<DealListRow, "deal" | "contact" | "account"> & {
  risk?: { coverageA?: number | null } | null;
};

function dealValue(row: DealsSheetRow): number | null {
  const amount = row.deal.coverageAmount ?? row.risk?.coverageA ?? null;
  return amount == null ? null : amount;
}

export async function DealsTable({
  rows,
  users,
  agents = [],
  initialQuery = "",
  nextByDeal = new Map(),
}: {
  rows: DealsSheetRow[];
  users: Map<string, string>;
  agents?: DeskUserOption[];
  initialQuery?: string;
  nextByDeal?: Map<string, string>;
}) {
  return (
    <section className="ff-card overflow-x-auto">
      <ModuleListActions
        module="deals"
        showMacrosLink={false}
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
          initialQuery={initialQuery}
          columns={DEALS_LIST_COLUMNS}
          empty="No deals match this filter. Shopping stays on the deal list — quotes are not policies."
          rows={rows.map(({ deal, contact, account, risk }) => {
            const value = dealValue({ deal, contact, account, risk });
            const phone = contact?.phone ?? account?.phone ?? "";
            const email = contact?.email ?? account?.email ?? "";
            const nextDue =
              nextByDeal.get(deal.id) ??
              nextDealActionAt({ updatedAt: deal.updatedAt })?.toISOString() ??
              null;
            const stale = isDealStale({
              updatedAt: deal.updatedAt,
              boundAt: deal.boundAt,
              archivedAt: deal.archivedAt,
              pipelineStage: deal.pipelineStage,
              nextDueAt: nextDue,
            });
            return {
              key: deal.id,
              hay: haystack([
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
              ]),
              sort: {
                pick: "",
                title: sheetAttr(deal.title),
                stage: sheetAttr(deal.pipelineStage),
                line: sheetAttr(deal.lineOfBusiness),
                subType: sheetAttr(deal.policySubType),
                state: sheetAttr(deal.state),
                city: sheetAttr(contact?.city ?? account?.city),
                zip: sheetAttr(contact?.zip ?? account?.zip),
                address: sheetAttr(deal.propertyOneliner ?? contact?.mailingAddress ?? account?.mailingAddress),
                shopLines: sheetAttr((deal.shopLines ?? []).join(", ")),
                source: sheetAttr(sourceLabel(deal.source)),
                contact: sheetAttr(
                  contact ? `${contact.lastName}, ${contact.firstName}` : account?.name,
                ),
                email: sheetAttr(email),
                assigned: sheetAttr(deal.ownerId ? users.get(deal.ownerId) : ""),
                value: sheetAttr(value),
                premium: sheetAttr(deal.coverageAmount),
                nextAction: sheetAttr(nextDue),
                updated: sheetAttr(deal.updatedAt ? new Date(deal.updatedAt).toISOString() : ""),
                esign: sheetAttr(deal.esignStatus),
                // Keep "" on both sides — client action labels must not become data-sort.
                comms: "",
              },
              cells: {
                pick: <SelectRowCheckbox id={deal.id} />,
                title: (
                  <div>
                    <Link href={`/deals/${deal.id}`} className="font-medium text-primary hover:underline">
                      {deal.title}
                    </Link>
                    <div className="text-sm text-muted-foreground">{phone || "—"}</div>
                    <DealQuickActions
                      dealId={deal.id}
                      phone={phone || null}
                      email={email || null}
                      contactId={contact?.id ?? deal.contactId}
                      accountId={account?.id ?? deal.accountId}
                      leadId={deal.leadId}
                      homeAddress={deal.propertyOneliner ?? contact?.mailingAddress ?? account?.mailingAddress}
                    />
                    {stale ? (
                      <DealStaleBadge
                        dealId={deal.id}
                        contactId={contact?.id ?? deal.contactId}
                        leadId={deal.leadId}
                      />
                    ) : null}
                  </div>
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
                email: email || "—",
                assigned: deal.ownerId ? users.get(deal.ownerId) ?? "—" : "—",
                value: formatMoney(value),
                premium: formatMoney(deal.coverageAmount),
                nextAction: <DealNextActionTimer dueAt={nextDue} />,
                updated: formatDay(deal.updatedAt),
                esign: formatInDeskEsignList(deal.esignStatus, deal.esignSignedAt, deal.esignRequestedAt),
                comms: (
                  <DealRowActions
                    dealId={deal.id}
                    contactId={contact?.id ?? deal.contactId}
                    accountId={account?.id ?? deal.accountId}
                    leadId={deal.leadId}
                    phone={phone || null}
                    email={email || null}
                    ownerId={deal.ownerId}
                    users={agents}
                  />
                ),
              },
            };
          })}
        />
      </ModuleListActions>
    </section>
  );
}
