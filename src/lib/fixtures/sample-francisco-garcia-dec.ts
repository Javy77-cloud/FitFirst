/**
 * Full HO3 declarations transcript — Francisco Garcia / additional Javier Garcia.
 * Used to measure extraction coverage vs the ~12-field miss on a phone-photo dec.
 * Cov A is $280,000 from the dec. Not Ana Dib. Not a Zestimate.
 */
export const FRANCISCO_GARCIA_DEC_FILENAME = "sample-francisco-garcia-dec.txt";

export const FRANCISCO_GARCIA_DEC_TEXT = `HOMEOWNERS DECLARATIONS
Form: HO-3
Company: Citizens Property Insurance
Policy Number: FG-HO3-2026-4411
Named insured: Francisco Garcia
Additional named insured: Javier Garcia
Residence premises: 2140 Tropic Breeze Ave, Melbourne, FL 32935
City: Melbourne
County: Brevard
Policy Period: 03/01/2026 to 03/01/2027
Effective date: 03/01/2026
Expiration date: 03/01/2027
Occupancy: Owner Occupied
Construction: masonry
Year built: 1998
Year of construction: 1998
Stories: 2
Square feet: 2100
Roof year: 2018
Roof covering: shingle
Roof shape: hip
Opening protection: partial
Protection class: 4
Miles to coast: 6
Pool: No
Mobile Home: No
A. Dwelling                         $280,000
B. Other Structures                  $28,000
C. Personal Property                $140,000
D. Loss of Use                       $56,000
E. Personal Liability               $300,000
F. Medical Payments                   $2,000
Hurricane deductible: 2%
AOP deductible: $2,500
Wind/hail deductible: 2%
Annual premium: $4,200
Current carrier: Citizens
Zestimate: $410,000
List price: $399,000
Social Security Number: 123-45-6789
Claim number: CLM-999-2024
Dwelling limit from the dec. Do not use Zillow list price.
`;

/** Sheet keys the first photo-OCR pass typically missed (~12 landed). */
export const DEC_COVERAGE_MISS_KEYS = [
  "named_insured",
  "policy_number",
  "form",
  "effective_date",
  "expiration_date",
  "coverage_b",
  "coverage_c",
  "coverage_d",
  "coverage_e",
  "coverage_f",
  "current_premium",
  "roof_shape",
  "wind_hail_deductible",
] as const;

/** Keys a full Home dec should land on the Quote Sheet after this pass. */
export const DEC_COVERAGE_TARGET_KEYS = [
  "named_insured",
  "address1",
  "city",
  "county",
  "state",
  "zip",
  "current_carrier",
  "policy_number",
  "form",
  "effective_date",
  "expiration_date",
  "occupancy",
  "construction",
  "year_built",
  "stories",
  "square_feet",
  "roof_year",
  "roof_covering",
  "roof_shape",
  "opening_protection",
  "protection_class",
  "miles_to_coast",
  "pool",
  "mobile_home",
  "coverage_a",
  "coverage_b",
  "coverage_c",
  "coverage_d",
  "coverage_e",
  "coverage_f",
  "hurricane_deductible",
  "aop_deductible",
  "wind_hail_deductible",
  "current_premium",
] as const;
