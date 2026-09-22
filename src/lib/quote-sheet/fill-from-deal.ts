import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import { firstFilled, type LeadCopyFields } from "@/lib/desk/copy-once";
import { fieldIsBlank } from "@/lib/quote-sheet/apply";
import { isLockedSheetField } from "@/lib/lifecycle/quote-sheet";
import { isCoApplicantEnabled } from "@/lib/custom-fields/co-applicant-fields";
import {
  EDUCATION_LEVEL_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  OCCUPATION_OPTIONS,
} from "@/lib/quote-sheet/applicant-core";
import { INDUSTRY_OPTIONS } from "@/lib/custom-fields/industry-occupation";
import {
  clearDriver1Relationship,
  mapHouseholdIntoDrivers,
} from "@/lib/quote-sheet/household-to-drivers";
import {
  AUTO_DRIVER_RELATIONSHIP_OPTIONS,
  LICENSE_STATUS_OPTIONS,
  normalizeGender,
  normalizeHealthPlanType,
  normalizeLicenseStatus,
  normalizeLifeProductType,
  normalizePicklistOption,
} from "@/lib/quote-sheet/sheet-defaults";
import {
  COMMERCIAL_SHARED_DEAL_DETAIL_KEYS,
  coverageLinesValueForDeal,
  storedValueForCommercialDealKey,
} from "./commercial-risk-profile";
import { collapseAutoDriverSheet } from "./auto-driver-dedupe";
import {
  mailingSheetLine,
  propertyOneLiner,
  resolveHomeRiskAddresses,
} from "./home-address-fill";
import {
  DRIVER_BLOCK_FIELDS,
  PERSONAL_DRIVER_CAP,
  unitHasValue,
} from "./repeatable-units";
import {
  dealPolicyFormIsMho,
  MHO_PRIOR_RESIDENCE_SHEET_KEYS,
  mhoDetailSheetWrites,
  mhoYes,
} from "@/lib/custom-fields/mho-details-fields";
import { SHEET_DEFAULT_SOURCE_LABEL } from "@/lib/quote-sheet/sheet-defaults";

export const DEAL_DETAILS_SOURCE_LABEL = "deal details";

/** Prefer desk-friendly M/D/YYYY when Deal Details stores ISO / Date-ish DOB. */
export function formatDobForSheet(raw?: string | null): string {
  const text = (raw ?? "").trim();
  if (!text) return "";
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const y = iso[1];
    const m = String(Number(iso[2]));
    const d = String(Number(iso[3]));
    return `${m}/${d}/${y}`;
  }
  return text;
}

export type DealSheetCopyParty = {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  mailingAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
};

export type DealSheetCopyInput = {
  primaryNamedInsured?: string | null;
  secondaryNamedInsured?: string | null;
  propertyOneliner?: string | null;
  currentCarrier?: string | null;
  coverageAmount?: number | null;
  /** Deal quoting form / policy subtype (HO3, DP3, …) — cascade owns this, not the sheet. */
  quotingForm?: string | null;
  policySubType?: string | null;
  /** Deal custom-field bag (layout Details: applicant + co-applicant + addresses). */
  stored?: Record<string, string>;
  risk?: {
    address1?: string | null;
    city?: string | null;
    county?: string | null;
    state?: string | null;
    zip?: string | null;
  } | null;
  contact?: DealSheetCopyParty | null;
  lead?: LeadCopyFields | null;
  shopProducts?: readonly string[] | null;
  quotingLine?: string | null;
};

export type DealSheetCopyResult = {
  values: Record<string, QuoteSheetFieldValue>;
  filledKeys: string[];
  skippedKeys: string[];
};

function personName(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

const DRIVER_SEED_SUFFIXES = [
  "name",
  "dob",
  "gender",
  "industry",
  "occupation",
  "education_level",
  "marital_status",
  "relationship",
  "license",
  "status",
  "years_licensed",
  "household_status",
  "exclude_reason",
  "age_first_licensed",
  "suspension_5yr",
] as const;

type DriverSeedSuffix = (typeof DRIVER_SEED_SUFFIXES)[number];

type DriverPersonSeed = Record<DriverSeedSuffix, string>;

const DRIVER_SUFFIX_SET = new Set(DRIVER_BLOCK_FIELDS.map((field) => field.suffix));

function driverPersonHasAny(person: DriverPersonSeed): boolean {
  return DRIVER_SEED_SUFFIXES.some((suffix) => person[suffix]);
}

function pickDriverOption(raw: string | null | undefined, options: readonly string[]): string {
  return normalizePicklistOption(raw, options);
}

function pickDriverGender(raw?: string | null): string {
  return normalizeGender(raw);
}

function pickDriverLicenseStatus(raw?: string | null): string {
  const normalized = normalizeLicenseStatus(raw);
  return pickDriverOption(normalized, LICENSE_STATUS_OPTIONS);
}

function pickDriverRelationship(raw?: string | null): string {
  return pickDriverOption(raw, AUTO_DRIVER_RELATIONSHIP_OPTIONS);
}

/** Personal Auto Risk Profile only — never invent driver slots on Home/Flood/Life/Health. */
export function isPersonalAutoDriverSheet(
  values: Record<string, QuoteSheetFieldValue>,
  quotingLine?: string | null,
): boolean {
  const line = (quotingLine ?? "").trim();
  if (line && line !== "auto") return false;
  return Object.prototype.hasOwnProperty.call(values, "driver_1_name");
}

function nextEmptyDriverSlot(
  values: Record<string, QuoteSheetFieldValue>,
  startIndex: number,
): number | null {
  for (let index = startIndex; index <= PERSONAL_DRIVER_CAP; index += 1) {
    if (!unitHasValue(values, "driver", index)) return index;
  }
  return null;
}

function readIndexedCoApplicant(
  stored: Record<string, string>,
  index: number,
): DriverPersonSeed {
  const prefix = `co_applicant_${index}_`;
  return {
    name: firstFilled(
      stored[`${prefix}name`],
      personName([stored[`${prefix}first_name`], stored[`${prefix}middle_name`], stored[`${prefix}last_name`]]),
    ),
    dob: formatDobForSheet(
      firstFilled(stored[`${prefix}dob`], stored[`${prefix}date_of_birth`]),
    ),
    gender: pickDriverGender(firstFilled(stored[`${prefix}gender`])),
    industry: pickDriverOption(firstFilled(stored[`${prefix}industry`]), INDUSTRY_OPTIONS),
    occupation: pickDriverOption(firstFilled(stored[`${prefix}occupation`]), OCCUPATION_OPTIONS),
    education_level: pickDriverOption(
      firstFilled(stored[`${prefix}education_level`]),
      EDUCATION_LEVEL_OPTIONS,
    ),
    marital_status: pickDriverOption(
      firstFilled(stored[`${prefix}marital_status`]),
      MARITAL_STATUS_OPTIONS,
    ),
    relationship: pickDriverRelationship(
      firstFilled(stored[`${prefix}relationship_to_insured`], stored[`${prefix}relationship`]),
    ),
    license: firstFilled(
      stored[`${prefix}license`],
      stored[`${prefix}license_number`],
      stored[`${prefix}dl`],
    ),
    status: pickDriverLicenseStatus(
      firstFilled(stored[`${prefix}license_status`], stored[`${prefix}status`]),
    ),
    years_licensed: firstFilled(stored[`${prefix}years_licensed`]),
    household_status: firstFilled(stored[`${prefix}household_status`]),
    exclude_reason: firstFilled(stored[`${prefix}exclude_reason`]),
    age_first_licensed: firstFilled(stored[`${prefix}age_first_licensed`]),
    suspension_5yr: firstFilled(stored[`${prefix}suspension_5yr`]),
  };
}

/** Deal Details supports one co-applicant today; also reads co_applicant_2_* … if present. */
export function collectDealCoApplicantDrivers(
  input: DealSheetCopyInput,
  stored: Record<string, string>,
): DriverPersonSeed[] {
  if (!isCoApplicantEnabled(stored)) return [];
  const people: DriverPersonSeed[] = [];
  const primaryCo: DriverPersonSeed = {
    name: firstFilled(
      input.secondaryNamedInsured,
      stored.co_applicant_name,
      stored.secondary_named_insured,
      personName([
        stored.co_applicant_first_name,
        stored.co_applicant_middle_name,
        stored.co_applicant_last_name,
      ]),
    ),
    dob: formatDobForSheet(
      firstFilled(
        stored.co_applicant_dob,
        stored.co_applicant_date_of_birth,
        stored.secondary_dob,
        stored.secondary_date_of_birth,
        stored.spouse_dob,
        stored.spouse_date_of_birth,
      ),
    ),
    gender: pickDriverGender(firstFilled(stored.co_applicant_gender, stored.spouse_gender)),
    industry: pickDriverOption(
      firstFilled(stored.co_applicant_industry, stored.spouse_industry),
      INDUSTRY_OPTIONS,
    ),
    occupation: pickDriverOption(
      firstFilled(stored.co_applicant_occupation, stored.spouse_occupation),
      OCCUPATION_OPTIONS,
    ),
    education_level: pickDriverOption(
      firstFilled(stored.co_applicant_education_level, stored.spouse_education_level),
      EDUCATION_LEVEL_OPTIONS,
    ),
    marital_status: pickDriverOption(
      firstFilled(stored.co_applicant_marital_status, stored.spouse_marital_status),
      MARITAL_STATUS_OPTIONS,
    ),
    relationship: pickDriverRelationship(
      firstFilled(
        stored.co_applicant_relationship_to_insured,
        stored.co_applicant_relationship,
        stored.relationship_to_insured,
      ),
    ),
    license: firstFilled(
      stored.co_applicant_license,
      stored.co_applicant_license_number,
      stored.co_applicant_dl,
      stored.spouse_license,
    ),
    status: pickDriverLicenseStatus(
      firstFilled(stored.co_applicant_license_status, stored.spouse_license_status),
    ),
    years_licensed: firstFilled(stored.co_applicant_years_licensed, stored.spouse_years_licensed),
    household_status: firstFilled(stored.co_applicant_household_status),
    exclude_reason: firstFilled(stored.co_applicant_exclude_reason),
    age_first_licensed: firstFilled(stored.co_applicant_age_first_licensed),
    suspension_5yr: firstFilled(stored.co_applicant_suspension_5yr),
  };
  if (driverPersonHasAny(primaryCo)) people.push(primaryCo);

  for (let index = 2; index <= PERSONAL_DRIVER_CAP; index += 1) {
    const extra = readIndexedCoApplicant(stored, index);
    if (driverPersonHasAny(extra)) people.push(extra);
  }
  return people;
}

/**
 * Copy Deal Details (layout) onto the master sheet — FIRST Fill step.
 * Reads applicant + co-applicant + addresses from the deal field bag, then contact/lead/risk fallbacks.
 * Leaves cells as CHECK (never auto-confirm). Never overwrites agent|confirmed|javy cells.
 */
export function fillSheetFromDealDetails(
  input: DealSheetCopyInput,
  existing: Record<string, QuoteSheetFieldValue> = {},
): DealSheetCopyResult {
  const values: Record<string, QuoteSheetFieldValue> = { ...existing };
  const filledKeys: string[] = [];
  const skippedKeys: string[] = [];
  const stored = input.stored ?? {};
  const contact = input.contact;
  const lead = input.lead;
  const risk = input.risk;

  const put = (key: string, raw?: string | null) => {
    const value = (raw ?? "").trim();
    if (!value) return;
    // Life / Health Risk Profile has no identity cells — do not invent applicant/contact keys.
    if (Object.keys(existing).length > 0 && !Object.prototype.hasOwnProperty.call(existing, key)) {
      return;
    }
    const current = values[key];
    if (isLockedSheetField(current) || !fieldIsBlank(current)) {
      skippedKeys.push(key);
      return;
    }
    values[key] = {
      value,
      status: "check",
      source: "agent",
      sourceLabel: DEAL_DETAILS_SOURCE_LABEL,
    };
    filledKeys.push(key);
  };

  /** Replace blank cells and starter defaults. Leave agent-confirmed and extracted cells. */
  const putOverDefault = (key: string, raw?: string | null) => {
    const value = (raw ?? "").trim();
    if (!value) return;
    if (Object.keys(existing).length > 0 && !Object.prototype.hasOwnProperty.call(existing, key)) {
      return;
    }
    const current = values[key];
    const starter = (current?.sourceLabel ?? "").trim().toLowerCase() === SHEET_DEFAULT_SOURCE_LABEL;
    if (!starter && (isLockedSheetField(current) || !fieldIsBlank(current))) {
      if (!skippedKeys.includes(key)) skippedKeys.push(key);
      return;
    }
    values[key] = {
      value,
      status: "check",
      source: "agent",
      sourceLabel: DEAL_DETAILS_SOURCE_LABEL,
    };
    const skipAt = skippedKeys.lastIndexOf(key);
    if (skipAt >= 0) skippedKeys.splice(skipAt, 1);
    if (!filledKeys.includes(key)) filledKeys.push(key);
  };

  const clearDealCopiedCell = (key: string) => {
    const current = values[key];
    if (!current) return;
    if ((current.sourceLabel ?? "") !== DEAL_DETAILS_SOURCE_LABEL) return;
    if (fieldIsBlank(current)) return;
    values[key] = {
      value: "",
      status: "missing",
      source: "blank",
      sourceLabel: "",
    };
  };

  const named = firstFilled(
    input.primaryNamedInsured,
    stored.named_insured,
    personName([contact?.firstName, contact?.middleName, contact?.lastName]),
    personName([stored.first_name, stored.middle_name, stored.last_name]),
    personName([lead?.firstName, lead?.middleName, lead?.lastName]),
  );
  put("named_insured", named);
  put("applicant_name", named);
  const coEnabled = isCoApplicantEnabled(stored);
  put(
    "secondary_named_insured",
    firstFilled(
      input.secondaryNamedInsured,
      stored.secondary_named_insured,
      coEnabled
        ? personName([stored.co_applicant_first_name, stored.co_applicant_last_name])
        : "",
    ),
  );

  const primaryDob = formatDobForSheet(
    firstFilled(
      stored.date_of_birth,
      stored.dob,
      stored.applicant_dob,
      contact?.dateOfBirth,
      lead?.dateOfBirth,
    ),
  );
  put("applicant_dob", primaryDob);
  put("driver_1_dob", primaryDob);
  put("driver_1_name", named);

  const gender = firstFilled(stored.applicant_gender, stored.gender, stored.sex);
  put("applicant_gender", gender);
  put("driver_1_gender", gender);

  const industry = firstFilled(stored.applicant_industry, stored.industry);
  put("applicant_industry", industry);
  put("driver_1_industry", pickDriverOption(industry, INDUSTRY_OPTIONS) || industry);

  const occupation = firstFilled(stored.applicant_occupation, stored.occupation);
  put("applicant_occupation", occupation);
  put("driver_1_occupation", pickDriverOption(occupation, OCCUPATION_OPTIONS) || occupation);

  const maritalStatus = firstFilled(stored.applicant_marital_status, stored.marital_status);
  const educationLevel = firstFilled(
    stored.applicant_education_level,
    stored.education_level,
    stored.education,
  );
  put("applicant_marital_status", maritalStatus);
  put("applicant_education_level", educationLevel);
  put("driver_1_marital_status", pickDriverOption(maritalStatus, MARITAL_STATUS_OPTIONS) || maritalStatus);
  put(
    "driver_1_education_level",
    pickDriverOption(educationLevel, EDUCATION_LEVEL_OPTIONS) || educationLevel,
  );
  put(
    "driver_1_license",
    firstFilled(stored.driver_license, stored.license_number, stored.license),
  );
  put(
    "driver_1_status",
    pickDriverLicenseStatus(firstFilled(stored.driver_license_status, stored.license_status)),
  );
  put(
    "driver_1_years_licensed",
    firstFilled(stored.years_licensed, stored.driver_years_licensed),
  );
  put("entity_type", firstFilled(stored.entity_type));
  const commercialSheet = Object.prototype.hasOwnProperty.call(values, "coverage_lines");
  if (commercialSheet) {
    // Shared/general Risk Profile reuses Deal Details keys so Fill / COI / policy
    // transfer lands on the same cells. Owner contact stays off this sheet.
    for (const key of COMMERCIAL_SHARED_DEAL_DETAIL_KEYS) {
      put(key, storedValueForCommercialDealKey(stored, key));
    }
    put("square_feet", firstFilled(stored.square_feet, stored.square_footage, stored.sqft));
    put("construction", firstFilled(stored.construction, stored.construction_type));
    put("own_rent", firstFilled(stored.own_rent, stored.premises_owned));
    put("central_alarm", firstFilled(stored.central_alarm, stored.alarm));
    put("vehicle_usage", firstFilled(stored.vehicle_usage, stored.primary_use));
    put("claims_5yr", firstFilled(stored.claims_5yr, stored.claims_last_5_years));
    put(
      "coverage_lines",
      firstFilled(
        stored.coverage_lines,
        coverageLinesValueForDeal({
          line: input.quotingLine,
          products: input.shopProducts,
        }),
      ),
    );
    put("premises_same_as_business", firstFilled(stored.premises_same_as_business, "Yes"));
  }

  // Quoting form lives on the insurance cascade — do not copy onto the master sheet.
  // Life/Health product + plan family are sheet interviewing fields aligned to that subtype.
  if (Object.prototype.hasOwnProperty.call(values, "product_type")) {
    const raw = firstFilled(stored.product_type, input.policySubType, input.quotingForm);
    put("product_type", normalizeLifeProductType(raw) || raw);
  }
  if (Object.prototype.hasOwnProperty.call(values, "plan_type")) {
    const raw = firstFilled(stored.plan_type, input.policySubType, input.quotingForm);
    put("plan_type", normalizeHealthPlanType(raw) || raw);
  }
  put("lease_term", firstFilled(stored.lease_term));
  put("tenant_name", firstFilled(stored.tenant_name));
  put("landlord_liability", firstFilled(stored.landlord_liability));
  put("loss_of_rents", firstFilled(stored.loss_of_rents));
  put("animals", firstFilled(stored.animals));
  put("primary_heat", firstFilled(stored.primary_heat));
  put("business_on_premises", firstFilled(stored.business_on_premises));
  put("insurance_score_range", firstFilled(stored.insurance_score_range, stored.assumed_credit_rating));
  put("months_occupied", firstFilled(stored.months_occupied));
  put("resided_under_2_years", firstFilled(stored.resided_under_2_years));
  put("new_purchase", firstFilled(stored.new_purchase));
  put("purchase_date", firstFilled(stored.purchase_date));
  put("within_city_limits", firstFilled(stored.within_city_limits, stored.city_limits));
  put("sale_price", firstFilled(stored.sale_price, stored.purchase_price));
  put("screen_enclosure", firstFilled(stored.screen_enclosure));
  put("aaa_member", firstFilled(stored.aaa_member, stored.aaa));
  put("passive_restraints", firstFilled(stored.passive_restraints));
  put("prior_address", firstFilled(stored.prior_address, stored.previous_address));

  put("applicant_phone", firstFilled(stored.phone, contact?.phone, lead?.phone));
  put("applicant_email", firstFilled(stored.email, contact?.email, lead?.email));

  // Co-applicant — only when Deal Details switch is On (default Off if all blank).
  if (coEnabled) {
    const coName = firstFilled(
      input.secondaryNamedInsured,
      stored.co_applicant_name,
      stored.secondary_named_insured,
      personName([stored.co_applicant_first_name, stored.co_applicant_last_name]),
    );
    put("co_applicant_name", coName);

    const coDob = formatDobForSheet(
      firstFilled(
        stored.co_applicant_dob,
        stored.co_applicant_date_of_birth,
        stored.secondary_dob,
        stored.secondary_date_of_birth,
        stored.spouse_dob,
        stored.spouse_date_of_birth,
      ),
    );
    put("co_applicant_dob", coDob);
    put(
      "co_applicant_email",
      firstFilled(stored.co_applicant_email, stored.secondary_email, stored.spouse_email),
    );
    put(
      "co_applicant_phone",
      firstFilled(stored.co_applicant_phone, stored.secondary_phone, stored.spouse_phone),
    );
    put(
      "co_applicant_relationship_to_insured",
      firstFilled(
        stored.co_applicant_relationship_to_insured,
        stored.co_applicant_relationship,
        stored.relationship_to_insured,
      ),
    );
    put(
      "co_applicant_marital_status",
      firstFilled(stored.co_applicant_marital_status, stored.spouse_marital_status),
    );
    put(
      "co_applicant_industry",
      firstFilled(stored.co_applicant_industry, stored.spouse_industry),
    );
    put(
      "co_applicant_occupation",
      firstFilled(stored.co_applicant_occupation, stored.spouse_occupation),
    );
    put(
      "co_applicant_gender",
      firstFilled(stored.co_applicant_gender, stored.spouse_gender),
    );
    put(
      "co_applicant_education_level",
      firstFilled(stored.co_applicant_education_level, stored.spouse_education_level),
    );
  }

  // Personal Auto: primary is Driver 1; each Deal Details co-applicant seeds the next empty driver slot.
  if (isPersonalAutoDriverSheet(values, input.quotingLine)) {
    const migrated = mapHouseholdIntoDrivers(values);
    Object.assign(values, migrated.values);
    filledKeys.push(...migrated.filledKeys);
    skippedKeys.push(...migrated.skippedKeys);
    Object.assign(values, clearDriver1Relationship(values));

    const putDriver = (index: number, suffix: DriverSeedSuffix, raw?: string | null) => {
      if (index < 1 || index > PERSONAL_DRIVER_CAP) return;
      if (suffix === "relationship" && index === 1) return;
      if (!DRIVER_SUFFIX_SET.has(suffix)) return;
      const key = `driver_${index}_${suffix}`;
      const value = (raw ?? "").trim();
      if (!value) return;
      const current = values[key];
      if (isLockedSheetField(current) || !fieldIsBlank(current)) {
        skippedKeys.push(key);
        return;
      }
      values[key] = {
        value,
        status: "check",
        source: "agent",
        sourceLabel: DEAL_DETAILS_SOURCE_LABEL,
      };
      filledKeys.push(key);
    };

    let searchFrom = 2;
    for (const person of collectDealCoApplicantDrivers(input, stored)) {
      const slot = nextEmptyDriverSlot(values, searchFrom);
      if (slot == null) break;
      for (const suffix of DRIVER_SEED_SUFFIXES) {
        if (suffix === "relationship" && slot === 1) continue;
        putDriver(slot, suffix, person[suffix]);
      }
      searchFrom = slot + 1;
    }

    const collapsed = collapseAutoDriverSheet(values);
    for (const [key, cell] of Object.entries(collapsed)) {
      if (key.startsWith("driver_")) values[key] = cell;
    }
    for (let index = filledKeys.length - 1; index >= 0; index -= 1) {
      const key = filledKeys[index];
      if (key.startsWith("driver_") && !(values[key]?.value ?? "").trim()) {
        filledKeys.splice(index, 1);
      }
    }
  }

  // Home / MHO / HO3 / Flood: property address is the API location.
  // Mailing stays blank unless Deal Details has a different mailing street.
  // Commercial keeps the shared mailing_address copy above (business address).
  const homePropertySheet =
    !commercialSheet && Object.prototype.hasOwnProperty.call(values, "address1");
  if (homePropertySheet) {
    const resolved = resolveHomeRiskAddresses({
      propertyOneliner: input.propertyOneliner,
      stored,
      risk,
      contact,
      lead,
    });
    put("address1", resolved.property.street);
    put("city", resolved.property.city);
    put("state", resolved.property.state);
    put("zip", resolved.property.zip);
    put("county", resolved.property.county);
    put("property_address", propertyOneLiner(resolved.property));
    if (resolved.mailingReason === "distinct") {
      put("mailing_address", mailingSheetLine(resolved.mailing, resolved.property));
      put("mailing_city", resolved.mailing.city);
      put("mailing_state", resolved.mailing.state);
      put("mailing_zip", resolved.mailing.zip);
    }
    if (
      dealPolicyFormIsMho(
        input.quotingForm,
        input.policySubType,
        stored.insurance_subtype,
        stored.quoting_form,
      )
    ) {
      for (const write of mhoDetailSheetWrites(stored)) {
        putOverDefault(write.sheetKey, write.value);
      }
      if (!mhoYes(stored.resided_under_2_years)) {
        for (const key of MHO_PRIOR_RESIDENCE_SHEET_KEYS) clearDealCopiedCell(key);
      }
    }
  } else {
    const insuredStreet = firstFilled(
      risk?.address1,
      stored.mailing_address,
      (input.propertyOneliner ?? "").split("·")[0],
    );
    const insuredCity = firstFilled(risk?.city, stored.city, contact?.city, lead?.city);
    const insuredState = firstFilled(risk?.state, stored.state, contact?.state, lead?.state);
    const insuredZip = firstFilled(risk?.zip, stored.zip, contact?.zip, lead?.zip);

    put("address1", insuredStreet);
    put("city", insuredCity);
    put("state", insuredState);
    put("zip", insuredZip);
    put("county", risk?.county);

    const mailStreet = firstFilled(
      stored.contact_mailing_address,
      stored.mailing_address,
      contact?.mailingAddress,
      lead?.mailingAddress,
      insuredStreet,
    );
    const mailCity = firstFilled(
      stored.contact_mailing_city,
      contact?.city,
      lead?.city,
      insuredCity,
    );
    const mailState = firstFilled(
      stored.contact_mailing_state,
      contact?.state,
      lead?.state,
      insuredState,
    );
    const mailZip = firstFilled(
      stored.contact_mailing_zip,
      contact?.zip,
      lead?.zip,
      insuredZip,
    );

    put("mailing_address", mailStreet);
    put("applicant_address", mailStreet);
    put("mailing_city", mailCity);
    put("mailing_state", mailState);
    put("mailing_zip", mailZip);
  }

  put("current_carrier", firstFilled(input.currentCarrier, stored.current_carrier));

  if (input.coverageAmount != null && Number.isFinite(input.coverageAmount) && input.coverageAmount > 0) {
    put("coverage_a", String(Math.round(input.coverageAmount)));
  }

  return { values, filledKeys, skippedKeys };
}
