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
