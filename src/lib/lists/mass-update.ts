import {
  CLIENT_STATUSES,
  DEAL_STAGES,
  LEAD_STATUSES,
  LINES,
  POLICY_STATUSES,
  SELLING_AGENCIES,
} from "@/lib/domain";
import { LINE_LABELS } from "@/lib/crm/bind";
import { commercialLineMenuOptions } from "@/lib/policy/eo";
import { RECORD_SOURCES } from "@/lib/crm/sources";
import type { ListColumn } from "@/lib/list-columns";
import type { CrmListModule } from "@/lib/lists/selection-actions";
import { pipelineSlugForDealStage } from "@/lib/wire/pipeline";

/** @deprecated Legacy fixed menu — Mass Update now follows available list columns. */
export const MASS_UPDATE_FIELDS = ["status", "source", "follow_up_template", "owner", "custom"] as const;
export type MassUpdateField = (typeof MASS_UPDATE_FIELDS)[number] | string;

export const MASS_UPDATE_CUSTOM_KEYS = ["notes"] as const;
export type MassUpdateCustomKey = (typeof MASS_UPDATE_CUSTOM_KEYS)[number];

export type MassUpdateOption = { value: string; label: string };

export type SelectAllMode = "none" | "partial" | "page" | "matching";

/** Primary link / identity columns — open the record, not mass-written. */
const PRIMARY_LINK_IDS = new Set([
  "title",
  "name",
  "business",
  "policy",
  "task",
  "campaign",
  "packet",
  "holder",
  "claim",
]);

/**
 * Locked system-only display / computed columns that cannot be mass-written.
 * Stage/status stay editable when present in the catalog (tip sep7gj / catalog rule).
 */
const SYSTEM_DISPLAY_ONLY_IDS = new Set([
  "pick",
  "tags",
  "updated",
  "timer",
  "heat",
  "shop",
  "actions",
  "esign",
  "links",
  "shopLines",
  "comms",
  "contact",
  "lifetime",
  "inForce",
  "portal",
  "covA",
  "rules",
  "dontWrite",
  "rank",
  "quoteNumber",
  "flags",
  "ping",
  "pair",
  "action",
  "record",
  "reported",
  "how",
  "why",
  "counts",
  "missing",
  "age",
  "linkedContacts",
  "policies",
  "lastActivity",
  "activePolicies",
  "lastQuote",
  "lastIssued",
  "hitRate",
  "avgDays",
  "commission",
  "label",
  "amBest",
  "lastContacted",
  "party",
  // Carrier premium volume is computed; policy premium stays writable (not listed here).
  // Policy expires is writable via expirationDate — keep out of this set.
]);

const MANUAL_BIND_STAGES = new Set(["bound", "policy_issued", "closed_won"]);

export function isManualBindStage(value: string): boolean {
  return MANUAL_BIND_STAGES.has(value);
}

/** True when this available list column can appear in Mass Update. */
export function isMassUpdateColumn(column: Pick<ListColumn, "id" | "label">): boolean {
  if (!column.label.trim()) return false;
  if (PRIMARY_LINK_IDS.has(column.id)) return false;
  if (SYSTEM_DISPLAY_ONLY_IDS.has(column.id)) return false;
  return true;
}

/**
 * Mass Update field menu = every available list column (Columns picker catalog),
 * filtered to writable columns. Not gated on current visibility.
 * Stable order = catalog order.
 */
export function massUpdateColumnsFromCatalog(columns: readonly ListColumn[]): ListColumn[] {
  return columns.filter((column) => isMassUpdateColumn(column));
}

/**
 * @deprecated Prefer massUpdateColumnsFromCatalog — Mass Update follows the full catalog.
 * Thin wrapper: FromCatalog on the visible subset only.
 */
export function massUpdateColumnsFromVisible(
  columns: readonly ListColumn[],
  visibleIds: readonly string[],
): ListColumn[] {
  const byId = new Map(columns.map((column) => [column.id, column]));
  const visible: ListColumn[] = [];
  const seen = new Set<string>();
  for (const id of visibleIds) {
    if (seen.has(id)) continue;
    const column = byId.get(id);
    if (!column) continue;
    seen.add(id);
    visible.push(column);
  }
  return massUpdateColumnsFromCatalog(visible);
}

export function massUpdateStatusOptions(module: CrmListModule): MassUpdateOption[] {
  if (module === "deals") {
    return DEAL_STAGES.filter((stage) => !isManualBindStage(stage)).map((value) => ({
      value,
      label: value.replaceAll("_", " "),
    }));
  }
  if (module === "leads") {
    return LEAD_STATUSES.map((value) => ({ value, label: value.replaceAll("_", " ") }));
  }
  if (module === "contacts" || module === "businesses") {
    return CLIENT_STATUSES.map((value) => ({ value, label: value.replaceAll("_", " ") }));
  }
  if (module === "policies") {
    return POLICY_STATUSES.map((value) => ({ value, label: value.replaceAll("_", " ") }));
  }
  if (module === "carriers") {
    return [
      { value: "Active", label: "Active" },
      { value: "Pending", label: "Pending" },
      { value: "Inactive", label: "Inactive" },
    ];
  }
  return [];
}

export function massUpdateSourceOptions(): MassUpdateOption[] {
  return RECORD_SOURCES.map((row) => ({ value: row.value, label: row.label }));
}

export function massUpdateCustomOptions(): MassUpdateOption[] {
  return MASS_UPDATE_CUSTOM_KEYS.map((value) => ({
    value,
    label: value === "notes" ? "Notes" : value,
  }));
}

export function massUpdateSellingAgencyOptions(): MassUpdateOption[] {
  return SELLING_AGENCIES.map((value) => ({ value, label: value }));
}

export function massUpdateLineOptions(): MassUpdateOption[] {
  return commercialLineMenuOptions(LINES, (line) => LINE_LABELS[line as keyof typeof LINE_LABELS] ?? line);
}

/** Normalize legacy mass-update field ids onto list column ids. */
export function normalizeMassUpdateColumnId(columnId: string, module: CrmListModule): string {
  if (columnId === "custom") return "notes";
  if (columnId === "owner") return module === "deals" ? "assigned" : "owner";
  if (columnId === "status" && module === "deals") return "stage";
  if (columnId === "follow_up_template") return module === "leads" ? "followUp" : columnId;
  return columnId;
}

export function isSellingAgencyColumn(columnId: string): boolean {
  return /selling[_]?agency/i.test(columnId);
}

export function isStatusLikeColumn(columnId: string): boolean {
  return columnId === "status" || columnId === "stage";
}

export function isOwnerLikeColumn(columnId: string): boolean {
  return columnId === "owner" || columnId === "assigned";
}

export function isFollowUpTemplateColumn(columnId: string): boolean {
  return columnId === "followUp" || columnId === "follow_up_template";
}

export function selectAllMode(
  visibleIds: string[],
  matchingIds: string[],
  selected: string[],
): SelectAllMode {
  if (selected.length === 0 || visibleIds.length === 0) return "none";
  const visibleSet = new Set(visibleIds);
  const matchingSet = new Set(matchingIds);
  const selectedVisible = selected.filter((id) => visibleSet.has(id));
  const selectedMatching = selected.filter((id) => matchingSet.has(id));
  if (matchingIds.length > 0 && selectedMatching.length === matchingIds.length && matchingIds.every((id) => selected.includes(id))) {
    return "matching";
  }
  if (selectedVisible.length === visibleIds.length && visibleIds.every((id) => selected.includes(id))) {
    return "page";
  }
  return "partial";
}

export function dealStagePatch(status: string): { pipelineStage: string; pipelineStageSlug: string } {
  return {
    pipelineStage: status,
    pipelineStageSlug: pipelineSlugForDealStage(status),
  };
}

/** @deprecated Prefer catalog menu via massUpdateColumnsFromCatalog. */
export function massUpdateAppliesTo(module: CrmListModule, field: MassUpdateField): boolean {
  if (field === "source") return module === "leads" || module === "deals" || module === "contacts" || module === "businesses";
  if (field === "follow_up_template") return module === "leads" || module === "deals";
  if (field === "owner") return module === "leads" || module === "deals" || module === "contacts" || module === "policies";
  if (field === "status") return massUpdateStatusOptions(module).length > 0;
  if (field === "custom") return true;
  return Boolean(field);
}
