import type { CrmListModule } from "@/lib/lists/selection-actions";
import type { ImportEntity } from "@/lib/import-export/types";
import { tagModuleForList, type TagModule } from "@/lib/tags/module-tags";

/** Modules that can mass-assign an owner from the list bar. */
export const MASS_ASSIGN_OWNER_MODULES: CrmListModule[] = [
  "leads",
  "contacts",
  "deals",
  "policies",
];

export function canMassAssignOwner(module: CrmListModule): boolean {
  return MASS_ASSIGN_OWNER_MODULES.includes(module);
}

export function massAssignBlockedReason(module: CrmListModule): string | null {
  if (canMassAssignOwner(module)) return null;
  if (module === "carriers") {
    return "Carriers stay on the shared appetite book — no owner to assign.";
  }
  if (module === "businesses") {
    return "Assign owner is not wired for Businesses yet (no owner column).";
  }
  if (module === "tasks") {
    return "Tasks use assignee on the task row — not list Assign.";
  }
  return "Assign owner is not on this list.";
}

export function tagModuleForCrmList(module: CrmListModule): TagModule | null {
  return tagModuleForList(module === "businesses" ? "businesses" : module);
}

export function importEntityForCrmList(module: CrmListModule): ImportEntity | null {
  switch (module) {
    case "leads":
      return "leads";
    case "contacts":
      return "contacts";
    case "businesses":
      return "businesses";
    case "deals":
      return "deals";
    case "policies":
      return "policies";
    case "carriers":
      return "carriers";
    default:
      return null;
  }
}

export type MassTagMode = "add" | "replace";

/** Merge catalog tags onto existing record tags (add) or replace entirely. */
export function applyMassTagMode(
  current: string[],
  picked: string[],
  mode: MassTagMode,
): string[] {
  if (mode === "replace") return [...picked];
  const seen = new Set(current);
  const out = [...current];
  for (const tag of picked) {
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  return out;
}
