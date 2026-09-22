/**
 * Travelers Automobile Policy Declarations as Gemini often returns them:
 * header nested under policy_information, term premium under premiums,
 * and a later page repeating Full Term Premium. Values are the labels
 * printed on that kind of page — not a live Domenic file.
 */
export const TRAVELERS_ISSUED_AUTO_NESTED = {
  document_kind: "not_declaration",
  named_insured: "Domenic Iori",
  company: "Travelers",
  policy_information: {
    policy_number: "612345678 101 1",
    policy_effective_date: "September 21, 2026",
    policy_expiration_date: "March 21, 2027",
  },
  premiums: {
    bodily_injury: "412.00",
    premium_due: "$2,109.00",
  },
  coverages: {
    bodily_injury: "100/300",
    property_damage: "100000",
  },
  pages: [
    { named_insured: "Domenic Iori" },
    { full_term_premium: "$2,109.00" },
  ],
} as const;

/** Clock printed before each date, the way a Travelers policy period header reads. */
export const TRAVELERS_POLICY_PERIOD_WITH_CLOCK =
  "From: 12:01 A.M. September 21, 2026 To: 12:01 A.M. March 21, 2027";

/** Coverage schedule: line premiums plus a Total row. Not a premiums object. */
export const TRAVELERS_COVERAGE_SCHEDULE = {
  writing_company: "The Standard Fire Insurance Company",
  policy_number: "612345678 101 1",
  policy_period: TRAVELERS_POLICY_PERIOD_WITH_CLOCK,
  coverages: [
    { name: "Bodily Injury", limit: "100/300", premium: "412.00" },
    { name: "Property Damage", limit: "100000", premium: "189.00" },
    { description: "Total Premium", premium: "$2,109.00" },
  ],
} as const;

/** Item Two holds the dates. Item Three spells the premium out as a sentence label. */
export const TRAVELERS_ITEM_BLOCKS = {
  named_insured: "Domenic Iori",
  policy_number: "612345678 101 1",
  item_two: {
    from: "12:01 A.M. September 21, 2026",
    to: "12:01 A.M. March 21, 2027",
  },
  item_three: {
    the_premium_for_this_policy_is: "$2,109.00",
  },
} as const;

/** Whole declarations block nested, with a 6 Month Premium key Gemini often emits. */
export const TRAVELERS_DECLARATIONS_ENVELOPE = {
  document_kind: "declaration",
  automobile_policy_declarations: {
    policy_number: "612345678 101 1",
    policy_period_from: "12:01 A.M. September 21, 2026",
    policy_period_to: "12:01 A.M. March 21, 2027",
    "6_month_premium": "$2,109.00",
    company: "Travelers",
  },
} as const;

/** Two vehicles, each with its own total, and no policy-level premium key. */
export const TRAVELERS_VEHICLE_TOTALS = {
  policy_number: "612345678 101 1",
  effective_date: "09/21/2026",
  expiration_date: "03/21/2027",
  vehicles: [
    { vin: "4T1B11HK5KU123456", total_premium: "1200.00" },
    { vin: "2HKRM4H75GH123456", total_premium: "909.00" },
  ],
} as const;
