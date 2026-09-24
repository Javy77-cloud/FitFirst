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
 *
 * The Deal Details "Preferences" card (nickname, phones, spouse, dependents)
 * is retired. Field definitions stay so stored values and lead→deal→contact
 * copy still work. Do not put that card back on a deal layout.
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

export function contactParityIntakeSection(): LayoutSection {
  return {
    id: "intake",
    label: "Intake",
    fieldKeys: [...CONTACT_PARITY_INTAKE_FIELD_KEYS],
  };
}

const PREFERENCE_FIELD_KEYS = new Set<string>(CONTACT_PARITY_SECTION_FIELD_KEYS);

/**
 * Deal Details card the owner retired. True for the stock section (id `prefs`
 * or title Preferences) and for a section whose keys are only that card.
 * Contact and lead layouts must not use this — deal detail only.
 */
export function isDealPreferencesSection(section: {
  id?: string;
  label?: string;
  fieldKeys?: readonly string[];
}): boolean {
  const id = (section.id ?? "").trim().toLowerCase();
  const label = (section.label ?? "").trim().toLowerCase();
  if (id === "prefs" || label === "preferences") return true;
  const keys = section.fieldKeys ?? [];
  if (keys.length === 0) return false;
  return keys.every((key) => PREFERENCE_FIELD_KEYS.has(key));
}

function layoutHasIntake(layout: FieldLayout): boolean {
  const keys = new Set(allLayoutFieldKeys(layout));
  const intake = layout.columns
    .flatMap((column) => column.sections)
    .find((section) => section.id === "intake");
  if (!intake) return false;
  return CONTACT_PARITY_INTAKE_FIELD_KEYS.every((key) => keys.has(key));
}

/** Intake only. A missing Preferences section is intentional and must stay gone. */
export function needsContactParityDealLayout(layout: FieldLayout): boolean {
  return !layoutHasIntake(layout);
}

/**
 * Ensure Intake on saved Deal layouts.
 * Never creates or repairs Preferences — load after Save used to write that
 * card back onto every line of business.
 */
export function ensureContactParityDealLayout(layout: FieldLayout): FieldLayout {
  if (!needsContactParityDealLayout(layout)) return layout;

  const intake = contactParityIntakeSection();

  return {
    ...layout,
    columns: layout.columns.map((column, index) => {
      // Prefer right column (index 1); fall back to sole column.
      const isTarget =
        layout.columns.length === 1 ? index === 0 : column.id === "right" || index === 1;
      if (!isTarget) return column;

      const sections = [...column.sections];
      const intakeAt = sections.findIndex((section) => section.id === "intake");
      const pipelineAt = sections.findIndex(
        (section) => section.id === "pipeline" || section.id === "insurance_quote",
      );

      if (intakeAt >= 0) {
        const existing = sections[intakeAt]!;
        const keys = [...existing.fieldKeys];
        for (const key of CONTACT_PARITY_INTAKE_FIELD_KEYS) {
          if (!keys.includes(key)) keys.push(key);
        }
        sections[intakeAt] = { ...existing, fieldKeys: keys };
      } else {
        const at = pipelineAt >= 0 ? pipelineAt : sections.length;
        sections.splice(at, 0, intake);
      }

      return { ...column, sections };
    }),
  };
}
