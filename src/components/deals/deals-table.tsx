import Link from "next/link";
import { DealQuickActions } from "@/components/deals/deal-quick-actions";
import { DealStageSelect } from "@/components/deals/deal-stage-select";
import { DealStaleBadge } from "@/components/deals/deal-stale-badge";
import { ModuleListActions } from "@/components/developer-hub/module-list-actions";
import { SelectRowCheckbox } from "@/components/developer-hub/list-selection";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import { listDealFieldDefs, loadRecordValuesForIds } from "@/lib/custom-fields/store";
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
import { isDealStale, nextDealActionAt } from "@/lib/deals/pipeline-desk";
import { formatDay } from "@/lib/domain";
import type { DeskUserOption } from "@/lib/deals/transfer";
import type { DealListRow } from "@/lib/db/queries";
import { listPipelines } from "@/lib/db/queries";
import { dealSearchHaystack } from "@/lib/deals/deal-title";
import { haystack } from "@/lib/search/live-query";
import { sheetAttr } from "@/lib/desk/sheet-attr";
import { TagChips } from "@/components/tags/tag-chips";
import { tagSortText } from "@/lib/tags/module-tags";
import { listModuleTagColors } from "@/app/actions/record-tags";
import { dealsListColumnsFromFields } from "@/lib/list-columns";
import type { CustomFieldDef } from "@/lib/custom-fields/types";
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
  nextByDeal = new Map(),
}: {
  rows: DealsSheetRow[];
  users: Map<string, string>;
  agents?: DeskUserOption[];
  initialQuery?: string;
  nextByDeal?: Map<string, string>;
}) {
  const [tagColors, fields, valueMap, pipelines] = await Promise.all([
    listModuleTagColors("deals").catch(() => ({})),
    listDealFieldDefs().catch(() => []),
    loadRecordValuesForIds(rows.map(({ deal }) => deal.id)).catch(() => new Map()),
    listPipelines().catch(() => []),
  ]);
  const boards = boardsFromPipelines(pipelines);
  const columns = dealsListColumnsFromFields(fields);

  return (
    <section className="ff-card overflow-x-auto">
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
              deal,
              stored,
              fields,
              users,
              value,
              phone,
              email,
              address,
              stage,
              contactId: contact?.id ?? deal.contactId,
              accountId: account?.id ?? deal.accountId,
              leadId: deal.leadId,
              stale,
              tagColors,
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
  contactId,
  accountId,
  leadId,
  stale,
  tagColors,
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
  contactId: string | null | undefined;
  accountId: string | null | undefined;
  leadId: string | null | undefined;
  stale: boolean;
  tagColors: Record<string, string>;
}) {
  const sort: Record<string, string> = {
    pick: "",
    title: sheetAttr(deal.title),
    stage: sheetAttr(stage.name),
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
      <div>
        <Link href={`/deals/${deal.id}`} className="font-medium text-primary hover:underline">
          {deal.title}
        </Link>
        <div className="text-sm text-muted-foreground">{phone || "—"}</div>
        <DealQuickActions
          dealId={deal.id}
          phone={phone || null}
          email={email || null}
          contactId={contactId}
          accountId={accountId}
          leadId={leadId}
          homeAddress={address || deal.propertyOneliner}
        />
        {stale ? <DealStaleBadge dealId={deal.id} contactId={contactId} leadId={leadId} /> : null}
      </div>
    ),
    stage: (
      <DealStageSelect
        dealId={deal.id}
        pipelineSlug={stage.pipelineSlug}
        stageSlug={stage.slug}
        stages={stage.stages}
      />
    ),
    line: dealNativeColumnText("line", deal, users, value) || "—",
    subType: deal.policySubType ?? "—",
    shopLines: (deal.shopLines ?? []).join(", ") || "—",
    source: sourceLabel(deal.source),
    assigned: deal.ownerId ? users.get(deal.ownerId) ?? "—" : "—",
    value: dealNativeColumnText("value", deal, users, value) || "—",
    premium: dealNativeColumnText("premium", deal, users, value) || "—",
    updated: formatDay(deal.updatedAt),
    tags: <TagChips tags={deal.tags} colors={tagColors} />,
  };

  for (const field of fields) {
    if (cells[field.key] != null) continue;
    const raw = dealFieldRawValue(field, deal, stored);
    sort[field.key] = sheetAttr(raw);
    cells[field.key] = formatDealFieldCell(field, raw) || "—";
  }

  return { sort, cells };
}
