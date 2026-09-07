import { pipelineSlugForLine } from "@/lib/crm/convert";
import { sourceLabel } from "@/lib/crm/sources";
import { CORE_FIELDS } from "@/lib/custom-fields/defaults";
import { formatCurrencyDisplay } from "@/lib/custom-fields/format";
import type { CustomFieldDef } from "@/lib/custom-fields/types";
import type { ColumnDef } from "@/lib/desk/columns";
import { formatMoney } from "@/lib/domain";
import { pipelineSlugForDealStage } from "@/lib/wire/pipeline";

/** Columns that are not deal fields — never offer them on the pipeline table. */
export const DEAD_DEAL_COLUMN_IDS = ["esign", "comms", "contact"] as const;

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
  { key: "value", label: "Value", defaultOn: true },
  { key: "premium", label: "Coverage $", defaultOn: false },
  { key: "updated", label: "Updated", defaultOn: false },
];

const NATIVE_KEYS = new Set(DEAL_NATIVE_COLUMNS.map((column) => column.key));

/** Catalog fields that should start visible — the rest stay in the picker. */
const DEFAULT_ON_FIELD_KEYS = new Set(["phone", "state"]);

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

export function dealsColumnsFromFields(fields: readonly CustomFieldDef[]): ColumnDef[] {
  const fromCatalog: ColumnDef[] = [];
  const seen = new Set(NATIVE_KEYS);
  for (const field of fields) {
    if (seen.has(field.key) || isDeadDealColumn(field.key)) continue;
    seen.add(field.key);
    fromCatalog.push({
      key: field.key,
      label: field.label,
      defaultOn: DEFAULT_ON_FIELD_KEYS.has(field.key),
    });
  }
  return [...DEAL_NATIVE_COLUMNS, ...fromCatalog];
}

/** Static fallback for tests / prefs allow-lists — same shape as a live catalog. */
export function defaultDealFieldColumns(): ColumnDef[] {
  return dealsColumnsFromFields(CORE_FIELDS);
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
  return {
    slug,
    name: match?.name ?? slug.replaceAll("_", " "),
    color: match?.color ?? null,
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
