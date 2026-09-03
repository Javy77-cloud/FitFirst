import Link from "next/link";
import { ColumnPicker } from "@/components/crm/column-picker";
import { DealFilters } from "@/components/crm/deal-filters";
import { DealRowActions } from "@/components/crm/deal-row-actions";
import { InsuredLink } from "@/components/crm/insured-link";
import { LinkedValue } from "@/components/crm/linked-value";
import { StagePill } from "@/components/fit-badge";
import { LINE_LABELS } from "@/lib/crm/bind";
import { formatIsoDate } from "@/lib/crm/display";
import {
  insuredContactName,
  insuredHref,
  matchesDealFilters,
  riskAddress,
  type DealListFilter,
} from "@/lib/crm/lists";
import { formatMoney } from "@/lib/domain";
import type { DealListRow } from "@/lib/db/queries";
import type { PipelineStageRow } from "@/lib/db/schema";

const COLUMNS = [
  { id: "deal", header: "Deal", defaultVisible: true, hideable: false },
  { id: "actions", header: "Call / SMS / Email / Task", defaultVisible: true, hideable: false },
  { id: "insured", header: "Insured / contact name", defaultVisible: true },
  { id: "phone", header: "Phone", defaultVisible: true },
  { id: "email", header: "Email", defaultVisible: true },
  { id: "address", header: "Address", defaultVisible: true },
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
  const labels = new Map(stages.map((stage) => [stage.slug, stage.label]));
  const visible = rows.filter(({ deal, lead, contact, risk }) =>
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
      <section className="ff-card overflow-x-auto">
        <table className="ff-table">
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th key={col.id} data-col={col.id}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="text-muted-foreground">
                  No shops match. Clear the filter or create a deal.
                </td>
              </tr>
            ) : (
              visible.map(({ deal, lead, contact, risk }) => {
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
                  <tr key={deal.id}>
                    <td data-col="deal">
                      <Link href={`/deals/${deal.id}`} className="font-medium text-primary hover:underline">
                        {deal.title}
                      </Link>
                    </td>
                    <td data-col="actions">
                      <DealRowActions dealId={deal.id} phone={phone} email={email} />
                    </td>
                    <td data-col="insured">
                      <InsuredLink href={href} name={insured} />
                    </td>
                    <td data-col="phone">
                      <LinkedValue value={phone} kind="tel" />
                    </td>
                    <td data-col="email">
                      <LinkedValue value={email} kind="email" />
                    </td>
                    <td data-col="address">
                      <LinkedValue value={riskAddress(risk)} />
                    </td>
                    <td data-col="stage">
                      <StagePill stage={labels.get(deal.pipelineStage) ?? deal.pipelineStage} />
                    </td>
                    <td data-col="line">
                      {LINE_LABELS[deal.lineOfBusiness as keyof typeof LINE_LABELS] ??
                        deal.lineOfBusiness}
                    </td>
                    <td data-col="state">{deal.state}</td>
                    <td data-col="city">{risk?.city ?? contact?.city ?? "—"}</td>
                    <td data-col="coverageA">
                      {risk?.coverageA != null ? formatMoney(risk.coverageA) : "—"}
                    </td>
                    <td data-col="updated">{formatIsoDate(deal.updatedAt)}</td>
                    <td data-col="bound">{deal.boundAt ? formatIsoDate(deal.boundAt) : "Unbound"}</td>
                    <td data-col="account" className="capitalize">
                      {contact?.accountKind === "commercial" ? "Business" : contact ? "Personal" : "Lead"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </ColumnPicker>
  );
}
