import { DEAL_STAGES, LEAD_STATUSES, CLIENT_STATUSES, POLICY_STATUSES } from "@/lib/domain";
import { RECORD_SOURCES } from "@/lib/crm/sources";
import { pipelineSlugForDealStage } from "@/lib/wire/pipeline";
import type { CrmListModule } from "@/lib/lists/selection-actions";

export const MASS_UPDATE_FIELDS = ["status", "source", "follow_up_template", "owner", "custom"] as const;
export type MassUpdateField = (typeof MASS_UPDATE_FIELDS)[number];

export const MASS_UPDATE_CUSTOM_KEYS = ["notes"] as const;
export type MassUpdateCustomKey = (typeof MASS_UPDATE_CUSTOM_KEYS)[number];

export type MassUpdateOption = { value: string; label: string };

export type SelectAllMode = "none" | "partial" | "page" | "matching";

const MANUAL_BIND_STAGES = new Set(["bound", "closed_won"]);

export function isManualBindStage(value: string): boolean {
  return MANUAL_BIND_STAGES.has(value);
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
  if (module === "contacts") {
    return CLIENT_STATUSES.map((value) => ({ value, label: value.replaceAll("_", " ") }));
  }
  if (module === "policies") {
    return POLICY_STATUSES.map((value) => ({ value, label: value.replaceAll("_", " ") }));
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

export function massUpdateAppliesTo(module: CrmListModule, field: MassUpdateField): boolean {
  if (field === "source") return module === "leads" || module === "deals" || module === "contacts";
  if (field === "follow_up_template") return module === "leads" || module === "deals";
  if (field === "owner") return module === "leads" || module === "deals" || module === "contacts" || module === "policies";
  if (field === "status") return massUpdateStatusOptions(module).length > 0;
  return field === "custom";
}
