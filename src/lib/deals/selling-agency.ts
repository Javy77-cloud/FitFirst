import type { CustomFieldDef, FieldLayout, LayoutSection } from "@/lib/custom-fields/types";

const PIPELINE_STRIP_SECTION_ID = "pipeline";

/**
 * Older deals-list Selling Agency column. Existing desk values (Dominic, Rosa, …)
 * live on this key. A later Admin picklist on Deal Details used a different key
 * (slug `selling_agency` or a new `picklist_*`) and never wrote here.
 */
export const DEAL_SELLING_AGENCY_KEY = "picklist_yp0c";

/** Slug / policy-module keys that must not become a second deal field. */
export const DEAL_SELLING_AGENCY_ALIAS_KEYS = ["selling_agency", "sellingAgency"] as const;

export const DEAL_SELLING_AGENCY_GLOBAL_LIST_KEY = "selling_agency";

export const DEAL_SELLING_AGENCY_FIELD: CustomFieldDef = {
  key: DEAL_SELLING_AGENCY_KEY,
  label: "Selling agency",
  type: "picklist",
  options: [],
  required: true,
  globalListKey: DEAL_SELLING_AGENCY_GLOBAL_LIST_KEY,
};

export function isSellingAgencyLabel(label: string | null | undefined): boolean {
  return /^selling agency$/i.test((label ?? "").trim());
}

export function isSellingAgencyFieldKey(key: string | null | undefined): boolean {
  const raw = (key ?? "").trim();
  if (!raw) return false;
  if (raw === DEAL_SELLING_AGENCY_KEY) return true;
  return (DEAL_SELLING_AGENCY_ALIAS_KEYS as readonly string[]).includes(raw);
}

export function isSellingAgencyField(field: {
  key?: string | null;
  label?: string | null;
  globalListKey?: string | null;
}): boolean {
  if (isSellingAgencyFieldKey(field.key)) return true;
  if (field.globalListKey === DEAL_SELLING_AGENCY_GLOBAL_LIST_KEY && isSellingAgencyLabel(field.label)) {
    return true;
  }
  return isSellingAgencyLabel(field.label);
}

export function canonicalizeSellingAgencyKey(key: string): string {
  return isSellingAgencyFieldKey(key) ? DEAL_SELLING_AGENCY_KEY : key;
}

/** Reuse the list column instead of minting selling_agency / picklist_xxxx. */
export function sellingAgencyKeyForNewField(input: {
  key?: string | null;
  label?: string | null;
}): string | null {
  if (isSellingAgencyFieldKey(input.key) || isSellingAgencyLabel(input.label)) {
    return DEAL_SELLING_AGENCY_KEY;
  }
  return null;
}

/** Prefill only when the desk has exactly one selling agency — never invent names. */
export function defaultSellingAgencyValue(options: readonly string[] | null | undefined): string {
  const unique = [
    ...new Set((options ?? []).map((option) => option.trim()).filter(Boolean)),
  ];
  return unique.length === 1 ? unique[0]! : "";
}

export function sellingAgencyValueFromStored(stored: Record<string, string>): string {
  const canonical = (stored[DEAL_SELLING_AGENCY_KEY] ?? "").trim();
  if (canonical) return canonical;
  for (const alias of DEAL_SELLING_AGENCY_ALIAS_KEYS) {
    const value = (stored[alias] ?? "").trim();
    if (value) return value;
  }
  return "";
}

/** Read path: expose alias leftovers on the list key without overwriting it. */
export function mergeSellingAgencyStoredValues(stored: Record<string, string>): Record<string, string> {
  const canonical = (stored[DEAL_SELLING_AGENCY_KEY] ?? "").trim();
  if (canonical) return stored;
  const fallback = sellingAgencyValueFromStored(stored);
  if (!fallback) return stored;
  return { ...stored, [DEAL_SELLING_AGENCY_KEY]: fallback };
}

/** Write path: one storage key. Alias posts fold onto picklist_yp0c. */
export function canonicalizeSellingAgencyValues(values: Record<string, string>): Record<string, string> {
  const next = { ...values };
  const posted = Object.prototype.hasOwnProperty.call(values, DEAL_SELLING_AGENCY_KEY);
  let chosen = (next[DEAL_SELLING_AGENCY_KEY] ?? "").trim();
  for (const alias of DEAL_SELLING_AGENCY_ALIAS_KEYS) {
    const raw = (next[alias] ?? "").trim();
    if (raw && !chosen) chosen = raw;
    delete next[alias];
  }
  if (chosen) next[DEAL_SELLING_AGENCY_KEY] = chosen;
  else if (posted) next[DEAL_SELLING_AGENCY_KEY] = "";
  return next;
}

function isDetailsSection(section: { id?: string; label?: string }): boolean {
  const id = (section.id ?? "").trim().toLowerCase();
  const label = (section.label ?? "").trim();
  return id === "details" || /^details$/i.test(label);
}

function isPipelineHomeSection(section: { id?: string; label?: string; fieldKeys?: string[] }): boolean {
  const id = (section.id ?? "").trim().toLowerCase();
  const label = (section.label ?? "").trim();
  if (id === PIPELINE_STRIP_SECTION_ID || /^pipeline$/i.test(label)) return true;
  const keys = section.fieldKeys ?? [];
  return (
    keys.includes("insurance_type") ||
    keys.includes("insurance_category") ||
    keys.includes("insurance_subtype")
  );
}

function isInsuranceHomeSection(section: LayoutSection): boolean {
  return isPipelineHomeSection(section) || isDetailsSection(section);
}

function mapSections(layout: FieldLayout, map: (section: LayoutSection) => LayoutSection): FieldLayout {
  return {
    ...layout,
    columns: layout.columns.map((column) => ({
      ...column,
      sections: column.sections.map(map),
    })),
  };
}

function allKeys(layout: FieldLayout): string[] {
  return layout.columns.flatMap((column) => column.sections.flatMap((section) => section.fieldKeys));
}

function replaceAliasKeys(
  layout: FieldLayout,
  aliasKeys: ReadonlySet<string>,
): FieldLayout {
  return mapSections(layout, (section) => {
    const keys: string[] = [];
    const seen = new Set<string>();
    for (const key of section.fieldKeys) {
      const next = aliasKeys.has(key) ? DEAL_SELLING_AGENCY_KEY : key;
      if (!next || seen.has(next)) continue;
      seen.add(next);
      keys.push(next);
    }
    return { ...section, fieldKeys: keys };
  });
}

function injectSellingAgency(layout: FieldLayout): FieldLayout {
  let injected = false;
  const next = mapSections(layout, (section) => {
    if (injected || !isInsuranceHomeSection(section)) return section;
    if (section.fieldKeys.includes(DEAL_SELLING_AGENCY_KEY)) {
      injected = true;
      return section;
    }
    const keys = [...section.fieldKeys];
    const after = keys.indexOf("insurance_subtype");
    if (after >= 0) keys.splice(after + 1, 0, DEAL_SELLING_AGENCY_KEY);
    else keys.push(DEAL_SELLING_AGENCY_KEY);
    injected = true;
    return { ...section, fieldKeys: keys };
  });
  if (injected) return next;
  const columns = next.columns.map((column, index) => {
    if (index !== 1 && next.columns.length > 1) return column;
    if (column.sections.some((section) => isInsuranceHomeSection(section))) return column;
    return {
      ...column,
      sections: [
        ...column.sections,
        {
          id: PIPELINE_STRIP_SECTION_ID,
          label: "Pipeline",
          fieldKeys: [DEAL_SELLING_AGENCY_KEY],
        },
      ],
    };
  });
  return { ...next, columns };
}

/**
 * Bind Deal Details / Lead Details layout slots to the list column.
 * Retires a duplicate Selling agency key Admin added on Details.
 */
export function canonicalizeSellingAgencyLayout(
  layout: FieldLayout,
  fields: ReadonlyArray<{ key: string; label?: string | null; globalListKey?: string | null }> = [],
): FieldLayout {
  const aliasKeys = new Set<string>(DEAL_SELLING_AGENCY_ALIAS_KEYS);
  for (const field of fields) {
    if (field.key !== DEAL_SELLING_AGENCY_KEY && isSellingAgencyField(field)) {
      aliasKeys.add(field.key);
    }
  }

  let next = replaceAliasKeys(layout, aliasKeys);
  const keys = allKeys(next);
  const inPipeline = next.columns.some((column) =>
    column.sections.some(
      (section) => isInsuranceHomeSection(section) && section.fieldKeys.includes(DEAL_SELLING_AGENCY_KEY),
    ),
  );

  if (inPipeline) {
    next = mapSections(next, (section) => {
      if (isInsuranceHomeSection(section)) return section;
      return {
        ...section,
        fieldKeys: section.fieldKeys.filter((key) => key !== DEAL_SELLING_AGENCY_KEY),
      };
    });
  }

  const hasInsurance = keys.some((key) =>
    key === "insurance_type" || key === "insurance_category" || key === "insurance_subtype",
  );
  if (hasInsurance && !allKeys(next).includes(DEAL_SELLING_AGENCY_KEY)) {
    next = injectSellingAgency(next);
  } else if (!inPipeline && allKeys(next).includes(DEAL_SELLING_AGENCY_KEY)) {
    const hasHome = next.columns.some((column) => column.sections.some(isInsuranceHomeSection));
    if (hasHome) {
      next = mapSections(next, (section) => ({
        ...section,
        fieldKeys: isInsuranceHomeSection(section)
          ? section.fieldKeys
          : section.fieldKeys.filter((key) => key !== DEAL_SELLING_AGENCY_KEY),
      }));
      if (!allKeys(next).includes(DEAL_SELLING_AGENCY_KEY)) next = injectSellingAgency(next);
    }
  }

  return next;
}

export function layoutsEqualForSellingAgency(a: FieldLayout, b: FieldLayout): boolean {
  return JSON.stringify(a.columns) === JSON.stringify(b.columns);
}
