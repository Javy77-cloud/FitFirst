import type { FieldLayout, LayoutSection } from "./types";

const INSURED_KEYS = new Set([
  "mailing_address",
  "insured_property_kind",
  "mailing_unit",
  "city",
  "state",
  "zip",
  "county",
]);
const MAILING_KEYS = new Set([
  "contact_mailing_address",
  "contact_mailing_unit",
  "contact_mailing_city",
  "contact_mailing_state",
  "contact_mailing_zip",
  "contact_mailing_county",
]);

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

/** Ensure Mailing Address has street + city + state + zip like Insured Address. */
export function needsMailingAddressParity(layout: FieldLayout): boolean {
  for (const col of layout.columns) {
    for (const section of col.sections) {
      if (section.id !== "mailing_address" && !/^mailing address$/i.test(section.label.trim())) continue;
      const keys = new Set(section.fieldKeys);
      if (
        keys.has("contact_mailing_address") &&
        (!keys.has("contact_mailing_city") ||
          !keys.has("contact_mailing_state") ||
          !keys.has("contact_mailing_zip") ||
          !keys.has("contact_mailing_unit") ||
          !keys.has("contact_mailing_county"))
      ) {
        return true;
      }
    }
  }
  return false;
}

const MAILING_PARITY_KEYS = [
  "contact_mailing_address",
  "contact_mailing_unit",
  "contact_mailing_city",
  "contact_mailing_state",
  "contact_mailing_zip",
  "contact_mailing_county",
] as const;

export function ensureMailingAddressParity(layout: FieldLayout): FieldLayout {
  if (!needsMailingAddressParity(layout)) return layout;
  return {
    columns: layout.columns.map((col) => ({
      ...col,
      sections: col.sections.map((section) => {
        if (section.id !== "mailing_address" && !/^mailing address$/i.test(section.label.trim())) {
          return section;
        }
        const keys = [...section.fieldKeys];
        for (const key of MAILING_PARITY_KEYS) {
          if (!keys.includes(key)) keys.push(key);
        }
        return { ...section, fieldKeys: keys };
      }),
    })),
  };
}
