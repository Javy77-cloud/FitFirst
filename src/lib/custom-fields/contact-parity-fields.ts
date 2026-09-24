import {
  CONTACT_METHOD_OPTIONS,
  CONTACT_SPOUSE_LINK_OPTIONS,
  CONTACT_TIME_OPTIONS,
} from "@/lib/contacts/contact-field-catalog";
import { LEAD_SOURCES } from "@/lib/crm/sources";
import type { CustomFieldDef, FieldLayout, LayoutSection } from "./types";
import { allLayoutFieldKeys } from "./types";

/**
 * Contact Details v4 person fields that Deal (and Lead) must carry so
 * lead→deal→bind→contact copies without retyping.
 *
 * Gender stays canonical as `applicant_gender` on Deal/Lead (Applicant stack);
 * DEAL_TO_CONTACT_FIELD_MAP maps it onto Contact `gender`.
 *
 * DL keys belong on Auto product catalog only — see AUTO_DL_FIELDS.
 * Spouse name + DOB + link stay consecutive so section packing keeps one
 * three-equal-cell row (never span-2 the name over the link).
 */
export const CONTACT_PARITY_CRM_FIELDS: CustomFieldDef[] = [
  { key: "nickname", label: "Nickname", type: "single_line" },
  { key: "secondary_phone", label: "Secondary phone", type: "phone" },
  { key: "spouse_name", label: "Spouse name", type: "single_line" },
  { key: "spouse_dob", label: "Spouse date of birth", type: "dob" },
  {
    key: "spouse_link",
    label: "Link spouse contact",
    type: "picklist",
    options: [...CONTACT_SPOUSE_LINK_OPTIONS],
  },
  /** Same JSON-list shape as Contact Details dependents (not Health headcount). */
  { key: "dependents", label: "Dependents", type: "multi_line" },
  { key: "campaign_tag", label: "Campaign / Tag", type: "single_line" },
  {
    key: "source",
    label: "Lead source",
    type: "picklist",
    options: [...LEAD_SOURCES],
    systemKey: "source",
  },
  { key: "referral", label: "Referred by", type: "single_line" },
  {
    key: "preferred_contact_method",
    label: "Preferred contact method",
    type: "picklist",
    options: [...CONTACT_METHOD_OPTIONS],
  },
  {
    key: "preferred_contact_time",
    label: "Preferred contact time",
    type: "picklist",
    options: [...CONTACT_TIME_OPTIONS],
  },
];

/** Auto-only driver's license CRM fields — never on HO/Flood/etc. Deal Details. */
export const AUTO_DL_FIELDS: CustomFieldDef[] = [
  { key: "dl_state", label: "DL state", type: "single_line" },
  { key: "drivers_license_number", label: "Driver's license #", type: "single_line" },
  { key: "dl_expiration", label: "DL expiration", type: "single_line" },
];

export const CONTACT_PARITY_SECTION_FIELD_KEYS = [
  "nickname",
  "secondary_phone",
  "preferred_contact_method",
  "preferred_contact_time",
  "spouse_name",
  "spouse_dob",
  "spouse_link",
  "dependents",
] as const;

export const CONTACT_PARITY_INTAKE_FIELD_KEYS = [
  "source",
  "referral",
  "campaign_tag",
] as const;

export const CONTACT_PARITY_CUSTOM_KEYS = [
  ...CONTACT_PARITY_SECTION_FIELD_KEYS,
  ...CONTACT_PARITY_INTAKE_FIELD_KEYS,
] as const;

export function contactParityPersonSection(): LayoutSection {
  return {
    id: "prefs",
    label: "Preferences",
    fieldKeys: [...CONTACT_PARITY_SECTION_FIELD_KEYS],
  };
}

export function contactParityIntakeSection(): LayoutSection {
  return {
    id: "intake",
    label: "Intake",
    fieldKeys: [...CONTACT_PARITY_INTAKE_FIELD_KEYS],
  };
}

function layoutHasParitySections(layout: FieldLayout): boolean {
  const keys = new Set(allLayoutFieldKeys(layout));
  const sections = layout.columns.flatMap((column) => column.sections);
  const hasPrefs = sections.some((section) => section.id === "prefs");
  const hasIntake = sections.some((section) => section.id === "intake");
  if (!hasPrefs || !hasIntake) return false;
  for (const key of CONTACT_PARITY_CUSTOM_KEYS) {
    if (!keys.has(key)) return false;
  }
  // Spouse trio must stay consecutive inside prefs for three-equal-cell packing.
  const prefs = sections.find((section) => section.id === "prefs");
  if (!prefs) return false;
  const joined = prefs.fieldKeys.join(",");
  return joined.includes("spouse_name,spouse_dob,spouse_link");
}

export function needsContactParityDealLayout(layout: FieldLayout): boolean {
  return !layoutHasParitySections(layout);
}

/** Inject Preferences + Intake (Contact v4 parity) onto saved Deal layouts. */
export function ensureContactParityDealLayout(layout: FieldLayout): FieldLayout {
  if (!needsContactParityDealLayout(layout)) return layout;

  const prefs = contactParityPersonSection();
  const intake = contactParityIntakeSection();

  return {
    ...layout,
    columns: layout.columns.map((column, index) => {
      // Prefer right column (index 1); fall back to sole column.
      const isTarget =
        layout.columns.length === 1 ? index === 0 : column.id === "right" || index === 1;
      if (!isTarget) return column;

      const sections = [...column.sections];
      const prefsAt = sections.findIndex((section) => section.id === "prefs");
      const intakeAt = sections.findIndex((section) => section.id === "intake");
      const pipelineAt = sections.findIndex(
        (section) => section.id === "pipeline" || section.id === "insurance_quote",
      );

      if (prefsAt >= 0) {
        const existing = sections[prefsAt]!;
        const keys = [...existing.fieldKeys];
        for (const key of CONTACT_PARITY_SECTION_FIELD_KEYS) {
          if (!keys.includes(key)) keys.push(key);
        }
        // Keep spouse trio consecutive.
        for (const key of ["spouse_name", "spouse_dob", "spouse_link"] as const) {
          const at = keys.indexOf(key);
          if (at >= 0) keys.splice(at, 1);
        }
        const insertAt = (() => {
          const timeAt = keys.indexOf("preferred_contact_time");
          if (timeAt >= 0) return timeAt + 1;
          const methodAt = keys.indexOf("preferred_contact_method");
          if (methodAt >= 0) return methodAt + 1;
          return keys.length;
        })();
        keys.splice(insertAt, 0, "spouse_name", "spouse_dob", "spouse_link");
        sections[prefsAt] = { ...existing, fieldKeys: keys };
      } else if (pipelineAt >= 0) {
        sections.splice(pipelineAt, 0, prefs);
      } else {
        sections.push(prefs);
      }

      if (intakeAt >= 0) {
        const existing = sections[intakeAt]!;
        const keys = [...existing.fieldKeys];
        for (const key of CONTACT_PARITY_INTAKE_FIELD_KEYS) {
          if (!keys.includes(key)) keys.push(key);
        }
        sections[intakeAt] = { ...existing, fieldKeys: keys };
      } else {
        const prefsNow = sections.findIndex((section) => section.id === "prefs");
        const pipeNow = sections.findIndex(
          (section) => section.id === "pipeline" || section.id === "insurance_quote",
        );
        const at = pipeNow >= 0 ? pipeNow : prefsNow >= 0 ? prefsNow + 1 : sections.length;
        sections.splice(at, 0, intake);
      }

      return { ...column, sections };
    }),
  };
}
