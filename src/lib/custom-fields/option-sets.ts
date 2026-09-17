import {
  GLOBAL_LIST_KEYS,
  GLOBAL_LIST_LABEL,
  type GlobalListKey,
} from "@/lib/desk/global-lists";
import {
  optionColorMap,
  sanitizeRichPicklistOptions,
  type FieldPicklist,
  type GlobalListOptionSet,
  type PicklistOption,
} from "./picklists";
import type { CustomFieldDef } from "./types";

export type { GlobalListOptionSet };

export const OPTION_SET_CUSTOM = "";
export const OPTION_SET_GLOBAL_PREFIX = "global:";
export const OPTION_SET_PICKLIST_PREFIX = "picklist:";

export const OPTION_SET_POLICY_CATEGORY = "Policy / desk";
export const OPTION_SET_CUSTOM_CATEGORY = "Custom";

export type OptionSetCategory = "policy" | "custom";

export type OptionSetChoice = {
  value: string;
  category: OptionSetCategory;
  categoryLabel: string;
  label: string;
  picklistId: string | null;
  globalListKey: GlobalListKey | null;
};

export type OptionSetBinding = {
  picklistId: string | null;
  globalListKey: GlobalListKey | null;
};

export function isGlobalListKey(value: string | null | undefined): value is GlobalListKey {
  return Boolean(value && (GLOBAL_LIST_KEYS as readonly string[]).includes(value));
}

export function parseGlobalListKey(value: string | null | undefined): GlobalListKey | null {
  return isGlobalListKey(value) ? value : null;
}

export function optionSetValue(field: Pick<CustomFieldDef, "picklistId" | "globalListKey">): string {
  const globalKey = parseGlobalListKey(field.globalListKey);
  if (globalKey) return `${OPTION_SET_GLOBAL_PREFIX}${globalKey}`;
  if (field.picklistId) return `${OPTION_SET_PICKLIST_PREFIX}${field.picklistId}`;
  return OPTION_SET_CUSTOM;
}

export function persistedOptionSetBinding(
  field: Pick<CustomFieldDef, "picklistId" | "globalListKey">,
): OptionSetBinding {
  const globalListKey = parseGlobalListKey(field.globalListKey);
  return {
    picklistId: globalListKey ? null : field.picklistId ?? null,
    globalListKey,
  };
}

export function parseOptionSetValue(value: string): OptionSetBinding {
  const raw = value.trim();
  if (raw.startsWith(OPTION_SET_GLOBAL_PREFIX)) {
    return {
      picklistId: null,
      globalListKey: parseGlobalListKey(raw.slice(OPTION_SET_GLOBAL_PREFIX.length)),
    };
  }
  if (raw.startsWith(OPTION_SET_PICKLIST_PREFIX)) {
    const id = raw.slice(OPTION_SET_PICKLIST_PREFIX.length).trim();
    return { picklistId: id || null, globalListKey: null };
  }
  return { picklistId: null, globalListKey: null };
}

export function optionSetChoices(lists: FieldPicklist[] = []): OptionSetChoice[] {
  const policy: OptionSetChoice[] = GLOBAL_LIST_KEYS.map((key) => ({
    value: `${OPTION_SET_GLOBAL_PREFIX}${key}`,
    category: "policy",
    categoryLabel: OPTION_SET_POLICY_CATEGORY,
    label: GLOBAL_LIST_LABEL[key],
    picklistId: null,
    globalListKey: key,
  }));
  const custom: OptionSetChoice[] = lists.map((list) => ({
    value: `${OPTION_SET_PICKLIST_PREFIX}${list.id}`,
    category: "custom",
    categoryLabel: OPTION_SET_CUSTOM_CATEGORY,
    label: list.name,
    picklistId: list.id,
    globalListKey: null,
  }));
  return [...policy, ...custom];
}

export function groupedOptionSetChoices(lists: FieldPicklist[] = []): {
  policy: OptionSetChoice[];
  custom: OptionSetChoice[];
} {
  const choices = optionSetChoices(lists);
  return {
    policy: choices.filter((choice) => choice.category === "policy"),
    custom: choices.filter((choice) => choice.category === "custom"),
  };
}

export function fieldUsesOptionSet(field: Pick<CustomFieldDef, "type" | "picklistId" | "globalListKey">): boolean {
  return (
    field.type === "picklist" ||
    field.type === "multi_select" ||
    Boolean(field.picklistId) ||
    Boolean(parseGlobalListKey(field.globalListKey))
  );
}

export function globalListOptionSetsFromRows(
  rows: Array<{
    listKey: string;
    label: string;
    color?: string | null;
    active?: boolean | null;
  }>,
): GlobalListOptionSet[] {
  return GLOBAL_LIST_KEYS.map((key) => ({
    listKey: key,
    name: GLOBAL_LIST_LABEL[key],
    options: sanitizeRichPicklistOptions(
      rows
        .filter((row) => row.listKey === key && row.active !== false)
        .map((row) => ({ value: row.label, color: row.color })),
    ),
  }));
}

export function emptyGlobalListOptionSets(): GlobalListOptionSet[] {
  return GLOBAL_LIST_KEYS.map((key) => ({
    listKey: key,
    name: GLOBAL_LIST_LABEL[key],
    options: [],
  }));
}

export function resolveBoundOptionSet(
  field: Pick<CustomFieldDef, "picklistId" | "globalListKey">,
  lists: FieldPicklist[] = [],
  globalLists: GlobalListOptionSet[] = [],
): { options: PicklistOption[]; colors: Record<string, string | null> } | null {
  const globalKey = parseGlobalListKey(field.globalListKey);
  if (globalKey) {
    const set = globalLists.find((item) => item.listKey === globalKey);
    if (!set) return { options: [], colors: {} };
    const options = sanitizeRichPicklistOptions(set.options);
    return { options, colors: optionColorMap(options) };
  }
  if (field.picklistId) {
    const list = lists.find((item) => item.id === field.picklistId);
    if (!list) return { options: [], colors: {} };
    const options = sanitizeRichPicklistOptions(list.options);
    return { options, colors: optionColorMap(options) };
  }
  return null;
}

export function bindingPatchFromOptionSet(
  value: string,
  lists: FieldPicklist[] = [],
  globalLists: GlobalListOptionSet[] = [],
  fallbackOptions: string[] = [],
): Partial<CustomFieldDef> {
  const binding = parseOptionSetValue(value);
  const bound = resolveBoundOptionSet(binding, lists, globalLists);
  if (binding.globalListKey || binding.picklistId) {
    return {
      picklistId: binding.picklistId,
      globalListKey: binding.globalListKey,
      options: bound?.options.map((option) => option.value) ?? [],
      optionColors: bound?.colors ?? {},
    };
  }
  return {
    picklistId: null,
    globalListKey: null,
    options: fallbackOptions,
  };
}
