import Link from "next/link";
import { AddNewDealDialog } from "@/components/deals/add-new-deal-dialog";
import { DealQuickActions } from "@/components/deals/deal-quick-actions";
import { DealProductStageChips } from "@/components/deals/deal-product-stage-chips";
import { DealStageSelect } from "@/components/deals/deal-stage-select";
import { DealStaleBadge } from "@/components/deals/deal-stale-badge";
import { PipelineGridCell } from "@/components/deals/pipeline-grid-cell";
import { PipelineListValue } from "@/components/deals/pipeline-list-value";
import { ModuleListActions } from "@/components/developer-hub/module-list-actions";
import { SelectRowCheckbox } from "@/components/developer-hub/list-selection";
import { StatusBadge } from "@/components/status-badge";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import { listDealFieldDefs, loadLayoutForModule, loadRecordValuesForIds } from "@/lib/custom-fields/store";
import { sourceLabel } from "@/lib/crm/sources";
import {
  dealFieldRawValue,
  dealNativeColumnText,
  dealRecordAddress,
  dealRecordEmail,
  dealRecordPhone,
  dealStageView,
  formatDealFieldCell,
  type DealPipelineBoard,
} from "@/lib/deals/deal-columns";
import {
  isPipelineGridEditable,
  nativePicklistOptions,
  pipelineGridControl,
  pipelineListNav,
  type ListStageFilterBook,
  type NamedRecord,
  type PipelineSheetMode,
} from "@/lib/deals/pipeline-sheet";
import { isDealStale, nextDealActionAt } from "@/lib/deals/pipeline-desk";
import { listProductStageChips } from "@/lib/deals/product-stages";
import { formatDay } from "@/lib/domain";
import type { DeskUserOption } from "@/lib/deals/transfer";
import type { DealListRow } from "@/lib/db/queries";
import { listCarriers, listPipelines } from "@/lib/db/queries";
import { dealSearchHaystack, visibleDealTitle } from "@/lib/deals/deal-title";
import { haystack } from "@/lib/search/live-query";
import { sheetAttr } from "@/lib/desk/sheet-attr";
import { AssignRecordTags } from "@/components/tags/assign-record-tags";
import { tagSortText } from "@/lib/tags/module-tags";
import { listModuleTags } from "@/app/actions/record-tags";
import { dealsListColumnsFromFields } from "@/lib/list-columns";
import type { CustomFieldDef } from "@/lib/custom-fields/types";
import {
  loadDealListColorMaps,
  resolveDealListCellColor,
  type DealListColorMaps,
} from "@/lib/deals/list-option-colors";
import type { ReactNode } from "react";

type DealsSheetRow = Pick<DealListRow, "deal" | "contact" | "account" | "lead"> & {
  risk?: { coverageA?: number | null } | null;
};

function dealValue(row: DealsSheetRow): number | null {
  const amount = row.deal.coverageAmount ?? row.risk?.coverageA ?? null;
  return amount == null ? null : amount;
}

function boardsFromPipelines(pipelines: Awaited<ReturnType<typeof listPipelines>>): DealPipelineBoard[] {
  return pipelines.map((board) => ({
    id: board.id,
    slug: board.slug,
    stages: board.stages.map((stage) => ({
      slug: stage.slug,
      name: stage.name,
      color: stage.color,
    })),
  }));
}

export async function DealsTable({
  rows,
  users,
  agents: _agents = [],
  initialQuery = "",
  searchModuleId = "deals-pipeline",
  nextByDeal = new Map(),
  mode = "list",
  listFilter = {},
}: {
  rows: DealsSheetRow[];
  users: Map<string, string>;
  agents?: DeskUserOption[];
  initialQuery?: string;
  searchModuleId?: string;
  nextByDeal?: Map<string, string>;
  mode?: PipelineSheetMode;
  /** Current All / book chips. Stage click must not replace these with the deal's board. */
  listFilter?: ListStageFilterBook;
}) {
  const [tagCatalog, fields, layout, valueMap, pipelines, carrierRows, listColorMaps] = await Promise.all([
    listModuleTags("deals").catch(() => []),
    listDealFieldDefs().catch(() => []),
    loadLayoutForModule("deals").catch(() => null),
    loadRecordValuesForIds(rows.map(({ deal }) => deal.id)).catch(() => new Map()),
    listPipelines().catch(() => []),
    listCarriers().catch(() => []),
    loadDealListColorMaps().catch(() => ({ sellingAgency: {}, pipeline: {} })),
  ]);
  const boards = boardsFromPipelines(pipelines);
  const columns = dealsListColumnsFromFields(fields, layout);
  const carriers: NamedRecord[] = carrierRows.map((row) => ({
    id: row.carrier.id,
    name: row.carrier.name,
  }));
  const userRecords: NamedRecord[] = [...users.entries()].map(([id, name]) => ({ id, name }));

  return (
    <section className="ff-card overflow-x-auto" data-ff-pipe-mode={mode}>
      <div
        className="flex items-center justify-end border-b border-border px-3 py-2"
        data-ff-deals-list-actions=""
      >
        <AddNewDealDialog />
      </div>
      <ModuleListActions
        module="deals"
        showMacrosLink={false}
        recordIds={rows.map(({ deal }) => deal.id)}
        records={rows.map(({ deal, contact, account }) => {
          const stored = valueMap.get(deal.id) ?? {};
          return {
            id: deal.id,
            label: deal.title,
            email: dealRecordEmail(stored) || undefined,
            phone: dealRecordPhone(stored) || undefined,
            boundAt: deal.boundAt,
            archivedAt: deal.archivedAt,
            dealId: deal.id,
            contactId: contact?.id ?? deal.contactId,
            accountId: account?.id ?? deal.accountId,
            leadId: deal.leadId,
          };
        })}
      >
        <DeskColumnTable
          moduleId="deals"
          searchModuleId={searchModuleId}
          initialQuery={initialQuery}
          columns={columns}
          empty="No deals match this filter. Shopping stays on the deal list — quotes are not policies."
          rows={rows.map(({ deal, contact, account, lead, risk }) => {
            const stored = valueMap.get(deal.id) ?? {};
            const value = dealValue({ deal, contact, account, risk });
            const phone = dealRecordPhone(stored);
            const email = dealRecordEmail(stored);
            const address = dealRecordAddress(deal, stored);
            const stage = dealStageView(deal, boards);
            const productChips = listProductStageChips(deal);
            const displayTitle = visibleDealTitle(deal);
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
            const { sort, cells } = dealRowCells({
              deal: { ...deal, title: displayTitle },
              stored,
              fields,
              users,
              value,
              phone,
              email,
              address,
              stage,
              productChips,
              contactId: contact?.id ?? deal.contactId,
              accountId: account?.id ?? deal.accountId,
              leadId: deal.leadId,
              stale,
              tagCatalog,
              mode,
              carriers,
              userRecords,
              listColorMaps,
              listFilter,
            });
            return {
              key: deal.id,
              hay: haystack([
                dealSearchHaystack({
                  title: deal.title,
                  firstName: stored.first_name || lead?.firstName,
                  lastName: stored.last_name || lead?.lastName,
                  accountName: account?.name,
                  primaryNamedInsured: deal.primaryNamedInsured,
                  lineOfBusiness: deal.lineOfBusiness,
                }),
                productChips.map((chip) => `${chip.label} ${chip.stageLabel}`).join(" "),
                stage.name,
                deal.state,
                deal.propertyOneliner,
                deal.source,
                phone,
                email,
                stored.city,
                stored.zip,
                address,
                ...(deal.tags ?? []),
              ]),
              sort,
              cells,
            };
          })}
        />
      </ModuleListActions>
    </section>
  );
}

function dealRowCells({
  deal,
  stored,
  fields,
  users,
  value,
  phone,
  email,
  address,
  stage,
  productChips,
  contactId,
  accountId,
  leadId,
  stale,
  tagCatalog,
  mode,
  carriers,
  userRecords,
  listColorMaps,
  listFilter,
}: {
  deal: DealsSheetRow["deal"];
  stored: Record<string, string>;
  fields: CustomFieldDef[];
  users: Map<string, string>;
  value: number | null;
  phone: string;
  email: string;
  address: string;
  stage: ReturnType<typeof dealStageView>;
  productChips: ReturnType<typeof listProductStageChips>;
  contactId: string | null | undefined;
  accountId: string | null | undefined;
  leadId: string | null | undefined;
  stale: boolean;
  tagCatalog: { name: string; color: string | null }[];
  mode: PipelineSheetMode;
  carriers: NamedRecord[];
  userRecords: NamedRecord[];
  listColorMaps: DealListColorMaps;
  listFilter: ListStageFilterBook;
}) {
  const sort: Record<string, string> = {
    pick: "",
    title: sheetAttr(deal.title),
    stage: sheetAttr(
      productChips.map((chip) => `${chip.label} ${chip.stageLabel}`).join(", ") || stage.name,
    ),
    line: sheetAttr(deal.lineOfBusiness),
    subType: sheetAttr(deal.policySubType),
    shopLines: sheetAttr((deal.shopLines ?? []).join(", ")),
    source: sheetAttr(sourceLabel(deal.source)),
    assigned: sheetAttr(deal.ownerId ? users.get(deal.ownerId) : ""),
    value: sheetAttr(value),
    premium: sheetAttr(deal.coverageAmount),
    updated: sheetAttr(deal.updatedAt ? new Date(deal.updatedAt).toISOString() : ""),
    tags: tagSortText(deal.tags),
  };
  const cells: Record<string, ReactNode> = {
    pick: <SelectRowCheckbox id={deal.id} />,
    title: (
      <div className="min-w-0">
        <div className="flex items-center gap-1">
          <Link href={`/deals/${deal.id}`} className="min-w-0 truncate font-medium text-primary hover:underline">
            {deal.title}
          </Link>
          <DealQuickActions
            dealId={deal.id}
            phone={phone || null}
            email={email || null}
            contactId={contactId}
            accountId={accountId}
            leadId={leadId}
            homeAddress={address || deal.propertyOneliner}
          />
        </div>
        {stale ? <DealStaleBadge dealId={deal.id} contactId={contactId} leadId={leadId} /> : null}
      </div>
    ),
    stage:
      mode === "grid" ? (
        <div className="space-y-1" data-ff-deal-list-stage="">
          <DealProductStageChips chips={productChips} />
          <DealStageSelect
            dealId={deal.id}
            dealTitle={deal.title}
            pipelineSlug={stage.pipelineSlug}
            stageSlug={stage.slug}
            stages={stage.stages}
            toastOnSave
          />
        </div>
      ) : (
        <PipelineListValue
          nav={pipelineListNav({
            columnId: "stage",
            dealId: deal.id,
            filterPipeline: listFilter.pipeline,
            family: listFilter.family,
            pcSub: listFilter.pcSub,
            lifeSub: listFilter.lifeSub,
            healthSub: listFilter.healthSub,
            stageSlug: stage.slug,
            view: mode,
          })}
        >
          <div data-ff-deal-list-stage="">
            <DealProductStageChips chips={productChips} />
          </div>
        </PipelineListValue>
      ),
    line: sheetCell({
      mode,
      dealId: deal.id,
      columnId: "line",
      display: dealNativeColumnText("line", deal, users, value) || "—",
      raw: deal.lineOfBusiness,
      label: "Line",
      userRecords,
    }),
    subType: sheetCell({
      mode,
      dealId: deal.id,
      columnId: "subType",
      display: deal.policySubType ?? "—",
      raw: deal.policySubType ?? "",
      label: "Life / Health type",
      userRecords,
    }),
    shopLines: (deal.shopLines ?? []).join(", ") || "—",
    source: sheetCell({
      mode,
      dealId: deal.id,
      columnId: "source",
      display: sourceLabel(deal.source),
      raw: deal.source ?? "",
      label: "Source",
      userRecords,
    }),
    assigned: sheetCell({
      mode,
      dealId: deal.id,
      columnId: "assigned",
      display: deal.ownerId ? users.get(deal.ownerId) ?? "—" : "—",
      raw: deal.ownerId ?? "",
      label: "Assigned",
      ownerId: deal.ownerId,
      userRecords,
    }),
    value: sheetCell({
      mode,
      dealId: deal.id,
      columnId: "value",
      display: dealNativeColumnText("value", deal, users, value) || "—",
      raw: value == null ? "" : String(value),
      label: "Value",
      userRecords,
    }),
    premium: sheetCell({
      mode,
      dealId: deal.id,
      columnId: "premium",
      display: dealNativeColumnText("premium", deal, users, value) || "—",
      raw: deal.coverageAmount == null ? "" : String(deal.coverageAmount),
      label: "Coverage $",
      userRecords,
    }),
    updated: formatDay(deal.updatedAt),
    tags: (
      <AssignRecordTags module="deals" recordId={deal.id} tags={deal.tags} catalog={tagCatalog} />
    ),
  };

  for (const field of fields) {
    if (cells[field.key] != null) continue;
    const raw = dealFieldRawValue(field, deal, stored);
    sort[field.key] = sheetAttr(raw);
    cells[field.key] = sheetCell({
      mode,
      dealId: deal.id,
      columnId: field.key,
      display: formatDealFieldCell(field, raw) || "—",
      raw,
      label: field.label,
      field,
      contactId,
      accountId,
      leadId,
      ownerId: deal.ownerId,
      carriers,
      userRecords,
      listColorMaps,
    });
  }

  return { sort, cells };
}

function sheetCell({
  mode,
  dealId,
  columnId,
  display,
  raw,
  label,
  field,
  contactId,
  accountId,
  leadId,
  ownerId,
  carriers = [],
  userRecords,
  pipelineSlug,
  stageSlug,
  stages,
  listColorMaps,
}: {
  mode: PipelineSheetMode;
  dealId: string;
  columnId: string;
  display: string;
  raw: string;
  label: string;
  field?: CustomFieldDef;
  contactId?: string | null;
  accountId?: string | null;
  leadId?: string | null;
  ownerId?: string | null;
  carriers?: NamedRecord[];
  userRecords: NamedRecord[];
  pipelineSlug?: string;
  stageSlug?: string;
  stages?: ReturnType<typeof dealStageView>["stages"];
  listColorMaps?: DealListColorMaps | null;
}) {
  const control = pipelineGridControl(columnId, field);
  // Notes / multi-line stay editable in List too so they can collapse to one line
  // and expand on focus (same height as stage/priority when collapsed).
  const useGridCell =
    isPipelineGridEditable(columnId, field) &&
    (mode === "grid" || control === "multiline");
  if (useGridCell) {
    const options =
      control === "picklist"
        ? field?.options?.length
          ? field.options.map((option) => ({ value: option, label: option }))
          : nativePicklistOptions(columnId, userRecords)
        : [];
    return (
      <PipelineGridCell
        dealId={dealId}
        columnId={columnId}
        control={control}
        value={raw}
        options={options}
        ariaLabel={label}
        pipelineSlug={pipelineSlug}
        stageSlug={stageSlug}
        stages={stages}
      />
    );
  }
  const nav = pipelineListNav({
    columnId,
    dealId,
    raw,
    field,
    pipelineSlug,
    stageSlug,
    view: mode,
    contactId,
    accountId,
    leadId,
    ownerId,
    carriers,
    users: userRecords,
  });
  const pickColor =
    field && (field.type === "picklist" || field.type === "multi_select") && raw
      ? resolveDealListCellColor(raw, field, listColorMaps)
      : null;
  const body =
    control === "multiline" || columnId === "notes" ? (
      <span className="block truncate" title={display === "—" ? undefined : display}>
        {display}
      </span>
    ) : pickColor || (field?.type === "picklist" && raw) ? (
      <StatusBadge color={pickColor ?? null} uppercase={false}>
        {display}
      </StatusBadge>
    ) : (
      display
    );
  return <PipelineListValue nav={nav}>{body}</PipelineListValue>;
}
