import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import { firstFilled, type LeadCopyFields } from "@/lib/desk/copy-once";
import { fieldIsBlank } from "@/lib/quote-sheet/apply";
import { isLockedSheetField } from "@/lib/lifecycle/quote-sheet";
import { isCoApplicantEnabled } from "@/lib/custom-fields/co-applicant-fields";
import { normalizeHealthPlanType, normalizeLifeProductType } from "@/lib/quote-sheet/sheet-defaults";
import { coverageLinesValueForDeal } from "./commercial-risk-profile";

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

  const occupation = firstFilled(stored.applicant_occupation, stored.occupation);
  put("applicant_occupation", occupation);
  put("driver_1_occupation", occupation);

  put(
    "applicant_employment",
    firstFilled(stored.applicant_employment, stored.employment, stored.employment_status),
  );
  put(
    "applicant_marital_status",
    firstFilled(stored.applicant_marital_status, stored.marital_status),
  );
  put(
    "applicant_education_level",
    firstFilled(stored.applicant_education_level, stored.education_level, stored.education),
  );
  put("entity_type", firstFilled(stored.entity_type));
  const commercialSheet = Object.prototype.hasOwnProperty.call(values, "coverage_lines");
  if (commercialSheet) {
    // Identity stays on Deal Details (business_name / ein / operations). Risk Profile
    // only copies existing sheet keys — annual_sales, employees, square_feet, construction.
    put("annual_sales", firstFilled(stored.annual_sales, stored.annual_revenue, stored.sales));
    put("employees", firstFilled(stored.employee_count, stored.employees));
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
  put("insurance_score_range", firstFilled(stored.insurance_score_range));
  put("months_occupied", firstFilled(stored.months_occupied));
  put("resided_under_2_years", firstFilled(stored.resided_under_2_years));

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
      "co_applicant_occupation",
      firstFilled(stored.co_applicant_occupation, stored.spouse_occupation),
    );
    put(
      "co_applicant_gender",
      firstFilled(stored.co_applicant_gender, stored.spouse_gender),
    );
    put(
      "co_applicant_employment",
      firstFilled(stored.co_applicant_employment, stored.spouse_employment),
    );
    put(
      "co_applicant_education_level",
      firstFilled(stored.co_applicant_education_level, stored.spouse_education_level),
    );
  }

  // Insured / property address (risk + deal insured fields)
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

  // Mailing / applicant address — contact_mailing_* preferred, else insured
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
  // Some sheets use discrete mailing city/state/zip — only fill if those keys exist blank later via put
  put("mailing_city", mailCity);
  put("mailing_state", mailState);
  put("mailing_zip", mailZip);

  put("current_carrier", firstFilled(input.currentCarrier, stored.current_carrier));

  if (input.coverageAmount != null && Number.isFinite(input.coverageAmount) && input.coverageAmount > 0) {
    put("coverage_a", String(Math.round(input.coverageAmount)));
  }

  return { values, filledKeys, skippedKeys };
}
