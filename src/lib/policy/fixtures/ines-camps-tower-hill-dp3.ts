/**
 * Golden extract for Ines Camps / Tower Hill DP-3 W030046073.
 * Ground truth: Basic Policy Coverages + Breakdown of Premium
 * (1340 Dozier Ave, Titusville, FL 32780, 07/14/2026–07/14/2027).
 * Fees, surcharges, and credits are omitted on purpose.
 */
export const INES_CAMPS_TOWER_HILL_DP3_EXTRACT = {
  form: "DP-3",
  current_carrier: "Tower Hill",
  policy_number: "W030046073",
  property_address: "1340 DOZIER AVE, TITUSVILLE, FL 32780",
  effective_date: "07/14/2026",
  expiration_date: "07/14/2027",
  premium: "2286.96",
  coverage_a: "292037",
  coverage_a_fire_premium: "402.00",
  coverage_a_extended_premium: "487.00",
  coverage_a_hurricane_premium: "1849.00",
  coverage_a_premium: "2738.00",
  coverage_b: "0",
  coverage_b_premium: "Included",
  coverage_c: "0",
  coverage_c_premium: "0.00",
  coverage_d: "29204",
  coverage_d_premium: "Included",
  coverage_e: "0",
  coverage_e_premium: "Included",
  coverage_l: "100000",
  coverage_l_premium: "60.00",
  coverage_m: "1000",
  coverage_m_premium: "Included",
  catastrophic_ground_cover_collapse: "Included",
  limited_fungi_liability: "50000",
  limited_fungi_liability_premium: "Included",
  limited_fungi: "10000/10000",
  limited_fungi_premium: "Included",
  rental_to_others_short_term: "Included",
  replacement_cost_buy_back: "Included",
  sinkhole_exclusion: "Included",
  water_damage_exclusion: "Included",
} as const;

/**
 * Synthetic rating page. The attached coverages page has no dwelling/rating block.
 * These cues lock the multi-page writer; they are not transcribed from that page.
 */
export const INES_CAMPS_TOWER_HILL_DP3_RATING = {
  construction_type: "Masonry",
  year_built: "1978",
  occupied_by: "Tenant",
  usage_type: "Rental",
  protection_class: "4",
  bceg_grade: "Ungraded",
  number_of_families: "1",
  sprinkler: "None",
  fire_alarm: "None",
  roof_year: "2016",
  roof_material: "Shingle",
  roof_shape: "Gable",
  opening_protection: "None",
} as const;
