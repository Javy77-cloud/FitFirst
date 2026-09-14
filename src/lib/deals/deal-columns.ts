import { pipelineSlugForLine } from "@/lib/crm/convert";
import {
  DEAL_LIST_PIPELINE_KEY,
  DEAL_LIST_SUBTYPE_KEY,
  dealListCascadeSyncValues,
} from "@/lib/deals/insurance-cascade";
import { sourceLabel } from "@/lib/crm/sources";
import { CORE_FIELDS } from "@/lib/custom-fields/defaults";
import { formatCurrencyDisplay } from "@/lib/custom-fields/format";
import { defaultLayoutForModule } from "@/lib/custom-fields/modules";
import {
  allLayoutFieldKeys,
  type CustomFieldDef,
  type FieldLayout,
} from "@/lib/custom-fields/types";
import type { ColumnDef } from "@/lib/desk/columns";
import { formatMoney } from "@/lib/domain";
import { stageColorFromNameOrSlug } from "@/lib/desk/status-colors";
import { pipelineSlugForDealStage } from "@/lib/wire/pipeline";

/** Columns that are not deal fields — never offer them on the pipeline table. */
export const DEAD_DEAL_COLUMN_IDS = ["esign", "comms", "contact"] as const;

/**
 * Locked system list columns — always offered, even when Edit Layout omits them.
 * Activity lives on the title cell (DealQuickActions), not as its own column.
 */
export const LOCKED_DEAL_LIST_COLUMN_IDS = ["title", "stage", "tags"] as const;

/** Native columns that live on the deal row itself (not Contact / Lead). */
export const DEAL_NATIVE_COLUMNS: ColumnDef[] = [
  { key: "title", label: "Deal", defaultOn: true },
  { key: "stage", label: "Stage", defaultOn: true },
  { key: "line", label: "Line", defaultOn: true },
  { key: "subType", label: "Life / Health type", defaultOn: false },
  { key: "shopLines", label: "Shop lines", defaultOn: false },
  { key: "source", label: "Source", defaultOn: true },
  { key: "tags", label: "Tags", defaultOn: true },
  { key: "assigned", label: "Assigned", defaultOn: true },
  { key: "value", label: "Coverage value", defaultOn: true },
  { key: "premium", label: "Coverage $", defaultOn: false },
  { key: "updated", label: "Updated", defaultOn: false },
];

const NATIVE_KEYS = new Set(DEAL_NATIVE_COLUMNS.map((column) => column.key));
const LOCKED_NATIVE = new Set<string>(LOCKED_DEAL_LIST_COLUMN_IDS);

/** Layout field keys that unlock optional native list columns (premium / updated / subtype). */
const NATIVE_LAYOUT_ALIASES: Record<string, readonly string[]> = {
  line: ["line", "line_of_business"],
  subType: ["sub_type", "policy_sub_type", "subType"],
  shopLines: ["shop_lines", "shopLines"],
  source: ["source"],
  assigned: ["assigned", "owner", "assigned_to", "owner_id"],
  value: ["value", "coverage_a", "coverageA", "coverage_amount", "coverage_value"],
  premium: ["premium", "coverage_a", "coverageA"],
  updated: ["updated", "updated_at"],
};

/**
 * Core pipeline list columns — always offered even when Edit Layout is contact/address-only.
 * Optional natives (subType, shopLines, premium, updated) still need a layout key.
 */
const ALWAYS_LIST_NATIVE = new Set(
  DEAL_NATIVE_COLUMNS.filter((column) => column.defaultOn !== false).map((column) => column.key),
);

/** Catalog fields that should start visible — the rest stay in the picker. */
const DEFAULT_ON_FIELD_KEYS = new Set(["state", "pipeline"]);

export function layoutKeysForColumns(layout: FieldLayout | null | undefined): Set<string> {
  return new Set(allLayoutFieldKeys(layout ?? defaultLayoutForModule("deals")));
}

export function nativeColumnAllowedByLayout(columnId: string, layoutKeys: Set<string>): boolean {
  if (LOCKED_NATIVE.has(columnId) || ALWAYS_LIST_NATIVE.has(columnId)) return true;
  const aliases = NATIVE_LAYOUT_ALIASES[columnId] ?? [columnId];
  return aliases.some((key) => layoutKeys.has(key));
}

/** Standing deal-list catalog fields — stay available even when Edit Layout omitted Details. */
export const STANDING_DEAL_LIST_FIELD_KEYS = new Set([
  "pipeline",
  "picklist_5n3i", // Pipeline (legacy key still on Javy's column prefs)
  "picklist_yp0c", // Selling Agency
  "picklist_8mus", // Priority
  "picklist", // Insurance subtype
  "new_field", // Notes (his list Notes column)
]);

export function isAlwaysOnDealListCatalogField(field: { key: string; label: string }): boolean {
  if (STANDING_DEAL_LIST_FIELD_KEYS.has(field.key)) return true;
  const label = field.label.trim();
  if (field.key === "pipeline") return true;
  return /^(pipeline|selling agency|priority|insurance subtype)$/i.test(label);
}

export type DealStageOption = {
  slug: string;
  name: string;
  color?: string | null;
};

export type DealPipelineBoard = {
  id: string;
  slug: string;
  stages: DealStageOption[];
};

export type DealColumnDeal = {
  title: string;
  pipelineStage: string;
  pipelineStageSlug?: string | null;
  pipelineId?: string | null;
  lineOfBusiness: string;
  policySubType?: string | null;
  quotingForm?: string | null;
  shopLines?: string[] | null;
  source?: string | null;
  state?: string | null;
  notes?: string | null;
  primaryNamedInsured?: string | null;
  propertyOneliner?: string | null;
  coverageAmount?: number | null;
  ownerId?: string | null;
  updatedAt?: Date | string | null;
};

export function isDeadDealColumn(id: string): boolean {
  return (DEAD_DEAL_COLUMN_IDS as readonly string[]).includes(id);
}

export function dealsColumnsFromFields(
  fields: readonly CustomFieldDef[],
  layout?: FieldLayout | null,
): ColumnDef[] {
  const layoutKeys = layoutKeysForColumns(layout);
  const natives = DEAL_NATIVE_COLUMNS.filter((column) =>
    nativeColumnAllowedByLayout(column.key, layoutKeys),
  );
  const fromCatalog: ColumnDef[] = [];
  const seen = new Set(natives.map((column) => column.key));
  const seenAlwaysLabels = new Set<string>();
  const hasCanonicalPipeline = fields.some((field) => field.key === "pipeline");
  for (const field of fields) {
    if (seen.has(field.key) || isDeadDealColumn(field.key)) continue;
    const alwaysOn = isAlwaysOnDealListCatalogField(field);
    if (!layoutKeys.has(field.key) && !alwaysOn) continue;
    const labelKey = field.label.trim().toLowerCase();
    if (alwaysOn) {
      // Keep standing keys (incl. legacy picklist_5n3i) even if a canonical `pipeline` exists.
      if (
        field.key.startsWith("picklist_") &&
        labelKey === "pipeline" &&
        hasCanonicalPipeline &&
        !STANDING_DEAL_LIST_FIELD_KEYS.has(field.key)
      ) {
        continue;
      }
      if (seenAlwaysLabels.has(labelKey) && !STANDING_DEAL_LIST_FIELD_KEYS.has(field.key)) continue;
      if (!STANDING_DEAL_LIST_FIELD_KEYS.has(field.key)) seenAlwaysLabels.add(labelKey);
      else seenAlwaysLabels.add(labelKey);
    }
    seen.add(field.key);
    fromCatalog.push({
      key: field.key,
      label: field.label,
      defaultOn:
        alwaysOn ||
        DEFAULT_ON_FIELD_KEYS.has(field.key) ||
        /^(pipeline|selling agency)$/i.test(field.label.trim()),
    });
  }
  return [...natives, ...fromCatalog];
}

/** Static fallback for tests / prefs allow-lists — same shape as a live catalog. */
export function defaultDealFieldColumns(): ColumnDef[] {
  return dealsColumnsFromFields(CORE_FIELDS, defaultLayoutForModule("deals"));
}

export function nativeValueFromDeal(
  deal: DealColumnDeal,
  systemKey: string | null | undefined,
): string {
  if (!systemKey) return "";
  if (systemKey === "state") return deal.state ?? "";
  if (systemKey === "notes") return deal.notes ?? "";
  if (systemKey === "primaryNamedInsured") return deal.primaryNamedInsured ?? "";
  if (systemKey === "source") return deal.source ?? "";
  if (systemKey === "title") return deal.title;
  return "";
}

export function dealFieldRawValue(
  field: CustomFieldDef,
  deal: DealColumnDeal,
  stored: Record<string, string>,
): string {
  const storedValue = stored[field.key];
  if (storedValue != null && storedValue !== "") return storedValue;
  const synced = dealListCascadeSyncValues({
    insuranceType: stored.insurance_type,
    insuranceSubtype: stored.insurance_subtype,
    quotingForm: deal.quotingForm,
    policySubType: deal.policySubType,
  });
  if (field.key === DEAL_LIST_PIPELINE_KEY) {
    return synced[DEAL_LIST_PIPELINE_KEY] ?? nativeValueFromDeal(deal, field.systemKey);
  }
  if (field.key === DEAL_LIST_SUBTYPE_KEY) {
    return synced[DEAL_LIST_SUBTYPE_KEY] ?? nativeValueFromDeal(deal, field.systemKey);
  }
  return nativeValueFromDeal(deal, field.systemKey);
}

export function formatDealFieldCell(field: CustomFieldDef, raw: string): string {
  if (!raw) return "";
  if (field.type === "currency") {
    const formatted = formatCurrencyDisplay(raw);
    return formatted ? `$${formatted}` : raw;
  }
  if (field.type === "checkbox") {
    return raw === "true" || raw === "1" || raw === "on" ? "Yes" : "";
  }
  if (field.type === "percentage") return raw ? `${raw}%` : "";
  return raw;
}

export function dealNativeColumnText(
  key: string,
  deal: DealColumnDeal,
  users: Map<string, string>,
  coverage?: number | null,
): string {
  if (key === "title") return deal.title;
  if (key === "line") return deal.lineOfBusiness;
  if (key === "subType") return deal.policySubType ?? "";
  if (key === "shopLines") return (deal.shopLines ?? []).join(", ");
  if (key === "source") return sourceLabel(deal.source);
  if (key === "assigned") return deal.ownerId ? users.get(deal.ownerId) ?? "" : "";
  if (key === "value") return coverage == null ? "" : formatMoney(coverage);
  if (key === "premium") return deal.coverageAmount == null ? "" : formatMoney(deal.coverageAmount);
  if (key === "updated") {
    if (!deal.updatedAt) return "";
    const date = deal.updatedAt instanceof Date ? deal.updatedAt : new Date(deal.updatedAt);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }
  return "";
}

export function resolveDealPipeline(
  deal: DealColumnDeal,
  boards: readonly DealPipelineBoard[],
): DealPipelineBoard | null {
  if (deal.pipelineId) {
    const byId = boards.find((board) => board.id === deal.pipelineId);
    if (byId) return byId;
  }
  const byLine = boards.find((board) => board.slug === pipelineSlugForLine(deal.lineOfBusiness));
  return byLine ?? boards.find((board) => board.slug === "p-c") ?? boards[0] ?? null;
}

export function dealStageSlug(deal: DealColumnDeal): string {
  return deal.pipelineStageSlug || pipelineSlugForDealStage(deal.pipelineStage);
}

export function dealStageView(
  deal: DealColumnDeal,
  boards: readonly DealPipelineBoard[],
): {
  slug: string;
  name: string;
  color: string | null;
  pipelineSlug: string;
  stages: DealStageOption[];
} {
  const board = resolveDealPipeline(deal, boards);
  const slug = dealStageSlug(deal);
  const stages = board?.stages ?? [];
  const match = stages.find((stage) => stage.slug === slug);
  const name = match?.name ?? slug.replaceAll("_", " ");
  return {
    slug,
    name,
    color: stageColorFromNameOrSlug(name, match?.color),
    pipelineSlug: board?.slug ?? "p-c",
    stages,
  };
}

/** Phone / email on the deal record — never Contact or Lead. */
export function dealRecordPhone(stored: Record<string, string>): string {
  return stored.phone?.trim() ?? "";
}

export function dealRecordEmail(stored: Record<string, string>): string {
  return stored.email?.trim() ?? "";
}

export function dealRecordAddress(
  deal: DealColumnDeal,
  stored: Record<string, string>,
): string {
  return (
    stored.mailing_address?.trim() ||
    deal.propertyOneliner?.trim() ||
    ""
  );
}
