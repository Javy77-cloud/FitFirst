import Link from "next/link";
import { ColumnPicker } from "@/components/crm/column-picker";
import { SheetHeader } from "@/components/sheet/sheet-header";
import { SheetTbody } from "@/components/sheet/sheet-table";
import { DealFilters } from "@/components/crm/deal-filters";
import { DealRowActions } from "@/components/crm/deal-row-actions";
import { InsuredLink } from "@/components/crm/insured-link";
import { LinkedValue } from "@/components/crm/linked-value";
import { DealProductStageChips } from "@/components/deals/deal-product-stage-chips";
import { StagePill } from "@/components/fit-badge";
import { LINE_LABELS } from "@/lib/crm/bind";
import { formatIsoDate } from "@/lib/crm/display";
import { LiveContainsScope } from "@/components/search/live-contains-scope";
import {
  insuredContactName,
  insuredHref,
  matchesDealFilters,
  riskAddress,
  type DealListFilter,
} from "@/lib/crm/lists";
import { dealSearchHaystack } from "@/lib/deals/deal-title";
import { listProductStageChips } from "@/lib/deals/product-stages";
import { haystack } from "@/lib/search/live-query";
import { formatMoney } from "@/lib/domain";
import type { DealListRow } from "@/lib/db/queries";
import type { PipelineStageRow } from "@/lib/db/schema";

const COLUMNS = [
  { id: "deal", header: "Deal", defaultVisible: true, hideable: false },
  { id: "actions", header: "Call / SMS / Task / Meeting", defaultVisible: true, hideable: false },
  { id: "insured", header: "Insured / contact name", defaultVisible: true },
  { id: "phone", header: "Phone", defaultVisible: true, promoteIfMissing: true },
  { id: "email", header: "Email", defaultVisible: true, promoteIfMissing: true },
  { id: "address", header: "Address", defaultVisible: true, promoteIfMissing: true },
  { id: "stage", header: "Stage", defaultVisible: true },
  { id: "line", header: "Line", defaultVisible: true },
  { id: "state", header: "State", defaultVisible: true },
  { id: "city", header: "City", defaultVisible: true },
  { id: "coverageA", header: "Cov A", defaultVisible: true },
  { id: "updated", header: "Updated", defaultVisible: false },
  { id: "bound", header: "Bound", defaultVisible: false },
  { id: "account", header: "Account", defaultVisible: false },
];

export function DealListTable({
  rows,
  stages,
  filter = {},
  filterPath = "/deals",
  filterView,
  showFilters = true,
}: {
  rows: DealListRow[];
  stages: PipelineStageRow[];
  filter?: DealListFilter;
  filterPath?: string;
  filterView?: string;
  showFilters?: boolean;
}) {
  const labels = new Map(stages.map((stage) => [stage.slug, stage.name]));
  const colors = new Map(stages.map((stage) => [stage.slug, stage.color]));
  const visible = rows.filter(({ deal, lead, contact, account, risk }) =>
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
        firstName: contact?.firstName ?? lead?.firstName,
        lastName: contact?.lastName ?? lead?.lastName,
        accountName: account?.name,
        phone: contact?.phone ?? lead?.phone,
        email: contact?.email ?? lead?.email,
        city: risk?.city ?? contact?.city,
      },
      { ...filter, q: undefined },
    ),
  );

  return (
    <ColumnPicker
      tableId="deals"
      columns={COLUMNS}
      toolbar={
        showFilters ? (
          <DealFilters pathname={filterPath} view={filterView} filter={filter} stages={stages} />
        ) : undefined
      }
    >
      <LiveContainsScope moduleId="deals" initialQuery={filter.q ?? ""}>
      <section className="ff-card overflow-x-auto">
        <table className="ff-table">
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <SheetHeader key={col.id} table="deals-crm" col={col.id} dataCol={col.id}>
                  {col.header}
                </SheetHeader>
              ))}
            </tr>
          </thead>
          <SheetTbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="text-muted-foreground">
                  No shops match. Clear the filter or create a deal.
                </td>
              </tr>
            ) : (
              visible.map(({ deal, lead, contact, account, risk }) => {
                const insured = insuredContactName({
                  primaryNamedInsured: deal.primaryNamedInsured,
                  secondaryNamedInsured: deal.secondaryNamedInsured,
                  contact,
                  lead,
                });
                const href = insuredHref({ contactId: deal.contactId, leadId: deal.leadId });
                const phone = contact?.phone ?? lead?.phone;
                const email = contact?.email ?? lead?.email;
                return (
                  <tr
                    key={deal.id}
                    data-hay={haystack([
                      dealSearchHaystack({
                        title: deal.title,
                        firstName: contact?.firstName ?? lead?.firstName,
                        lastName: contact?.lastName ?? lead?.lastName,
                        accountName: account?.name,
                        primaryNamedInsured: deal.primaryNamedInsured,
                        lineOfBusiness: deal.lineOfBusiness,
                      }),
                      insured,
                      phone,
                      email,
                      riskAddress(risk),
                      deal.state,
                      risk?.city ?? contact?.city,
                    ])}
                  >
                    <td data-col="deal" data-sheet-col="deal">
                      <Link href={`/deals/${deal.id}`} className="font-medium text-primary hover:underline">
                        {deal.title}
                      </Link>
                    </td>
                    <td data-col="actions" data-sheet-col="actions">
                      <DealRowActions
                        dealId={deal.id}
                        phone={phone}
                        email={email}
                        homeAddress={riskAddress(risk) ?? undefined}
                        contactId={deal.contactId}
                        leadId={deal.leadId}
                      />
                    </td>
                    <td data-col="insured" data-sheet-col="insured">
                      <InsuredLink href={href} name={insured} />
                    </td>
                    <td data-col="phone" data-sheet-col="phone">
                      <LinkedValue value={phone} kind="tel" />
                    </td>
                    <td data-col="email" data-sheet-col="email">
                      <LinkedValue value={email} kind="email" />
                    </td>
                    <td data-col="address" data-sheet-col="address">
                      <LinkedValue value={riskAddress(risk)} />
                    </td>
                    <td data-col="stage" data-sheet-col="stage">
                      {(() => {
                        const chips = listProductStageChips(deal);
                        return chips.length > 0 ? (
                          <DealProductStageChips chips={chips} />
                        ) : (
                          <StagePill
                            stage={labels.get(deal.pipelineStage) ?? deal.pipelineStage}
                            color={colors.get(deal.pipelineStage)}
                          />
                        );
                      })()}
                    </td>
                    <td data-col="line" data-sheet-col="line">
                      {LINE_LABELS[deal.lineOfBusiness as keyof typeof LINE_LABELS] ??
                        deal.lineOfBusiness}
                    </td>
                    <td data-col="state" data-sheet-col="state">{deal.state}</td>
                    <td data-col="city" data-sheet-col="city">{risk?.city ?? contact?.city ?? "—"}</td>
                    <td
                      data-col="coverageA"
                      data-sheet-col="coverageA"
                      data-sort={risk?.coverageA == null ? "" : String(risk.coverageA)}
                      data-sheet-cell={risk?.coverageA == null ? "" : String(risk.coverageA)}
                      data-sheet-table-tax=""
                    >
                      {risk?.coverageA != null ? formatMoney(risk.coverageA) : "—"}
                    </td>
                    <td data-col="updated" data-sheet-col="updated">{formatIsoDate(deal.updatedAt)}</td>
                    <td data-col="bound" data-sheet-col="bound">{deal.boundAt ? formatIsoDate(deal.boundAt) : "Unbound"}</td>
                    <td data-col="account" data-sheet-col="account" className="capitalize">
                      {deal.accountKind === "commercial" ? "Business" : contact ? "Personal" : "Lead"}
                    </td>
                  </tr>
                );
              })
            )}
          </SheetTbody>
        </table>
      </section>
      </LiveContainsScope>
    </ColumnPicker>
  );
}
