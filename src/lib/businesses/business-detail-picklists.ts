import {
  createFieldPicklist,
  listFieldPicklists,
  updateFieldPicklist,
} from "@/lib/custom-fields/picklist-store";
import type { FieldPicklist } from "@/lib/custom-fields/picklists";
import {
  BUSINESS_ENTITY_TYPE_OPTIONS,
  BUSINESS_INDUSTRY_OPTIONS,
} from "@/lib/businesses/entity-industry";
import { LEAD_SOURCES } from "@/lib/crm/sources";
import { upsertFieldDef } from "@/lib/custom-fields/store";

export const BUSINESS_ENTITY_TYPE_PICKLIST = "Business Entity Type";
export const BUSINESS_INDUSTRY_PICKLIST = "Business Industry";
export const BUSINESS_SOURCE_PICKLIST = "Business Source";

export const BUSINESS_DETAIL_PICKLIST_BINDINGS = [
  {
    fieldKey: "entity_type",
    picklistName: BUSINESS_ENTITY_TYPE_PICKLIST,
    options: [...BUSINESS_ENTITY_TYPE_OPTIONS],
    label: "Business Type",
    type: "picklist" as const,
  },
  {
    fieldKey: "industry",
    picklistName: BUSINESS_INDUSTRY_PICKLIST,
    options: [...BUSINESS_INDUSTRY_OPTIONS],
    label: "Industry",
    type: "picklist" as const,
  },
  {
    fieldKey: "source",
    picklistName: BUSINESS_SOURCE_PICKLIST,
    options: [...LEAD_SOURCES],
    label: "Source",
    type: "picklist" as const,
  },
] as const;

async function ensureNamedPicklist(name: string, options: string[]): Promise<FieldPicklist | null> {
  try {
    const lists = await listFieldPicklists();
    const found = lists.find((list) => list.name.trim().toLowerCase() === name.toLowerCase());
    if (found) {
      if (found.options.length === 0 && options.length) {
        return (await updateFieldPicklist(found.id, { options })) ?? found;
      }
      return found;
    }
    return await createFieldPicklist(name, options);
  } catch {
    return null;
  }
}

/** Seed agency-configurable Business layout picklists and bind field keys. */
export async function ensureBusinessDetailPicklists(): Promise<string[]> {
  const ids: string[] = [];
  for (const binding of BUSINESS_DETAIL_PICKLIST_BINDINGS) {
    const list = await ensureNamedPicklist(binding.picklistName, [...binding.options]);
    if (!list) continue;
    ids.push(list.id);
    await upsertFieldDef(
      {
        key: binding.fieldKey,
        label: binding.label,
        type: binding.type,
        options: [...binding.options],
        picklistId: list.id,
        systemKey:
          binding.fieldKey === "entity_type"
            ? "entityType"
            : binding.fieldKey === "industry"
              ? "industry"
              : "source",
      },
      "businesses",
    ).catch(() => null);
  }
  return ids;
}
