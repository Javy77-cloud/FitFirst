export const CUSTOM_FIELD_TYPES = [
  "single_line",
  "multi_line",
  "email",
  "phone",
  "picklist",
  "multi_select",
  "date",
  "date_time",
  "number",
  "currency",
  "percentage",
  "checkbox",
  "lookup",
  "formula",
  "image",
] as const;

export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

export const CUSTOM_FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  single_line: "Single line",
  multi_line: "Notes",
  email: "Email",
  phone: "Phone",
  picklist: "Picklist",
  multi_select: "Multi-select",
  date: "Date",
  date_time: "Date-time",
  number: "Number",
  currency: "Currency",
  percentage: "Percentage",
  checkbox: "Checkbox",
  lookup: "Lookup",
  formula: "Formula",
  image: "Image upload",
};

export type CustomFieldDef = {
  key: string;
  label: string;
  type: CustomFieldType;
  options?: string[];
  formula?: string | null;
  lookupModule?: string | null;
  systemKey?: string | null;
  required?: boolean;
  defaultValue?: string | null;
  picklistId?: string | null;
};

/** Palette includes field types plus Section, which is a layout block — not a field type. */
export const PALETTE_ITEMS = [...CUSTOM_FIELD_TYPES, "section"] as const;
export type PaletteItem = (typeof PALETTE_ITEMS)[number];

export const PALETTE_LABELS: Record<PaletteItem, string> = {
  ...CUSTOM_FIELD_TYPE_LABELS,
  section: "Section",
};

export type LayoutSection = {
  id: string;
  label: string;
  fieldKeys: string[];
};

export type LayoutColumn = {
  id: string;
  sections: LayoutSection[];
};

export type FieldLayout = {
  columns: [LayoutColumn, LayoutColumn];
};

export function isCustomFieldType(value: string): value is CustomFieldType {
  return (CUSTOM_FIELD_TYPES as readonly string[]).includes(value);
}

export function slugifyFieldKey(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return slug || `field_${Date.now().toString(36)}`;
}

export function newSectionId(): string {
  return `sec_${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyLayout(): FieldLayout {
  return {
    columns: [
      { id: "left", sections: [] },
      { id: "right", sections: [] },
    ],
  };
}

export function parseLayout(raw: unknown): FieldLayout {
  const fallback = emptyLayout();
  if (!raw || typeof raw !== "object") return fallback;
  const columnsRaw = (raw as { columns?: unknown }).columns;
  const columns = Array.isArray(columnsRaw) ? columnsRaw : [];
  const parseColumn = (col: unknown, fallbackId: string): LayoutColumn => {
    if (!col || typeof col !== "object") return { id: fallbackId, sections: [] };
    const row = col as { id?: unknown; sections?: unknown };
    const sectionsRaw = Array.isArray(row.sections) ? row.sections : [];
    const sections = sectionsRaw
      .filter((section): section is Record<string, unknown> => Boolean(section) && typeof section === "object")
      .map((section) => ({
        id: typeof section.id === "string" ? section.id : newSectionId(),
        label: typeof section.label === "string" ? section.label : "Section",
        fieldKeys: Array.isArray(section.fieldKeys) ? section.fieldKeys.map((key) => String(key)) : [],
      }));
    return { id: typeof row.id === "string" ? row.id : fallbackId, sections };
  };
  return {
    columns: [parseColumn(columns[0], "left"), parseColumn(columns[1], "right")],
  };
}

export function allLayoutFieldKeys(layout: FieldLayout): string[] {
  return layout.columns.flatMap((column) => column.sections.flatMap((section) => section.fieldKeys));
}

export function fieldByKey(fields: CustomFieldDef[], key: string): CustomFieldDef | undefined {
  return fields.find((field) => field.key === key);
}
