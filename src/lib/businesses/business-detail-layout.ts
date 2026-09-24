import type { FieldLayout, LayoutSection } from "@/lib/custom-fields/types";

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
