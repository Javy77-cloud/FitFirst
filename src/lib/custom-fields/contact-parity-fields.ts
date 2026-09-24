import {
  CONTACT_METHOD_OPTIONS,
  CONTACT_TIME_OPTIONS,
} from "@/lib/contacts/contact-field-catalog";
import { LEAD_SOURCES } from "@/lib/crm/sources";
import type { CustomFieldDef, LayoutSection } from "./types";

/**
 * Contact Details v4 person fields that Deal (and Lead) must carry so
 * lead→deal→bind→contact copies without retyping.
 *
 * Gender stays canonical as `applicant_gender` on Deal/Lead (Applicant stack);
 * DEAL_TO_CONTACT_FIELD_MAP maps it onto Contact `gender`.
 *
 * DL keys belong on Auto product layout only — see AUTO_DL_FIELDS.
 */
export const CONTACT_PARITY_CRM_FIELDS: CustomFieldDef[] = [
  { key: "nickname", label: "Nickname", type: "single_line" },
  { key: "secondary_phone", label: "Secondary phone", type: "phone" },
  { key: "spouse_name", label: "Spouse name", type: "single_line" },
  { key: "spouse_dob", label: "Spouse date of birth", type: "dob" },
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
