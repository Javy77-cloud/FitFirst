import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import { firstFilled, type LeadCopyFields } from "@/lib/desk/copy-once";
import { fieldIsBlank } from "@/lib/quote-sheet/apply";
import { isLockedSheetField } from "@/lib/lifecycle/quote-sheet";

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
  /** Deal custom-field bag (first_name, mailing_address, …). */
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
 * Copy deal / contact / risk blanks onto the master sheet.
 * Leaves cells as CHECK (never auto-confirm) so the agent reviews + Confirms.
 * Never overwrites agent|confirmed|javy cells.
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
  put("secondary_named_insured", input.secondaryNamedInsured);

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
  // Auto Drivers block — same named insured DOB from Deal Details.
  put("driver_1_dob", primaryDob);
  put("driver_1_name", named);
  // Gender / occupation — pass through only when already on the deal; leave blank otherwise (Heather).
  const gender = firstFilled(stored.applicant_gender, stored.gender, stored.sex);
  put("applicant_gender", gender);
  put("driver_1_gender", gender);
  const occupation = firstFilled(stored.applicant_occupation, stored.occupation);
  put("applicant_occupation", occupation);
  put("driver_1_occupation", occupation);

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
    "co_applicant_name",
    firstFilled(
      input.secondaryNamedInsured,
      stored.co_applicant_name,
      stored.secondary_named_insured,
      personName([stored.co_applicant_first_name, stored.co_applicant_last_name]),
    ),
  );

  put("applicant_phone", firstFilled(stored.phone, contact?.phone, lead?.phone));
  put("applicant_email", firstFilled(stored.email, contact?.email, lead?.email));

  const mailing = firstFilled(
    stored.mailing_address,
    contact?.mailingAddress,
    lead?.mailingAddress,
  );
  put("mailing_address", mailing);
  put("applicant_address", mailing);

  const mailCity = firstFilled(stored.city, contact?.city, lead?.city);
  const mailState = firstFilled(stored.state, contact?.state, lead?.state);
  const mailZip = firstFilled(stored.zip, contact?.zip, lead?.zip);

  // Property / insured address — risk wins; fall back to deal oneliner street.
  const street =
    firstFilled(risk?.address1, (input.propertyOneliner ?? "").split("·")[0]) || "";
  put("address1", street);
  put("city", firstFilled(risk?.city, mailCity));
  put("state", firstFilled(risk?.state, mailState));
  put("zip", firstFilled(risk?.zip, mailZip));
  put("county", risk?.county);

  put("current_carrier", firstFilled(input.currentCarrier, stored.current_carrier));

  if (input.coverageAmount != null && Number.isFinite(input.coverageAmount) && input.coverageAmount > 0) {
    put("coverage_a", String(Math.round(input.coverageAmount)));
  }

  return { values, filledKeys, skippedKeys };
}
