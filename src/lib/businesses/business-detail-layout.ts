import type { FieldLayout, LayoutSection } from "@/lib/custom-fields/types";
import { allLayoutFieldKeys } from "@/lib/custom-fields/types";

/** Stock section ids → party-parity labels (Contacts ≡ Accounts). */
const PARITY_SECTION_LABELS: Record<string, string> = {
  business: "Business Info",
  contact: "Business Contact",
};

/** Pre-parity labels that still appear on agency-saved layouts. */
const PRE_PARITY_LABELS: Record<string, readonly string[]> = {
  business: ["Account", "Business"],
  contact: ["Contact"],
};

/** Sketch Business Info order (density 2 pairs). `primary_contact` may resolve to an agency key. */
export const BUSINESS_INFO_SKETCH_KEYS = [
  "business_name",
  "primary_contact",
  "dba",
  "ein",
  "entity_type",
  "industry",
] as const;

/** Sketch contact block under Location (density 2; website stays wide via isWideLayoutField). */
export const CONTACT_SKETCH_KEYS = ["phone", "email", "website", "source", "referral"] as const;

/** Left-column section order (Operations stays on the RIGHT). */
const LEFT_STACK_SECTION_IDS = ["business", "location", "contact"] as const;

/** Right-column section order beside Business Details. */
const RIGHT_STACK_SECTION_IDS = ["operations", "crm_notes"] as const;

export type FieldLabelHint = { key: string; label: string };

function renameParitySection(section: LayoutSection): LayoutSection {
  const targets = PRE_PARITY_LABELS[section.id];
  const nextLabel = PARITY_SECTION_LABELS[section.id];
  if (!targets || !nextLabel) return section;
  if (!targets.includes(section.label.trim())) return section;
  return { ...section, label: nextLabel };
}

/**
 * Soft migrate: rename Account/Contact stock labels and stamp density 4 where
 * missing. Preserves agency field keys and deleted sections (no CRM Notes reseed).
 */
export function migrateBusinessDetailsParity(layout: FieldLayout): FieldLayout {
  return {
    ...layout,
    columns: layout.columns.map((column) => ({
      ...column,
      sections: column.sections.map((section) => {
        const renamed = renameParitySection(section);
        if (renamed.density != null) return renamed;
        return { ...renamed, density: 4 as const };
      }),
    })),
  };
}

/** True when a saved Business Details layout still needs party-parity chrome. */
export function needsBusinessDetailsParityUpgrade(layout: FieldLayout): boolean {
  for (const column of layout.columns) {
    for (const section of column.sections) {
      const pre = PRE_PARITY_LABELS[section.id];
      if (pre && pre.includes(section.label.trim())) return true;
      // Pre-density agency/stock layouts omit density (renderer defaults to 2).
      if (section.density == null) return true;
    }
  }
  return false;
}

/**
 * Resolve the Primary Contact layout key: stock `primary_contact`, or an agency
 * key whose label matches /primary\s*contact/i.
 */
export function resolvePrimaryContactKey(
  layout: FieldLayout,
  fields?: FieldLabelHint[],
): string {
  const keys = new Set(allLayoutFieldKeys(layout));
  if (keys.has("primary_contact")) return "primary_contact";
  if (fields?.length) {
    for (const field of fields) {
      if (/primary\s*contact/i.test(field.label.trim()) && keys.has(field.key)) {
        return field.key;
      }
    }
    if (fields.some((field) => field.key === "primary_contact")) return "primary_contact";
  }
  return "primary_contact";
}

function cloneLayout(layout: FieldLayout): FieldLayout {
  return {
    ...layout,
    columns: layout.columns.map((column) => ({
      ...column,
      sections: column.sections.map((section) => ({
        ...section,
        fieldKeys: [...section.fieldKeys],
      })),
    })),
  };
}

function flatSections(layout: FieldLayout): LayoutSection[] {
  return layout.columns.flatMap((column) => column.sections);
}

function sketchPrefixOk(fieldKeys: string[], sketch: readonly string[]): boolean {
  const present = sketch.filter((key) => fieldKeys.includes(key));
  if (present.length === 0) return true;
  const actual = fieldKeys.filter((key) => sketch.includes(key));
  if (actual.length !== present.length) return false;
  for (let i = 0; i < present.length; i++) {
    if (actual[i] !== present[i]) return false;
  }
  // Sketch keys must lead the section (agency extras append after).
  for (let i = 0; i < present.length; i++) {
    if (fieldKeys[i] !== present[i]) return false;
  }
  return true;
}

/**
 * True when a saved Business Details layout still needs Javy's row-map sketch:
 * Business Info pairs, contact under Location, legal_name in Operations.
 */
export function needsBusinessDetailsRowMap(
  layout: FieldLayout,
  fields?: FieldLabelHint[],
): boolean {
  const sections = flatSections(layout);
  const business = sections.find((section) => section.id === "business");
  if (!business) return false;

  const primaryKey = resolvePrimaryContactKey(layout, fields);
  const businessSketch = BUSINESS_INFO_SKETCH_KEYS.map((key) =>
    key === "primary_contact" ? primaryKey : key,
  );

  if (business.density !== 2) return true;
  if (business.fieldKeys.includes("legal_name")) return true;
  if (!business.fieldKeys.includes(primaryKey)) return true;
  if (!sketchPrefixOk(business.fieldKeys, businessSketch)) return true;

  const intake = sections.find((section) => section.id === "intake");
  if (
    intake &&
    (intake.fieldKeys.includes("source") || intake.fieldKeys.includes("referral"))
  ) {
    return true;
  }

  const contact = sections.find((section) => section.id === "contact");
  if (contact) {
    if (contact.density !== 2) return true;
    if (!sketchPrefixOk(contact.fieldKeys, CONTACT_SKETCH_KEYS)) return true;
  } else {
    const contactKeysElsewhere = sections.some((section) =>
      CONTACT_SKETCH_KEYS.some((key) => section.fieldKeys.includes(key)),
    );
    if (contactKeysElsewhere) return true;
  }

  const allKeys = allLayoutFieldKeys(layout);
  if (allKeys.includes("legal_name")) {
    const operations = sections.find((section) => section.id === "operations");
    if (!operations?.fieldKeys.includes("legal_name")) return true;
  }

  // Left column: business → location → contact. On two-col layouts, Operations
  // must sit on the right (Classic one-col may keep Operations stacked).
  const hasRightSections = Boolean(layout.columns[1]?.sections?.length);
  const left = layout.columns[0];
  if (left?.sections?.length) {
    const ids = left.sections.map((section) => section.id);
    if (hasRightSections && ids.includes("operations")) return true;
    const present = LEFT_STACK_SECTION_IDS.filter((id) => ids.includes(id));
    const actual = ids.filter((id) =>
      (LEFT_STACK_SECTION_IDS as readonly string[]).includes(id),
    );
    if (present.length > 1 && JSON.stringify(actual) !== JSON.stringify(present)) {
      return true;
    }
  }

  return false;
}

function ensureSection(
  columns: FieldLayout["columns"],
  preferredCol: number,
  section: LayoutSection,
  afterId?: string,
): LayoutSection {
  const existing = columns.flatMap((column) => column.sections).find((s) => s.id === section.id);
  if (existing) return existing;
  while (columns.length <= preferredCol) {
    columns.push({ id: columns.length === 0 ? "left" : "right", sections: [] });
  }
  const col = columns[preferredCol];
  if (afterId) {
    const idx = col.sections.findIndex((s) => s.id === afterId);
    if (idx >= 0) {
      col.sections.splice(idx + 1, 0, section);
      return section;
    }
  }
  col.sections.push(section);
  return section;
}

/**
 * Soft migrate agency Business Details to Javy's row map without deleting
 * custom keys. Reorders known sketch keys; appends other agency keys after.
 * Always ensures a Primary Contact slot (`primary_contact` or label match).
 * Moves `legal_name` into Operations (RIGHT column). Merges Intake into Contact under Location on the LEFT.
 */
export function migrateBusinessDetailsRowMap(
  layout: FieldLayout,
  fields?: FieldLabelHint[],
): FieldLayout {
  const next = cloneLayout(layout);
  const columns = next.columns;
  if (!columns.length) {
    columns.push({ id: "left", sections: [] });
  }

  const primaryKey = resolvePrimaryContactKey(layout, fields);
  const businessSketch = BUSINESS_INFO_SKETCH_KEYS.map((key) =>
    key === "primary_contact" ? primaryKey : key,
  );
  const relocating = new Set<string>([
    ...businessSketch,
    ...CONTACT_SKETCH_KEYS,
    "legal_name",
  ]);

  const existingKeys = new Set(allLayoutFieldKeys(next));

  const beforeBusiness = flatSections(next).find((s) => s.id === "business");
  const beforeContact = flatSections(next).find((s) => s.id === "contact");
  const beforeIntake = flatSections(next).find((s) => s.id === "intake");

  const businessExtras = (beforeBusiness?.fieldKeys ?? []).filter(
    (key) => !relocating.has(key),
  );
  const contactExtras = [
    ...(beforeContact?.fieldKeys ?? []),
    ...(beforeIntake?.fieldKeys ?? []),
  ].filter((key) => !relocating.has(key));

  for (const column of columns) {
    for (const section of column.sections) {
      section.fieldKeys = section.fieldKeys.filter((key) => !relocating.has(key));
    }
  }

  const bizColIdx = Math.max(
    0,
    columns.findIndex((column) => column.sections.some((s) => s.id === "business")),
  );

  const business = ensureSection(
    columns,
    bizColIdx,
    {
      id: "business",
      label: "Business Info",
      fieldKeys: [],
      density: 2,
    },
  );
  const renamedBiz = renameParitySection(business);
  business.label = renamedBiz.label === business.label ? "Business Info" : renamedBiz.label;
  if (PRE_PARITY_LABELS.business?.includes(business.label.trim())) {
    business.label = "Business Info";
  }

  const bizKeys: string[] = [];
  for (const key of businessSketch) {
    if (key === primaryKey) {
      if (!bizKeys.includes(key)) bizKeys.push(key);
      continue;
    }
    if (existingKeys.has(key) && !bizKeys.includes(key)) bizKeys.push(key);
  }
  if (!bizKeys.includes(primaryKey)) {
    const nameAt = bizKeys.indexOf("business_name");
    if (nameAt >= 0) bizKeys.splice(nameAt + 1, 0, primaryKey);
    else bizKeys.unshift(primaryKey);
  }
  for (const key of businessExtras) {
    if (!bizKeys.includes(key)) bizKeys.push(key);
  }
  business.fieldKeys = bizKeys;
  business.density = 2;

  // Contact under Location on the business column.
  const contact = ensureSection(
    columns,
    bizColIdx,
    {
      id: "contact",
      label: "Business Contact",
      fieldKeys: [],
      density: 2,
    },
    "location",
  );
  if (PRE_PARITY_LABELS.contact?.includes(contact.label.trim()) || contact.label === "Contact") {
    contact.label = "Business Contact";
  }
  const cKeys: string[] = [];
  for (const key of CONTACT_SKETCH_KEYS) {
    if (existingKeys.has(key) && !cKeys.includes(key)) cKeys.push(key);
  }
  for (const key of contactExtras) {
    if (!cKeys.includes(key)) cKeys.push(key);
  }
  contact.fieldKeys = cKeys;
  contact.density = 2;

  // Two-col Card: Operations on the RIGHT. Classic one-col keeps a stacked layout.
  const hasRightSections = Boolean(columns[1]?.sections?.length);
  const rightColIdx = hasRightSections ? (bizColIdx === 0 ? 1 : 0) : bizColIdx;
  if (hasRightSections) {
    while (columns.length <= rightColIdx) {
      columns.push({ id: "right", sections: [] });
    }
  }

  if (existingKeys.has("legal_name")) {
    const operations = ensureSection(
      columns,
      rightColIdx,
      {
        id: "operations",
        label: "Operations",
        fieldKeys: [],
        density: 4,
      },
    );
    if (!operations.fieldKeys.includes("legal_name")) {
      operations.fieldKeys.unshift("legal_name");
    }
  }

  // Drop empty Intake after merge (extras already folded into contact).
  for (const column of columns) {
    column.sections = column.sections.filter(
      (section) => !(section.id === "intake" && section.fieldKeys.length === 0),
    );
  }

  // Left column: Business Info → Location → Contact. Do NOT pull Operations left.
  const stackColIdx = Math.max(
    0,
    columns.findIndex((column) => column.sections.some((s) => s.id === "business")),
  );
  const stackCol = columns[stackColIdx];
  const preferred: LayoutSection[] = [];
  for (const id of LEFT_STACK_SECTION_IDS) {
    let section = stackCol.sections.find((s) => s.id === id);
    if (!section) {
      for (let ci = 0; ci < columns.length; ci++) {
        if (ci === stackColIdx) continue;
        const idx = columns[ci].sections.findIndex((s) => s.id === id);
        if (idx >= 0) {
          section = columns[ci].sections.splice(idx, 1)[0];
          break;
        }
      }
    }
    if (section && !preferred.includes(section)) preferred.push(section);
  }
  // Move Operations / CRM Notes off the left onto the right when two-col.
  const spillToRight: LayoutSection[] = [];
  const rest: LayoutSection[] = [];
  for (const section of stackCol.sections) {
    if ((LEFT_STACK_SECTION_IDS as readonly string[]).includes(section.id)) continue;
    if (
      hasRightSections &&
      (RIGHT_STACK_SECTION_IDS as readonly string[]).includes(section.id)
    ) {
      spillToRight.push(section);
      continue;
    }
    rest.push(section);
  }
  stackCol.sections = [...preferred, ...rest];

  if (hasRightSections) {
    const rightCol = columns[rightColIdx] ?? columns[1];
    for (const section of spillToRight) {
      if (!rightCol.sections.some((s) => s.id === section.id)) {
        rightCol.sections.push(section);
      }
    }
    // Prefer Operations then CRM Notes on the right.
    const rightPreferred: LayoutSection[] = [];
    for (const id of RIGHT_STACK_SECTION_IDS) {
      const section = rightCol.sections.find((s) => s.id === id);
      if (section && !rightPreferred.includes(section)) rightPreferred.push(section);
    }
    const rightRest = rightCol.sections.filter(
      (section) => !(RIGHT_STACK_SECTION_IDS as readonly string[]).includes(section.id),
    );
    rightCol.sections = [...rightPreferred, ...rightRest];
  }

  // Remove sections emptied by relocation (never reseed CRM Notes).
  for (const column of columns) {
    column.sections = column.sections.filter((section) => section.fieldKeys.length > 0);
  }

  return next;
}
