import { ON_HOLD_LABEL, ON_HOLD_TAG } from "@/lib/deals/on-hold";
import { sourceFilterOptions, sourceLabel } from "@/lib/crm/sources";
import { LINES } from "@/lib/domain";
import {
  commercialLineMenuOptions,
  matchesCommercialLineChoice,
  matchesProductChoice,
  policyProductDisplayLabel,
  productMenuTitle,
} from "@/lib/policy/eo";
import {
  matchesField,
  uniqueOptions,
  type FilterField,
} from "@/lib/saved-filters";
import {
  applyPageFilterPrefsToFields,
  type PageFilter,
} from "@/lib/page-filters";
import { dealMatchesStage } from "@/lib/wire/pipeline";

/** URL keys for New deals pipeline column filters (q counted separately). */
export const DEAL_PIPELINE_FILTER_KEYS = [
  "stage",
  "line",
  "subType",
  "source",
  "assigned",
  "tags",
  "carrier",
] as const;

export type DealPipelineFilterKey = (typeof DEAL_PIPELINE_FILTER_KEYS)[number];

export type DealPipelineColumnFilter = Partial<Record<DealPipelineFilterKey, string>>;

/** Desk chrome params that Clear / Apply must keep. */
export const DEAL_PIPELINE_PRESERVE_PARAMS = [
  "pipeline",
  "view",
  "book",
  "queue",
  "family",
  "pcSub",
  "lifeSub",
  "healthSub",
  "attention",
  "heat",
  "lens",
  "scope",
  "valueBand",
  "rail",
] as const;

export type DealPipelineFilterRow = {
  pipelineStage: string;
  pipelineStageSlug?: string | null;
  lineOfBusiness: string;
  policySubType?: string | null;
  source?: string | null;
  ownerId?: string | null;
  tags?: string[] | null;
  currentCarrier?: string | null;
  title?: string | null;
};

export function matchesDealPipelineColumnFilters(
  deal: DealPipelineFilterRow,
  filter: DealPipelineColumnFilter,
): boolean {
  if (filter.stage) {
    const hit =
      dealMatchesStage(
        {
          pipelineStage: deal.pipelineStage,
          pipelineStageSlug: deal.pipelineStageSlug ?? null,
          archivedAt: null,
        },
        filter.stage,
      ) ||
      matchesField(deal.pipelineStage, filter.stage) ||
      matchesField(deal.pipelineStageSlug, filter.stage);
    if (!hit) return false;
  }
  if (
    filter.line &&
    !matchesCommercialLineChoice(filter.line, deal.lineOfBusiness, deal.policySubType)
  ) {
    return false;
  }
  if (filter.subType && !matchesProductChoice(deal.policySubType, filter.subType)) return false;
  if (filter.source && !matchesField(deal.source, filter.source)) return false;
  if (filter.assigned && deal.ownerId !== filter.assigned) return false;
  if (filter.tags) {
    const wanted = filter.tags.toLowerCase();
    const tags = deal.tags ?? [];
    if (!tags.some((tag) => tag.toLowerCase() === wanted)) return false;
  }
  if (filter.carrier && !matchesField(deal.currentCarrier, filter.carrier)) return false;
  return true;
}

export function buildDealPipelineFilterFields(input: {
  deals: DealPipelineFilterRow[];
  agents: Array<{ id: string; name: string }>;
  stages: Array<{ slug: string; name: string }>;
  tags?: string[];
  prefs?: PageFilter[];
}): FilterField[] {
  const { deals, agents, stages, tags = [], prefs } = input;
  const stageExtras = stages.map((stage) => ({ value: stage.slug, label: stage.name }));
  const sourceExtras = sourceFilterOptions().map((row) => ({
    value: row.value,
    label: row.label,
  }));
  const lineExtras = commercialLineMenuOptions(LINES, (value) => value);
  const assignedExtras = agents.map((agent) => ({ value: agent.id, label: agent.name }));
  const tagExtras = tags.map((tag) => ({ value: tag, label: tag }));

  const fields: FilterField[] = [
    {
      key: "stage",
      label: "Stage",
      options: uniqueOptions(
        deals.map((deal) => deal.pipelineStageSlug || deal.pipelineStage),
        stageExtras,
      ),
    },
    {
      key: "line",
      label: "Line",
      options: uniqueOptions(
        deals.map((deal) => deal.lineOfBusiness),
        lineExtras,
      ),
    },
    {
      key: "subType",
      label: "Subtype",
      options: uniqueOptions(deals.map((deal) => deal.policySubType)).map((option) => ({
        ...option,
        label: policyProductDisplayLabel(option.label),
        title: productMenuTitle(option.value) ?? productMenuTitle(option.label),
      })),
    },
    {
      key: "source",
      label: "Source",
      options: uniqueOptions(
        deals.map((deal) => deal.source),
        sourceExtras,
      ).map((option) => ({
        value: option.value,
        label: sourceLabel(option.value) === "—" ? option.label : sourceLabel(option.value),
      })),
    },
    {
      key: "assigned",
      label: "Assigned",
      options: uniqueOptions(
        deals.map((deal) => deal.ownerId),
        assignedExtras,
      ).map((option) => {
        const agent = agents.find((row) => row.id === option.value);
        return { value: option.value, label: agent?.name ?? option.label };
      }),
    },
    {
      key: "tags",
      label: "Tags",
      options: uniqueOptions(
        [...deals.flatMap((deal) => deal.tags ?? []), ON_HOLD_TAG],
        [...tagExtras, { value: ON_HOLD_TAG, label: ON_HOLD_LABEL }],
      ).map((option) =>
        option.value === ON_HOLD_TAG ? { value: ON_HOLD_TAG, label: ON_HOLD_LABEL } : option,
      ),
    },
    {
      key: "carrier",
      label: "Carrier",
      options: uniqueOptions(deals.map((deal) => deal.currentCarrier)),
    },
  ];
  return prefs ? applyPageFilterPrefsToFields(fields, prefs) : fields;
}
