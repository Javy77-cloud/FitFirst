import type { FieldLayout, LayoutSection } from "./types";
import { APPLICANT_SECTION_FIELD_KEYS, applicantLayoutSection } from "./applicant-fields";
import { needsAddressSectionSplit, splitInsuredMailingAddressSections } from "./split-address-sections";

/** Drop from Lead detail/Edit Layout (Javy 2026-09-11) — keep Temperature; Insurance subtype stays. */
export const LEAD_LAYOUT_STRIP_KEYS = new Set(["insurance_type_desired"]);

function stripKeys(section: LayoutSection): LayoutSection {
  return {
    ...section,
    fieldKeys: section.fieldKeys.filter((key) => !LEAD_LAYOUT_STRIP_KEYS.has(key)),
  };
}


/** Append missing canonical Applicant keys without wiping agency order/extras. */
function ensureApplicantKeysPresent(sections: LayoutSection[]): LayoutSection[] {
  return sections.map((section) => {
    if (section.id !== "applicant" && !/^applicant$/i.test(section.label.trim())) return section;
    if (section.id === "co_applicant" || /^co[- ]?applicant/i.test(section.label.trim())) return section;
    const keys = [...section.fieldKeys];
    for (const key of APPLICANT_SECTION_FIELD_KEYS) {
      if (!keys.includes(key)) keys.push(key);
    }
    return { ...section, fieldKeys: keys };
  });
}

function applicantMissingCanonicalKeys(layout: FieldLayout): boolean {
  for (const col of layout.columns) {
    for (const section of col.sections) {
      if (section.id !== "applicant" && !/^applicant$/i.test(section.label.trim())) continue;
      if (section.id === "co_applicant" || /^co[- ]?applicant/i.test(section.label.trim())) continue;
      for (const key of APPLICANT_SECTION_FIELD_KEYS) {
        if (!section.fieldKeys.includes(key)) return true;
      }
    }
  }
  // No applicant section at all → still need migration for non-parity; parity usually has one.
  const hasApplicant = layout.columns.some((c) =>
    c.sections.some((s) => s.id === "applicant" || /^applicant$/i.test(s.label.trim())),
  );
  return !hasApplicant;
}

function ensureApplicant(sections: LayoutSection[]): LayoutSection[] {
  const applicant = applicantLayoutSection();
  const idx = sections.findIndex((s) => s.id === "applicant" || /^applicant$/i.test(s.label.trim()));
  if (idx >= 0) {
    return sections.map((s, i) => (i === idx ? { ...applicant, id: s.id || "applicant" } : s));
  }
  const contactIdx = sections.findIndex((s) => s.id === "contact" || /^contact$/i.test(s.label.trim()));
  if (contactIdx >= 0) {
    const next = [...sections];
    next.splice(contactIdx + 1, 0, applicant);
    return next;
  }
  return [applicant, ...sections];
}

function ensureDobOnContact(sections: LayoutSection[]): LayoutSection[] {
  return sections.map((section) => {
    if (section.id !== "contact" && !/^contact$/i.test(section.label.trim())) return section;
    const keys = [...section.fieldKeys];
    if (!keys.includes("date_of_birth")) {
      const phone = keys.indexOf("phone");
      if (phone >= 0) keys.splice(phone + 1, 0, "date_of_birth");
      else keys.push("date_of_birth");
    }
    // DOB belongs on Contact, not Applicant
    return { ...section, fieldKeys: keys.filter((k) => k !== "applicant_gender") };
  });
}

function injectInsuranceKeys(keys: string[]): string[] {
  const next = [...keys];
  if (!next.includes("insurance_type")) {
    const pipeIdx = next.indexOf("pipeline");
    if (pipeIdx >= 0) next.splice(pipeIdx + 1, 0, "insurance_type");
    else next.push("insurance_type");
  }
  if (!next.includes("insurance_category")) {
    const typeIdx = next.indexOf("insurance_type");
    if (typeIdx >= 0) next.splice(typeIdx + 1, 0, "insurance_category");
    else next.push("insurance_category");
  }
  if (!next.includes("insurance_subtype")) {
    const catIdx = next.indexOf("insurance_category");
    const typeIdx = next.indexOf("insurance_type");
    if (catIdx >= 0) next.splice(catIdx + 1, 0, "insurance_subtype");
    else if (typeIdx >= 0) next.splice(typeIdx + 1, 0, "insurance_subtype");
    else next.push("insurance_subtype");
  }
  return next;
}

function ensureDetailsHasSubtype(sections: LayoutSection[]): LayoutSection[] {
  let foundDetails = false;
  const mapped = sections.map((section) => {
    const isDetails = section.id === "details" || /^details$/i.test(section.label.trim());
    const isQuality =
      section.id.includes("quality") || /^lead[- ]?quality$/i.test(section.label.trim());
    if (!isDetails && !isQuality) return section;
    if (isDetails) foundDetails = true;
    let keys = section.fieldKeys.filter((k) => !LEAD_LAYOUT_STRIP_KEYS.has(k));
    keys = injectInsuranceKeys(keys);
    if (isDetails && !keys.includes("temperature")) {
      const sourceIdx = keys.indexOf("source");
      if (sourceIdx >= 0) keys.splice(sourceIdx + 1, 0, "temperature");
      else keys.unshift("temperature");
    }
    return { ...section, fieldKeys: keys };
  });
  if (foundDetails) return mapped;
  const allKeys = mapped.flatMap((s) => s.fieldKeys);
  if (allKeys.includes("insurance_type") && allKeys.includes("insurance_category") && allKeys.includes("insurance_subtype")) return mapped;
  // Deal-parity / quality-only layouts: add a Details section with Type + subtype.
  return [
    ...mapped,
    {
      id: "details",
      label: "Details",
      fieldKeys: ["insurance_type", "insurance_category", "insurance_subtype"],
    },
  ];
}


function ensureLeadQualityTemperature(sections: LayoutSection[]): LayoutSection[] {
  return sections.map((section) => {
    const isQuality =
      section.id.includes("quality") || /^lead[- ]?quality$/i.test(section.label.trim());
    if (!isQuality) return section;
    const keys = section.fieldKeys.filter((k) => k !== "temperature");
    const cadenceIdx = keys.indexOf("cadence");
    if (cadenceIdx >= 0) keys.splice(cadenceIdx + 1, 0, "temperature");
    else keys.push("temperature");
    return { ...section, fieldKeys: keys };
  });
}

/** Lead mirrors Deal Details (Applicant / Co-applicant / addresses) — Javy 2026-09-11. */
export function isLeadDealParityLayout(layout: FieldLayout): boolean {
  const ids = new Set(layout.columns.flatMap((c) => c.sections.map((s) => s.id)));
  return (
    ids.has("contact") &&
    ids.has("insured_address") &&
    ids.has("mailing_address") &&
    (ids.has("co_applicant") ||
      layout.columns.some((c) =>
        c.sections.some(
          (s) =>
            /^co[- ]?applicant/i.test(s.label.trim()) ||
            s.fieldKeys.some((k) => k.startsWith("co_applicant_")),
        ),
      ))
  );
}

export function needsLeadLayoutMigration(layout: FieldLayout): boolean {
  // Deal-parity layouts: strip forbidden keys + ensure Insurance Type / subtype stay available.
  if (isLeadDealParityLayout(layout)) {
    const allKeys = layout.columns.flatMap((c) => c.sections.flatMap((s) => s.fieldKeys));
    if (!allKeys.includes("insurance_type") || !allKeys.includes("insurance_category") || !allKeys.includes("insurance_subtype")) return true;
    if (applicantMissingCanonicalKeys(layout)) return true;
    for (const col of layout.columns) {
      for (const section of col.sections) {
        if (section.fieldKeys.some((k) => LEAD_LAYOUT_STRIP_KEYS.has(k))) return true;
        const isQuality =
          section.id.includes("quality") || /^lead[- ]?quality$/i.test(section.label.trim());
        if (isQuality && !section.fieldKeys.includes("temperature")) return true;
      }
    }
    return false;
  }
  for (const col of layout.columns) {
    for (const section of col.sections) {
      if (section.fieldKeys.some((k) => LEAD_LAYOUT_STRIP_KEYS.has(k))) return true;
      if (section.id === "applicant" || /^applicant$/i.test(section.label.trim())) {
        const want = applicantLayoutSection().fieldKeys;
        if (section.fieldKeys.join(",") !== want.join(",")) return true;
      }
    }
  }
  const ids = layout.columns.flatMap((c) => c.sections.map((s) => s.id));
  if (!ids.includes("applicant")) return true;
  if (needsAddressSectionSplit(layout)) return true;
  const allKeys = layout.columns.flatMap((c) => c.sections.flatMap((s) => s.fieldKeys));
  if (!allKeys.includes("insurance_subtype") || !allKeys.includes("insurance_category") || !allKeys.includes("insurance_type")) return true;
  if (allKeys.includes("insurance_type_desired")) return true;
  return false;
}

/** Force Lead saved layouts to match Javy's desk: no Status/Desire; Applicant stack; Insured+Mailing. */
export function migrateLeadLayout(layout: FieldLayout): FieldLayout {
  if (isLeadDealParityLayout(layout)) {
    return {
      columns: layout.columns.map((col, colIdx) => {
        let sections = ensureApplicantKeysPresent(
          ensureLeadQualityTemperature(
            col.sections.map(stripKeys).filter((s) => s.fieldKeys.length > 0),
          ),
        );
        // Put Insurance Type / subtype on the right column when present; else first column.
        const target = layout.columns.length > 1 ? 1 : 0;
        if (colIdx === target) sections = ensureDetailsHasSubtype(sections);
        return { ...col, sections };
      }),
    };
  }
  let next: FieldLayout = {
    columns: layout.columns.map((col) => ({
      ...col,
      sections: ensureDetailsHasSubtype(
        ensureDobOnContact(ensureApplicant(col.sections.map(stripKeys).filter((s) => s.fieldKeys.length > 0))),
      ),
    })),
  };
  if (needsAddressSectionSplit(next) || !next.columns.some((c) => c.sections.some((s) => s.id === "insured_address"))) {
    next = splitInsuredMailingAddressSections(next);
  }
  // If still no insured/mailing after split helper (no contact_mailing), ensure sections exist
  const hasInsured = next.columns.some((c) => c.sections.some((s) => s.id === "insured_address"));
  const hasMailing = next.columns.some((c) => c.sections.some((s) => s.id === "mailing_address"));
  if (!hasInsured || !hasMailing) {
    next = {
      columns: next.columns.map((col, colIdx) => {
        if (colIdx !== 0) return col;
        let sections = [...col.sections];
        if (!hasInsured) {
          sections.push({
            id: "insured_address",
            label: "Insured Address",
            fieldKeys: ["mailing_address", "city", "state", "zip"],
          });
        }
        if (!hasMailing) {
          sections.push({
            id: "mailing_address",
            label: "Mailing Address",
            fieldKeys: ["contact_mailing_address"],
          });
        }
        return { ...col, sections };
      }),
    };
  }
  return next;
}
