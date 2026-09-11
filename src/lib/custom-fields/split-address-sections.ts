import type { FieldLayout, LayoutSection } from "./types";

const INSURED_KEYS = new Set(["mailing_address", "city", "state", "zip"]);
const MAILING_KEYS = new Set(["contact_mailing_address"]);

function sectionHasBoth(section: LayoutSection): boolean {
  const keys = new Set(section.fieldKeys);
  return keys.has("mailing_address") && keys.has("contact_mailing_address");
}

function isLegacyAddressSection(section: LayoutSection): boolean {
  if (section.id === "address" || /^address$/i.test(section.label.trim())) return true;
  return sectionHasBoth(section);
}

/** Split combined Address section into Insured Address + Mailing Address (Javy 2026-09-11). */
export function needsAddressSectionSplit(layout: FieldLayout): boolean {
  for (const col of layout.columns) {
    for (const section of col.sections) {
      if (sectionHasBoth(section)) return true;
      if (isLegacyAddressSection(section) && section.fieldKeys.includes("contact_mailing_address")) {
        // legacy single Address blob that includes mailing
        if (section.fieldKeys.some((k) => INSURED_KEYS.has(k) || MAILING_KEYS.has(k))) return true;
      }
    }
  }
  return false;
}

export function splitInsuredMailingAddressSections(layout: FieldLayout): FieldLayout {
  if (!needsAddressSectionSplit(layout)) return layout;
  return {
    columns: layout.columns.map((col) => ({
      ...col,
      sections: col.sections.flatMap((section) => {
        if (!sectionHasBoth(section) && !(isLegacyAddressSection(section) && section.fieldKeys.includes("contact_mailing_address"))) {
          return [section];
        }
        const insuredKeys = section.fieldKeys.filter((k) => INSURED_KEYS.has(k));
        const mailingKeys = section.fieldKeys.filter((k) => MAILING_KEYS.has(k));
        const otherKeys = section.fieldKeys.filter((k) => !INSURED_KEYS.has(k) && !MAILING_KEYS.has(k));
        const out: LayoutSection[] = [];
        if (insuredKeys.length || otherKeys.length) {
          out.push({
            id: "insured_address",
            label: "Insured Address",
            fieldKeys: [...insuredKeys, ...otherKeys],
          });
        }
        if (mailingKeys.length) {
          out.push({
            id: "mailing_address",
            label: "Mailing Address",
            fieldKeys: mailingKeys,
          });
        }
        return out.length ? out : [section];
      }),
    })),
  };
}
