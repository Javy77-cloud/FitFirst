import type { FieldLayout, LayoutSection } from "./types";
import { APPLICANT_SECTION_FIELD_KEYS } from "./applicant-fields";
import { CO_APPLICANT_SECTION_FIELD_KEYS } from "./co-applicant-fields";
import {
  LIVED_AT_ADDRESS_5_YEARS_KEY,
  PREVIOUS_ADDRESS_FIELD_KEYS,
} from "./mailing-same";
import {
  ensureMailingAddressParity,
  needsMailingAddressParity,
} from "./split-address-sections";

export const DEAL_INSURANCE_LAYOUT_KEYS = ["insurance_type", "insurance_category", "insurance_subtype"] as const;

const CONTACT_INJECT_KEYS = ["entity_type", "middle_name", "epolicy"] as const;

const INSURED_INJECT_KEYS = [
  "mailing_unit",
  "county",
  LIVED_AT_ADDRESS_5_YEARS_KEY,
  ...PREVIOUS_ADDRESS_FIELD_KEYS,
] as const;

function isApplicantSection(section: { id: string; label: string }): boolean {
  if (section.id === "co_applicant" || /^co[- ]?applicant/i.test(section.label.trim())) return false;
  return section.id === "applicant" || /^applicant$/i.test(section.label.trim());
}

function isContactSection(section: { id: string; label: string }): boolean {
  return section.id === "contact" || /^contact$/i.test(section.label.trim());
}

function isInsuredSection(section: { id: string; label: string }): boolean {
  return section.id === "insured_address" || /insured address/i.test(section.label.trim());
}

function isCoApplicantSection(section: { id: string; label: string }): boolean {
  return section.id === "co_applicant" || /^co[- ]?applicant/i.test(section.label.trim());
}

/** Append missing Applicant stack keys — never resurrects a deleted co-applicant section. */
function ensureDealApplicantKeys(layout: FieldLayout): FieldLayout {
  return {
    columns: layout.columns.map((col) => ({
      ...col,
      sections: col.sections.map((section) => {
        if (!isApplicantSection(section)) return section;
        const keys = [...section.fieldKeys].filter((key) => key !== "entity_type");
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
      if (!isApplicantSection(section)) continue;
      if (section.fieldKeys.includes("entity_type")) return true;
      for (const key of APPLICANT_SECTION_FIELD_KEYS) {
        if (!section.fieldKeys.includes(key)) return true;
      }
    }
  }
  return false;
}

function ensureDealContactIdentity(layout: FieldLayout): FieldLayout {
  return {
    columns: layout.columns.map((col) => ({
      ...col,
      sections: col.sections.map((section) => {
        if (!isContactSection(section)) return section;
        const keys = [...section.fieldKeys];
        for (const key of CONTACT_INJECT_KEYS) {
          if (keys.includes(key)) continue;
          if (key === "entity_type") keys.unshift(key);
          else if (key === "middle_name") {
            const first = keys.indexOf("first_name");
            if (first >= 0) keys.splice(first + 1, 0, key);
            else keys.push(key);
          } else if (key === "epolicy") {
            const email = keys.indexOf("email");
            if (email >= 0) keys.splice(email + 1, 0, key);
            else keys.push(key);
          } else {
            keys.push(key);
          }
        }
        return { ...section, fieldKeys: keys };
      }),
    })),
  };
}

function needsDealContactIdentity(layout: FieldLayout): boolean {
  for (const col of layout.columns) {
    for (const section of col.sections) {
      if (!isContactSection(section)) continue;
      return CONTACT_INJECT_KEYS.some((key) => !section.fieldKeys.includes(key));
    }
  }
  return false;
}

function ensureDealInsuredExtras(layout: FieldLayout): FieldLayout {
  return {
    columns: layout.columns.map((col) => ({
      ...col,
      sections: col.sections.map((section) => {
        if (!isInsuredSection(section)) return section;
        const keys = [...section.fieldKeys];
        for (const key of INSURED_INJECT_KEYS) {
          if (!keys.includes(key)) keys.push(key);
        }
        return { ...section, fieldKeys: keys };
      }),
    })),
  };
}

function needsDealInsuredExtras(layout: FieldLayout): boolean {
  for (const col of layout.columns) {
    for (const section of col.sections) {
      if (!isInsuredSection(section)) continue;
      return INSURED_INJECT_KEYS.some((key) => !section.fieldKeys.includes(key));
    }
  }
  return false;
}

/** Additive only when the agency already kept a Co-applicant section. */
function ensureExistingCoApplicantKeys(layout: FieldLayout): FieldLayout {
  return {
    columns: layout.columns.map((col) => ({
      ...col,
      sections: col.sections.map((section) => {
        if (!isCoApplicantSection(section)) return section;
        const keys = [...section.fieldKeys];
        for (const key of CO_APPLICANT_SECTION_FIELD_KEYS) {
          if (!keys.includes(key)) keys.push(key);
        }
        return { ...section, fieldKeys: keys };
      }),
    })),
  };
}

function needsExistingCoApplicantKeys(layout: FieldLayout): boolean {
  for (const col of layout.columns) {
    for (const section of col.sections) {
      if (!isCoApplicantSection(section)) continue;
      return CO_APPLICANT_SECTION_FIELD_KEYS.some((key) => !section.fieldKeys.includes(key));
    }
  }
  return false;
}

function isDetailsSection(section: { id: string; label: string }): boolean {
  return section.id === "details" || /^details$/i.test(section.label.trim());
}

function isMailingSection(section: { id: string; label: string }): boolean {
  return section.id === "mailing_address" || /^mailing address$/i.test(section.label.trim());
}

function takeSection(
  sections: LayoutSection[],
  match: (section: LayoutSection) => boolean,
): LayoutSection | null {
  const index = sections.findIndex(match);
  if (index < 0) return null;
  return sections.splice(index, 1)[0] ?? null;
}

/**
 * Applicant (with contact) on the left, co-applicant on the right.
 * Insured / mailing sit as a lower address band. Does not create a co-applicant section.
 */
export function needsPersonalColumnSplit(layout: FieldLayout): boolean {
  const left = layout.columns[0]?.sections ?? [];
  const right = layout.columns[1]?.sections ?? [];
  const coAppOnLeft = left.some(isCoApplicantSection);
  const applicantOnLeft = left.some(isApplicantSection);
  const insuredOnRight = right.some(isInsuredSection);
  return coAppOnLeft || (applicantOnLeft && insuredOnRight);
}

export function ensurePersonalColumnSplit(layout: FieldLayout): FieldLayout {
  if (!needsPersonalColumnSplit(layout)) return layout;
  const left = [...(layout.columns[0]?.sections ?? [])];
  const right = [...(layout.columns[1]?.sections ?? [])];
  const contact = takeSection(left, isContactSection) ?? takeSection(right, isContactSection);
  const applicant = takeSection(left, isApplicantSection) ?? takeSection(right, isApplicantSection);
  const coApp = takeSection(left, isCoApplicantSection) ?? takeSection(right, isCoApplicantSection);
  const insured = takeSection(left, isInsuredSection) ?? takeSection(right, isInsuredSection);
  const mailing = takeSection(left, isMailingSection) ?? takeSection(right, isMailingSection);
  const details = takeSection(left, isDetailsSection) ?? takeSection(right, isDetailsSection);
  return {
    columns: [
      {
        ...(layout.columns[0] ?? { id: "left", sections: [] }),
        sections: [contact, applicant, ...left, insured].filter((section): section is LayoutSection =>
          Boolean(section),
        ),
      },
      {
        ...(layout.columns[1] ?? { id: "right", sections: [] }),
        sections: [coApp, mailing, ...right, details].filter((section): section is LayoutSection =>
          Boolean(section),
        ),
      },
    ],
  };
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
            if (catIdx >= 0) nextKeys.splice(typeIdx + 1, 0, key);
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
    needsDealApplicantKeys(layout) ||
    needsDealContactIdentity(layout) ||
    needsDealInsuredExtras(layout) ||
    needsExistingCoApplicantKeys(layout) ||
    needsPersonalColumnSplit(layout)
  );
}

export function migrateDealLayoutParity(layout: FieldLayout): FieldLayout {
  return ensurePersonalColumnSplit(
    ensureExistingCoApplicantKeys(
      ensureDealInsuredExtras(
        ensureDealContactIdentity(
          ensureDealApplicantKeys(ensureDealInsuranceFields(ensureMailingAddressParity(layout))),
        ),
      ),
    ),
  );
}
