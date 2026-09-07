import {
  OPTIONAL_CONTACT_KEYS,
  STRIPPED_DEAL_SECTION_IDS,
  defaultLayoutForLine,
} from "./defaults";
import type { FieldLayout, LayoutSection } from "./types";
import { emptyLayout, newSectionId, parseLayout } from "./types";

export function cloneLayout(layout: FieldLayout): FieldLayout {
  return parseLayout(JSON.parse(JSON.stringify(layout)));
}

export function addSection(layout: FieldLayout, columnId: string, label = "New section"): FieldLayout {
  const next = cloneLayout(layout);
  const column = next.columns.find((col) => col.id === columnId) ?? next.columns[0];
  column.sections.push({ id: newSectionId(), label, fieldKeys: [] });
  return next;
}

export function relabelSection(layout: FieldLayout, sectionId: string, label: string): FieldLayout {
  const next = cloneLayout(layout);
  for (const column of next.columns) {
    const section = column.sections.find((item) => item.id === sectionId);
    if (section) section.label = label.trim() || section.label;
  }
  return next;
}

export function deleteSection(layout: FieldLayout, sectionId: string): FieldLayout {
  const next = cloneLayout(layout);
  for (const column of next.columns) {
    column.sections = column.sections.filter((section) => section.id !== sectionId);
  }
  return next;
}

export function addFieldToSection(layout: FieldLayout, sectionId: string, fieldKey: string): FieldLayout {
  const next = cloneLayout(layout);
  for (const column of next.columns) {
    for (const section of column.sections) {
      section.fieldKeys = section.fieldKeys.filter((key) => key !== fieldKey);
      if (section.id === sectionId) section.fieldKeys.push(fieldKey);
    }
  }
  return next;
}

export function removeFieldFromLayout(layout: FieldLayout, fieldKey: string): FieldLayout {
  const next = cloneLayout(layout);
  for (const column of next.columns) {
    for (const section of column.sections) {
      section.fieldKeys = section.fieldKeys.filter((key) => key !== fieldKey);
    }
  }
  return next;
}

export function insertFieldAfter(layout: FieldLayout, afterKey: string, fieldKey: string): FieldLayout {
  const next = removeFieldFromLayout(layout, fieldKey);
  for (const column of next.columns) {
    for (const section of column.sections) {
      const at = section.fieldKeys.indexOf(afterKey);
      if (at >= 0) {
        section.fieldKeys.splice(at + 1, 0, fieldKey);
        return next;
      }
    }
  }
  const first = next.columns[0]?.sections[0];
  if (first) first.fieldKeys.push(fieldKey);
  return next;
}

export function moveField(
  layout: FieldLayout,
  fieldKey: string,
  target: { columnId: string; sectionId?: string; beforeKey?: string },
): FieldLayout {
  if (target.beforeKey === fieldKey) return cloneLayout(layout);
  const next = removeFieldFromLayout(layout, fieldKey);
  const column = next.columns.find((col) => col.id === target.columnId) ?? next.columns[0];
  let section: LayoutSection | undefined = column.sections.find((item) => item.id === target.sectionId);
  if (!section) {
    if (!column.sections.length) {
      column.sections.push({ id: newSectionId(), label: "Details", fieldKeys: [] });
    }
    section = column.sections[0];
  }
  const at = target.beforeKey ? section.fieldKeys.indexOf(target.beforeKey) : -1;
  if (at >= 0) section.fieldKeys.splice(at, 0, fieldKey);
  else section.fieldKeys.push(fieldKey);
  return next;
}

export type FieldDropFieldHit = {
  key: string;
  top: number;
  height: number;
};

export type FieldDropSectionHit = {
  id: string;
  top: number;
  height: number;
  fields: FieldDropFieldHit[];
};

export type FieldDropTarget = {
  sectionId?: string;
  beforeKey?: string;
};

/** Section-aware insert: pointer inside a section stays in that section, including across columns. */
export function resolveFieldDrop(
  clientY: number,
  sections: FieldDropSectionHit[],
  options?: { draggingKey?: string },
): FieldDropTarget {
  const list = asLayoutRects(sections)
    .filter((section) => section.id)
    .map((section) => ({
      ...section,
      fields: asLayoutRects(section.fields).filter(
        (field) => field.key && field.key !== options?.draggingKey,
      ),
    }));
  if (!list.length) return {};

  const containing = list.find(
    (section) => clientY >= section.top && clientY <= section.top + section.height,
  );
  if (containing) {
    return {
      sectionId: containing.id,
      beforeKey: insertIndexFromClientY(clientY, containing.fields).beforeKey,
    };
  }

  for (const section of list) {
    if (clientY < section.top + section.height / 2) {
      return {
        sectionId: section.id,
        beforeKey: insertIndexFromClientY(clientY, section.fields).beforeKey,
      };
    }
  }

  const last = list[list.length - 1];
  return {
    sectionId: last.id,
    beforeKey: insertIndexFromClientY(clientY, last.fields).beforeKey,
  };
}

export function resolveSectionDrop(
  clientY: number,
  sections: { id: string; top: number; height: number }[],
  options?: { draggingId?: string },
): { beforeSectionId?: string } {
  const list = asLayoutRects(sections).filter((section) => section.id && section.id !== options?.draggingId);
  const insert = insertIndexFromClientY(
    clientY,
    list.map((section) => ({ key: section.id, top: section.top, height: section.height })),
  );
  return { beforeSectionId: insert.beforeKey };
}

export function applyResolvedFieldDrop(
  layout: FieldLayout,
  fieldKey: string,
  columnId: string,
  clientY: number,
  sections: FieldDropSectionHit[],
): FieldLayout {
  const target = resolveFieldDrop(clientY, sections, { draggingKey: fieldKey });
  return moveField(layout, fieldKey, { columnId, ...target });
}

/** Insert before the first item whose midpoint is below the pointer. */
export function insertIndexFromClientY(
  clientY: number,
  rects: { key: string; top: number; height: number }[],
): { beforeKey?: string } {
  for (const rect of asLayoutRects(rects)) {
    if (clientY < rect.top + rect.height / 2) return { beforeKey: rect.key };
  }
  return {};
}

function asLayoutRects<T extends { top: number; height: number }>(rects: T[] | null | undefined): T[] {
  return Array.isArray(rects) ? rects : [];
}

export function moveSection(
  layout: FieldLayout,
  sectionId: string,
  target: { columnId: string; beforeSectionId?: string },
): FieldLayout {
  const next = cloneLayout(layout);
  let moving: LayoutSection | undefined;
  for (const column of next.columns) {
    const idx = column.sections.findIndex((section) => section.id === sectionId);
    if (idx >= 0) {
      [moving] = column.sections.splice(idx, 1);
    }
  }
  if (!moving) return next;
  const column = next.columns.find((col) => col.id === target.columnId) ?? next.columns[0];
  const at = target.beforeSectionId ? column.sections.findIndex((section) => section.id === target.beforeSectionId) : -1;
  if (at >= 0) column.sections.splice(at, 0, moving);
  else column.sections.push(moving);
  return next;
}

export function ensureTwoColumns(layout: FieldLayout): FieldLayout {
  const parsed = parseLayout(layout);
  if (!parsed.columns[0]) parsed.columns[0] = { id: "left", sections: [] };
  if (!parsed.columns[1]) parsed.columns[1] = { id: "right", sections: [] };
  return parsed.columns[0] && parsed.columns[1] ? parsed : emptyLayout();
}

const STRIPPED_IDS = new Set<string>(STRIPPED_DEAL_SECTION_IDS);
const OPTIONAL_CONTACT = new Set<string>(OPTIONAL_CONTACT_KEYS);

export function needsEssentialDealMigration(layout: FieldLayout): boolean {
  return layout.columns.some((column) =>
    column.sections.some((section) => STRIPPED_IDS.has(section.id)),
  );
}

/** Drop Property / Photos / Notes (and other old LOB packs) from a saved layout. */
export function stripLegacyDealLayout(layout: FieldLayout): FieldLayout {
  if (!needsEssentialDealMigration(layout)) return cloneLayout(layout);
  const next = cloneLayout(layout);
  for (const column of next.columns) {
    column.sections = column.sections.filter((section) => !STRIPPED_IDS.has(section.id));
    for (const section of column.sections) {
      if (section.id === "contact") {
        section.fieldKeys = section.fieldKeys.filter((key) => !OPTIONAL_CONTACT.has(key));
      }
    }
  }
  const hasContact = next.columns.some((column) => column.sections.some((section) => section.id === "contact"));
  const hasAddress = next.columns.some((column) => column.sections.some((section) => section.id === "address"));
  if (!hasContact || !hasAddress) return defaultLayoutForLine();
  const right = next.columns[1];
  if (right && right.sections.length === 0) {
    for (const column of next.columns) {
      const idx = column.sections.findIndex((section) => section.id === "address");
      if (idx >= 0 && column.id !== "right") {
        const [address] = column.sections.splice(idx, 1);
        right.sections.push(address);
        break;
      }
    }
  }
  return next;
}
