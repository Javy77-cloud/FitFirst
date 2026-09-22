/**
 * Live Manual file on Domenic Iori Auto: "Adriana Iori DEC Page Travelers.pdf".
 * This is a Travelers Automobile Policy Declarations page. The numbers below are
 * sample labels for that layout — not the production PDF and not a live policy.
 *
 * Gemini often splits the dec across page_1 (declarations header) and a later
 * coverage page. Policy number and the period sit under header.policy_period
 * (Begins / Ends, with 12:01 A.M.). The term premium is a Full Term row or a
 * premium_summary box, not the Bodily Injury line and not a vehicle total.
 * A vehicle row may also carry unit `number` and its own total_premium.
 */

export const ADRIANA_IORI_DEC_PAGE_FILENAME = "Adriana Iori DEC Page Travelers.pdf";

export const ADRIANA_IORI_TRAVELERS_DEC_PAGE = {
  document_kind: "declaration",
  named_insured: "Adriana Iori",
  page_1: {
    header: {
      document_title: "Automobile Policy Declarations",
      writing_company: "Travelers",
      policy_number: "612345678 101 1",
      named_insured: "Adriana Iori",
      policy_period: {
        begins: "12:01 A.M. September 21, 2026",
        ends: "12:01 A.M. March 21, 2027",
      },
    },
    vehicles: [
      {
        number: "1",
        year: "2019",
        make: "TOYOTA",
        model: "CAMRY",
        vin: "4T1B11HK5KU123456",
        total_premium: "1200.00",
      },
    ],
  },
  page_2: {
    coverages_limits_and_premiums: [
      { coverage: "Bodily Injury", limit: "100/300", premium: "412.00" },
      { coverage: "Property Damage", limit: "100000", premium: "189.00" },
      { coverage: "Full Term", premium: "2109.00" },
    ],
  },
} as const;

/** Same header, but the term premium is only a nested full_term box on a later page. */
export const ADRIANA_IORI_TRAVELERS_DEC_PREMIUM_BOX = {
  document_kind: "not_declaration",
  named_insured: "Adriana Iori",
  page_1: {
    header: {
      document_title: "Automobile Policy Declarations",
      writing_company: "Travelers",
      policy_information: {
        policy_number: "612345678 101 1",
        policy_period: {
          begins: "12:01 A.M. September 21, 2026",
          ends: "12:01 A.M. March 21, 2027",
        },
      },
    },
    vehicles: [
      {
        number: "1",
        vin: "4T1B11HK5KU123456",
        total_premium: "1200.00",
      },
    ],
  },
  page_2: {
    coverages_limits_and_premiums: [
      { coverage: "Bodily Injury", limit: "100/300", premium: "412.00" },
      { coverage: "Property Damage", limit: "100000", premium: "189.00" },
    ],
    premium_summary_for_this_policy: {
      full_term: "2109.00",
    },
  },
} as const;
