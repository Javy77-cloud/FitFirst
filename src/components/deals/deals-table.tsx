import Link from "next/link";
import { StagePill } from "@/components/fit-badge";
import { DealRowComms } from "@/components/deal-row-comms";
import { ModuleListActions } from "@/components/developer-hub/module-list-actions";
import { SelectRowCheckbox } from "@/components/developer-hub/list-selection";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import { DEALS_LIST_COLUMNS } from "@/lib/list-columns";
import { sourceLabel } from "@/lib/crm/sources";
import { formatDay, formatMoney } from "@/lib/domain";
import { formatInDeskEsignList } from "@/lib/esign/in-desk";
import type { DealListRow } from "@/lib/db/queries";
import { haystack } from "@/lib/search/live-query";

type DealsSheetRow = Pick<DealListRow, "deal" | "contact" | "account">;

export async function DealsTable({
  rows,
  users,
  initialQuery = "",
}: {
  rows: DealsSheetRow[];
  users: Map<string, string>;
  initialQuery?: string;
}) {
  return (
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
          initialQuery={initialQuery}
          columns={DEALS_LIST_COLUMNS}
          empty="No deals match this filter. Shopping stays on the deal list — quotes are not policies."
          rows={rows.map(({ deal, contact, account }) => ({
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
  );
}
