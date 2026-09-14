import type { FieldLayout, LayoutSection } from "./types";
import { APPLICANT_SECTION_FIELD_KEYS } from "./applicant-fields";
import {
  ensureMailingAddressParity,
  needsMailingAddressParity,
} from "./split-address-sections";

export const DEAL_INSURANCE_LAYOUT_KEYS = ["insurance_type", "insurance_category", "insurance_subtype"] as const;


/** Append missing Applicant stack keys (e.g. entity_type) — never touches co_applicant. */
function ensureDealApplicantKeys(layout: FieldLayout): FieldLayout {
  return {
    columns: layout.columns.map((col) => ({
      ...col,
      sections: col.sections.map((section) => {
        if (section.id !== "applicant" && !/^applicant$/i.test(section.label.trim())) return section;
        if (section.id === "co_applicant" || /^co[- ]?applicant/i.test(section.label.trim())) return section;
        const keys = [...section.fieldKeys];
        for (const key of APPLICANT_SECTION_FIELD_KEYS) {
          if (!keys.includes(key)) keys.push(key);
        }
        return { ...section, fieldKeys: keys };
      }),
    })),
  };
}

function needsDealApplicantKeys(layout: FieldLayout): boolean {
  for (const col of layout.columns) {
    for (const section of col.sections) {
      if (section.id !== "applicant" && !/^applicant$/i.test(section.label.trim())) continue;
      if (section.id === "co_applicant" || /^co[- ]?applicant/i.test(section.label.trim())) continue;
      for (const key of APPLICANT_SECTION_FIELD_KEYS) {
        if (!section.fieldKeys.includes(key)) return true;
      }
    }
  }
  return false;
}


/**
 * Deal layout parity is mailing address shape + Insurance Type / Category / Form on Details.
 * Do NOT re-seed Co-applicant (or any section) on load/save — agency edits must stick
 * (Javy: keep some / delete some / none). Co-applicant remains in defaultLayoutForLine for new installs.
 */
export function allDealLayoutKeys(layout: FieldLayout): string[] {
  return layout.columns.flatMap((col) => col.sections.flatMap((s) => s.fieldKeys));
}

export function needsDealInsuranceFields(layout: FieldLayout): boolean {
  const keys = allDealLayoutKeys(layout);
  return DEAL_INSURANCE_LAYOUT_KEYS.some((key) => !keys.includes(key));
}

function ensureDetailsInsurance(sections: LayoutSection[]): LayoutSection[] {
  const keys = sections.flatMap((s) => s.fieldKeys);
  const missing = DEAL_INSURANCE_LAYOUT_KEYS.filter((key) => !keys.includes(key));
  if (missing.length === 0) return sections;

  const detailsIdx = sections.findIndex(
    (s) => s.id === "details" || /^details$/i.test(s.label.trim()),
  );
  if (detailsIdx >= 0) {
    return sections.map((section, idx) => {
      if (idx !== detailsIdx) return section;
      const nextKeys = [...section.fieldKeys];
      for (const key of DEAL_INSURANCE_LAYOUT_KEYS) {
        if (!nextKeys.includes(key)) {
          if (key === "insurance_category") {
            const typeIdx = nextKeys.indexOf("insurance_type");
            if (typeIdx >= 0) nextKeys.splice(typeIdx + 1, 0, key);
            else nextKeys.push(key);
          } else if (key === "insurance_subtype") {
            const catIdx = nextKeys.indexOf("insurance_category");
            const typeIdx = nextKeys.indexOf("insurance_type");
            if (catIdx >= 0) nextKeys.splice(catIdx + 1, 0, key);
            else if (typeIdx >= 0) nextKeys.splice(typeIdx + 1, 0, key);
            else nextKeys.push(key);
          } else {
            const pipeIdx = nextKeys.indexOf("pipeline");
            if (pipeIdx >= 0) nextKeys.splice(pipeIdx + 1, 0, key);
            else nextKeys.push(key);
          }
        }
      }
      return { ...section, fieldKeys: nextKeys };
    });
  }

  const details: LayoutSection = {
    id: "details",
    label: "Details",
    fieldKeys: [...DEAL_INSURANCE_LAYOUT_KEYS],
  };
  // Prefer right column caller; append before mailing/insured address when present.
  const mailingIdx = sections.findIndex(
    (s) =>
      s.id === "mailing_address" ||
      s.id === "insured_address" ||
      /^mailing address$/i.test(s.label.trim()) ||
      /^insured address$/i.test(s.label.trim()),
  );
  if (mailingIdx >= 0) {
    const next = [...sections];
    next.splice(mailingIdx, 0, details);
    return next;
  }
  return [...sections, details];
}

export function ensureDealInsuranceFields(layout: FieldLayout): FieldLayout {
  if (!needsDealInsuranceFields(layout)) return layout;
  const columns = layout.columns.map((col, colIdx) => {
    // Inject into right column when two-col; otherwise every column until keys exist.
    if (layout.columns.length > 1 && colIdx !== 1) return col;
    return { ...col, sections: ensureDetailsInsurance(col.sections) };
  });
  // If still missing (single skinny left-only), force onto first column.
  const next = { columns };
  if (needsDealInsuranceFields(next)) {
    return {
      columns: next.columns.map((col, colIdx) =>
        colIdx === 0 ? { ...col, sections: ensureDetailsInsurance(col.sections) } : col,
      ),
    };
  }
  return next;
}

export function needsDealLayoutParity(layout: FieldLayout): boolean {
  return (
    needsMailingAddressParity(layout) ||
    needsDealInsuranceFields(layout) ||
    needsDealApplicantKeys(layout)
  );
}

export function migrateDealLayoutParity(layout: FieldLayout): FieldLayout {
  return ensureDealApplicantKeys(ensureDealInsuranceFields(ensureMailingAddressParity(layout)));
}
