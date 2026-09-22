/**
 * Published carrier appetite used by Markets (appetite_rules) and the quote-gate catalog.
 * Add new carriers here — do not hardcode Trident-only checks in the matcher.
 */
export type PublishedHoAppetite = {
  slug: string;
  legalName: string;
  aliases: string[];
  /** Homeowners form (HO3, HO6, …). */
  line: string;
  state: string;
  minCovA: number | null;
  maxCovA: number | null;
  /** Rolling dwelling-age cap from the QRG ("40 yrs & newer"). */
  maxDwellingAgeYears: number | null;
  /** Fixed year for Markets `min_year_built` (QRG as-of year minus max dwelling age). */
  minYearBuilt: number | null;
  minMilesToCoast: number | null;
  maxRoofAge: number | null;
  allowedRoofCoverings: string[] | null;
  mobileAllowed: boolean;
  placement: string;
  csPhone: string | null;
  supportEmail: string | null;
  website: string;
  hardDeclines: string[];
  softCautions: string[];
  preferredSignals: string[];
  notesForAgent: string;
  /** DP-3 bind cap when the bulletin publishes a separate landlord TIV. */
  dpMaxCovA?: number | null;
  agentPortalUrl?: string | null;
  bulletinDate?: string | null;
};

/** Trident Reciprocal Exchange HO-3 Quick Reference Guide. */
export const TRIDENT_QRG_VERSION = "06122026";
export const TRIDENT_QRG_AS_OF_YEAR = 2026;

export const TRIDENT_HO_NOTES =
  "NOW COVERING WIND DRIVEN RAIN. FL HO-3 via QuoteRUSH (www.tridentreciprocal.com). Contact (877)368-9144 / support@tridentreciprocal.com. Coverage A $300,000-$5,000,000 (was $400k; effective immediately). Broader Florida HO placement — re-shop risks previously below $400k. Cov B 2/5/10/15% (excl avail); Cov C 25/50/75% (excl avail); Cov D 10% of A; Liability 100/300/400/500k; Med Pay 2/3/4/5k. Deductibles: AOP 1k/2.5k/5k/10k; Hurricane 2/5/10% of A. Eligibility: dwelling 40 yrs & newer; roof Shingle 15 / Tile 20 / Metal 30; flat over living ineligible; flat reinforced concrete requires Cov A $900k+. PC10 ineligible; PC9 UW review. Distance to coast 1/2 mile or greater. Lapse +14 days requires UW review. HWH 15 yrs & newer if inside living (no age if garage/outside). Polybutylene ineligible; PEX no age. Electrical: no Challenger, Sylvania, Zinsco, or single-strand aluminum; multi-strand aluminum UW review. Loss history: <=2 non-hurricane claims in last 5 years, each <=$5k (exceptions available). Discounts: monitored burglar & fire alarm; wind loss mitigation; gated/limited access; HVAC maintenance contract. Enhancements: Ord/Law 10/25/50%; water backup & sump; screen enclosure; animal liability. QRG Version 06122026.";

export const TRIDENT_HO_APPETITE: PublishedHoAppetite = {
  slug: "trident_reciprocal",
  legalName: "Trident Reciprocal Exchange",
  aliases: ["trident reciprocal exchange", "trident reciprocal", "trident"],
  line: "HO3",
  state: "FL",
  minCovA: 300_000,
  maxCovA: 5_000_000,
  maxDwellingAgeYears: 40,
  minYearBuilt: TRIDENT_QRG_AS_OF_YEAR - 40,
  minMilesToCoast: 0.5,
  maxRoofAge: 15,
  allowedRoofCoverings: ["shingle", "tile", "metal"],
  mobileAllowed: false,
  placement: "QuoteRUSH",
  csPhone: "(877)368-9144",
  supportEmail: "support@tridentreciprocal.com",
  website: "https://www.tridentreciprocal.com",
  hardDeclines: [
    "state!=FL",
    "mobile_home",
    "min_cov_a:300000",
    "max_cov_a:5000000",
    "max_dwelling_age:40",
    "min_miles_to_coast:0.5",
    "pc:10",
  ],
  softCautions: ["older_roof", "pc:9"],
  preferredSignals: ["fl_single_family", "quoterush", "wind_mitigation", "newer_construction"],
  notesForAgent: TRIDENT_HO_NOTES,
};

/** Southern Oak Premier HO/DP — Javy bulletin 2026-09-16 + QRGs. */
export const SOUTHERN_OAK_BULLETIN_DATE = "2026-09-16";
export const SOUTHERN_OAK_RATE_EFFECTIVE = "2026-07-15";
export const SOUTHERN_OAK_PREMIER_QRG = "02-2026";
export const SOUTHERN_OAK_DP3_QRG = "02-2026";
export const SOUTHERN_OAK_HO4_QRG = "08-2018 / 2019-0326";
export const SOUTHERN_OAK_WIND_QRG = "07-2022";
export const SOUTHERN_OAK_MIN_YEAR_BUILT = 1950;
export const SOUTHERN_OAK_MAX_TIV = 7_500_000;
export const SOUTHERN_OAK_DP_MAX_COV_A = 1_000_000;
export const SOUTHERN_OAK_FULL_WATER_COUNTIES = 52;
export const SOUTHERN_OAK_AGENT_PORTAL = "https://soi.policyport.com";

export const SOUTHERN_OAK_HO_NOTES =
  "Javy bulletin 2026-09-16: Premier HO-3/HO-6 new rates effective 7/15/2026 (new and renewal — rates live). HO-3 TIV increased to $7.5 million. Age of home expanded to 1950 and newer. Full Water expanded in 52 counties (age of home 11-39). DP-3 Coverage A bind up to $1 million. Portal southernoak.com / soi.policyport.com. CS 1-877-900-3971. Underwriter contacts not yet provided. Premier QRG 02-2026: HO-3 Cov A min $75k (varies by county); listed max $2M with higher TIV per bulletin. HO-6 Cov A $35k-$150k. Roof in good condition; wood shingle, asbestos, elastomeric, Tesla/solar ineligible; 15yr+ roof UW review with 5+ years useful life. Electrical 150A min; no FPE, Zinsco/Sylvania, Challenger, Stab-Lok, fuses, knob-tube, aluminum, or cloth. Plumbing: no galvanized, polybutylene, or cast iron; PEX ineligible if installed before 2010. Water heater 15 years max. HVAC permanently installed. 4-point required on HO-3 over 30 years prior to bind. Risks over 40 years: Limited Water required; ACV/market value under 80% RCE ineligible. Full Water may be requested for ages 11-39 (52 counties per bulletin) with approved plumbing inspection. Loss history: one prior loss in last 5 years excluding Act of God; no liability losses; open claims ineligible. Owner-occupied; no business on premises. DP-3 QRG 02-2026: Cov A $70k-$1M (over $1M needs prior UW); PC10 only if 5 years or newer; not within 300 ft of commercial; 4-point over 30 years. HO-4 Golden Leaf QRG 08-2018 / 2019-0326: renters Cov C $10k-$150k; PC10 ineligible. Wind-Only QRG 07-2022: HW-2 Cov A $25k-$1M; wind-pool eligible area; roof 15+ needs Preferred Roof Cert. Flood endorsement available on all forms.";

export const SOUTHERN_OAK_HO_APPETITE: PublishedHoAppetite = {
  slug: "southern_oak",
  legalName: "Southern Oak Insurance",
  aliases: ["southern oak insurance", "southern oak"],
  line: "HO3",
  state: "FL",
  minCovA: 75_000,
  maxCovA: SOUTHERN_OAK_MAX_TIV,
  maxDwellingAgeYears: null,
  minYearBuilt: SOUTHERN_OAK_MIN_YEAR_BUILT,
  minMilesToCoast: null,
  maxRoofAge: 15,
  allowedRoofCoverings: null,
  mobileAllowed: false,
  placement: "Southern Oak Agent Portal",
  csPhone: "1-877-900-3971",
  supportEmail: null,
  website: "https://www.southernoak.com",
  hardDeclines: ["mobile_home", "max_cov_a:7500000", "min_year_built:1950"],
  softCautions: ["older_roof"],
  preferredSignals: ["se_coastal_ho"],
  notesForAgent: SOUTHERN_OAK_HO_NOTES,
  dpMaxCovA: SOUTHERN_OAK_DP_MAX_COV_A,
  agentPortalUrl: SOUTHERN_OAK_AGENT_PORTAL,
  bulletinDate: SOUTHERN_OAK_BULLETIN_DATE,
};

/** STAND Florida — contacts bulletin 2026-09-16. FL HO only; no invented UW mins. */
export const STAND_BULLETIN_DATE = "2026-09-16";
export const STAND_MAIN_PHONE = "1-888-319-1332";
export const STAND_CLAIMS_PHONE = "833-667-8263";
export const STAND_CLAIMS_EMAIL = "Office@nexteraclaims.com";
export const STAND_UW_EMAIL = "stand_uw@getstandfl.com";
export const STAND_WEBSITE = "https://www.standinsurance.com";

export const STAND_HO_NOTES =
  "STAND Florida contacts (Javy bulletin 2026-09-16). Main 1-888-319-1332 (FNOL / underwriting / service). Claims: report 1-888-319-1332; existing claims Next Era 833-667-8263 (833-OnStand) / Office@nexteraclaims.com. Policy updates stand_uw@getstandfl.com; mitigations florida.mitigations@standinsurance.com; agency services agencyservices@getstandfl.com. Mail PO Box 459000, Sunrise, FL 33345. Fax 1-941-229-6121. CA misdirect warm-transfer 1-415-903-8091. Sales: Mike Killingsworth Head of Sales 863-370-8607 mike@standinsurance.com; Maggie Grignon Account Executive 415-223-0694 maggieg@standinsurance.com. Web standinsurance.com / getstandfl.com. Written lines HO (FL). No UW mins on this contacts sheet.";

export const STAND_HO_APPETITE: PublishedHoAppetite = {
  slug: "stand",
  legalName: "Stand",
  aliases: ["stand insurance", "getstandfl", "stand florida", "stand fl"],
  line: "HO3",
  state: "FL",
  minCovA: null,
  maxCovA: null,
  maxDwellingAgeYears: null,
  minYearBuilt: null,
  minMilesToCoast: null,
  maxRoofAge: null,
  allowedRoofCoverings: null,
  mobileAllowed: false,
  placement: "STAND Florida",
  csPhone: STAND_MAIN_PHONE,
  supportEmail: "agencyservices@getstandfl.com",
  website: STAND_WEBSITE,
  hardDeclines: ["state!=FL", "mobile_home"],
  softCautions: ["older_roof"],
  preferredSignals: ["fl_single_family"],
  notesForAgent: STAND_HO_NOTES,
  bulletinDate: STAND_BULLETIN_DATE,
};

/** Universal Property & Casualty — FL Underwriting Binding Guidelines 05/26/2026. */
export const UNIVERSAL_PC_BULLETIN_DATE = "2026-05-26";
export const UNIVERSAL_PC_MIN_COV_A = 100_000;
export const UNIVERSAL_PC_MAX_COV_A = 1_500_000;
export const UNIVERSAL_PC_TRI_COUNTY_MIN_COV_A = 250_000;

export const UNIVERSAL_PC_HO_NOTES =
  "UPCIC FL Underwriting Binding Guidelines 05/26/2026. 100% RCV must be Cov A on all forms except HO4 and HO8 (HO8 may use 100% ACV when Optional RC Loss Settlement is not selected; properties over 100 years must be ACV). Check Atlas Bridge Check Form Availability for closed zips/territories. No backdated cancellations. Panhandle counties: Bay, Escambia, Okaloosa, Santa Rosa, Walton. HO3 Cov A X-Wind in Windpool / All Wind and Non-Windpool: Broward, Miami-Dade, Palm Beach built 1950+ $250,000-$1,000,000 / $250,000-$1,500,000 (1950-1975 must bind Water Damage Exclusion or Limited Water $10,000; full water available post-bind with acceptable 4-point). All other counties built 1950+ $100,000-$1,000,000 / $100,000-$1,500,000. HO8 all counties built 1900+ $100,000-$1,000,000 / $100,000-$1,500,000. DP1 Panhandle built 2002+ or Tri-County built 1976+ or other counties built 1900+: $100,000-$500,000 / $100,000-$750,000. DP2/DP3 Panhandle 2002+ or Tri-County 1976+ or other counties 1940+: $100,000-$500,000 / $100,000-$750,000. HO4 Cov C $20,000-$300,000 (Cov A N/A; built 1900+). HO6 Cov A $15,000-$1,000,000 (RCE required if A bound below $50k); owner Cov C $20,000-$500,000; tenant Cov C $6,000 min and max. Wind mit: OIR-B1-1802 only. Rev 01/12 acceptable if inspection before 4/1/2026; on/after 4/1/2026 use Rev 04/26. Opening Protection credit only with 1802 in the insured name. Hip roof credit via 4+ color photos confirming 100% hip or an 1802. Age: roof/HVAC/electrical updates within 30 years (not HO4). 4-point if older than 40 years (except HO4/HO6/HO8). No polybutylene or PEX except HO8 and DP1 (PEX ok if built or updated 2010+). ACV roof and/or water limitation may apply for roofs over 20 years. HVAC: no portable space heaters; operable A/C statewide; vented heat except listed south counties. Electrical: 100 amp min; no aluminum branch, cloth, knob-tube, or double-tap (Alumiconn/Copalum ok); no fuses; no FPE/Stab-Lok, Zinsco, Sylvania-Zinsco, Challenger-Zinsco. Ineligible: mobile/trailer, manufactured/modular, dome/unusual, EIFS, pre-existing damage, co-op condos (HO4 ok), commercial (excl home daycare), DIY, builder risk, historic, over sand (HO8 ok), farming/ag, Chinese drywall, over water, open foundation (HO8 and DP1 ok; HO3/DP2/DP3 ok if 2002+ or FEMA Diagram 6). PC 10 not acceptable except HO3 masonry/superior. Vacant/unoccupied and short-term rentals ineligible. Prior sinkhole ever ineligible. Edition 05/26/2026.";

export const UNIVERSAL_PC_HO_APPETITE: PublishedHoAppetite = {
  slug: "universal_pc",
  legalName: "Universal Property & Casualty",
  aliases: ["universal property & casualty", "universal property and casualty", "universal p&c", "universal property"],
  line: "HO3",
  state: "FL",
  minCovA: UNIVERSAL_PC_MIN_COV_A,
  maxCovA: UNIVERSAL_PC_MAX_COV_A,
  maxDwellingAgeYears: null,
  minYearBuilt: null,
  minMilesToCoast: null,
  maxRoofAge: null,
  allowedRoofCoverings: null,
  mobileAllowed: false,
  placement: "Universal Property Agent Portal",
  csPhone: "1-800-425-9113",
  supportEmail: null,
  website: "https://www.universalproperty.com",
  hardDeclines: ["mobile_home", "manufactured", "min_cov_a:100000", "max_cov_a:1500000"],
  softCautions: ["older_roof_no_cert"],
  preferredSignals: ["habitational", "coastal_ho"],
  notesForAgent: UNIVERSAL_PC_HO_NOTES,
  bulletinDate: UNIVERSAL_PC_BULLETIN_DATE,
};

/** Nationwide Powersports (Boat + Motorcycle + RV) NPC-0577FL 02/22. */
export const NATIONWIDE_POWERSPORTS_FORM = "NPC-0577FL (02/22)";
export const NATIONWIDE_POWERSPORTS_PHONE = "1-877-877-7907";
export const NATIONWIDE_POWERSPORTS_EMAIL = "specsvc@nationwide.com";

export const NATIONWIDE_POWERSPORTS_NOTES =
  "Nationwide Powersports (Boat + Motorcycle + RV) NPC-0577FL 02/22 FL. Boat: up to 35 feet, $200,000 value, 20 years old; up to 3 engines (500 hp on 1 / 1,000 hp on 2 / 1,050 hp on 3); top speed 60 mph; up to 9 vessels; high-performance not acceptable; trailers required. Includes Hurricane Haul-Out up to $1,000, fuel spill (up to PD limit), navigation up to 100 miles off US coast, salvage/wreckage removal, one limit for boat/trailer/motor, Vanishing Deductible up to $500. Valuation: Total Loss Replacement first 2 years original owner; Agreed Value boats 15 years old or less; ACV. Eligible boat types: bass, cabin cruiser, freshwater fishing, PWC, pontoon, runabout/deck, sailboat, saltwater fishing, ski/surf. Motorcycle: max insurable value $80,000; gas and electric; up to 9 vehicles on 1 policy; drivers ages 10+ on off-road. Includes guest passenger, collision safety apparel up to $2,000, custom parts/equipment up to $3,000 (comp optional up to $30,000), Vanishing Deductible up to $500. ACV or Agreed Value. Eligible: cruisers, touring, adventure/dual-purpose, sport, scooters/mopeds, autocycles/reverse trikes, custom/limited-edition, ATV/side-by-side, dirt bikes, snowmobiles, e-bikes, golf carts/utility, lawn/garden tractors, personal transporters, motorcycle trailers. RV: motorhomes up to $800,000; travel trailers up to $500,000; no length restrictions; full-timers available; up to 9 vehicles. Powersports Service Center 1-877-877-7907 specsvc@nationwide.com. Acceptability can differ by region/state — confirm Reference Connect. Appetite notes + specialty line tags only; not a boat rater.";

export const NATIONWIDE_NOTES_FOR_AGENT =
  `Multi-line. Listed states only (no invented 50; CA/FL HO not assumed). Confirm current HO footprint. FL HO: specialists outrank. Research-dated 2026-09. ${NATIONWIDE_POWERSPORTS_NOTES}`;

/** Olympus FL HO Multi-peril UW Guidelines / QRG — June 15, 2026 (paired V0426 HTML). */
export const OLYMPUS_UW_GUIDE_DATE = "2026-06-15";
export const OLYMPUS_QRG_LABEL = "V0426";
export const OLYMPUS_MIN_COV_A = 500_000;
export const OLYMPUS_TRI_COUNTY_MIN_COV_A = 1_000_000;
export const OLYMPUS_MAX_COV_A = 5_000_000;
export const OLYMPUS_MAX_TIV = 8_000_000;
export const OLYMPUS_TRI_COUNTY_COUNTIES = ["Broward", "Miami-Dade", "Palm Beach"] as const;
export const OLYMPUS_COUNTY_MIN_COV_A: Record<string, number> = {
  Broward: OLYMPUS_TRI_COUNTY_MIN_COV_A,
  "Miami-Dade": OLYMPUS_TRI_COUNTY_MIN_COV_A,
  "Palm Beach": OLYMPUS_TRI_COUNTY_MIN_COV_A,
};
export const OLYMPUS_EXCLUDED_COUNTIES = ["Monroe"] as const;
export const OLYMPUS_DONT_WRITE =
  "Olympus 06/15/2026 ineligible: vacant/unoccupied, manufactured/modular/mobile/trailer, Monroe with wind, flood zones A/V without separate flood, sinkhole density >30/sq mi, 7,500+ sq ft, EIFS pre-2000, over water, ferry/boat-only access, moratorium, home daycare, wood stove as sole heat, underground fuel tanks, vicious pets/guard dogs/wolf hybrids/>3 dogs/exotics.";

export const OLYMPUS_HO_NOTES =
  "Olympus FL Homeowners Multi-peril General Underwriting Guidelines / QRG June 15, 2026 (image-only PDF; paired Salesforce Homeowners Quick Reference Guide V0426). Eligible limits: Cov A min $500,000 rest of state / $1,000,000 Tri-County; max $5,000,000; TIV max $8,000,000. Quote-gate floors Cov A at $500,000 statewide; Markets raises Broward / Miami-Dade / Palm Beach to $1,000,000. Cov B 2% of dwelling default (0-20% blanket; scheduled up to 70%). Cov C 50% default (0-75%). Cov D 10%. Cov E liability default $300,000 ($100k/$500k/$1M available). Cov F med pay default $1,000 ($5k/$10k/$25k). Insurance to value 100-125% RCE; 20% extended dwelling available (default none). Blanket personal property max $10,000 per item / $100,000 jewelry. AOP deductible min $1,000 ($2.5k/$5k/$10k/$25k/$50k); no special deductible less than AOP. Hurricane 2%/5% within 1,000 feet of coast (1%/3%/4%/10% available). Sinkhole deductible 10%. Occupancy: 1- or 2-family; seasonal/secondary/rentals eligible (rental liability premises-only + surcharge). Incidental business under 2 customer visits per week eligible. Ineligible occupancy: under construction/renovation, vacant/unoccupied, foreclosure/short-sale/as-is, home daycare or assisted living, more than 2 customer visits per week, commercial/retail farming, more than 2 roomers. Applicant: named insured must have insurable interest; refer 2+ non-domestic-partner named insureds, trusts/LLCs (questionnaire), high-profile occupations. Credit score reviewed at new business and at least every second renewal. Refer >1 loss in 3 years, >2 in 5 years, or any claim over $100,000; pattern of frequency/severity/carelessness ineligible; cancel/non-renew last 3 years or lapse refer. Ineligible: arson/fraud/felony, BK/judgments/foreclosure/repossession/liens last 5 years, first-party personal-lines lawsuit not prevailed/settled, distressed purchase, refuse inspection, or fail to provide UW info. Location: refer peak TIV concentration, hydrant >1,000 ft or fire dept >5 miles, acreage >5. Wind within 1,000 ft of coast requires min 5% hurricane deductible. Flood not in base policy; Flood Zones A/V ineligible unless separately flooded. Sinkhole density >30/sq mi ineligible; sinkhole endorsement ineligible if density >3.54/sq mi; prior/current sinkhole on premises not online-bindable. Monroe County ineligible with wind (ex-wind eligible). Over water, ferry/boat-only access, or moratorium ineligible. Construction: manufactured/modular/mobile/trailer ineligible; EIFS if built prior to 2000 ineligible; log homes and unique/obsolete/irreplaceable construction generally ineligible; stilts/piers/pilings prior to 1995 refer; 7,500 sq ft+ ineligible. All dwellings inspected. Roof online bind: architectural shingle 15 / clay-concrete-Spanish tile 25 / standing-seam metal 40; 3-tab, membrane, foam, wood shake not online-bindable; flat refer; 5+ years useful life inspection may substitute. Electrical: 200-amp if built before 1995; no knob-and-tube, aluminum, Zinsco (GTE-Sylvania), FPE, Challenger, Pushmatic, Bulldog, or fuse boxes. Plumbing: PB ineligible pre-1995 (water excl + $10,000 limited-water buyback); galvanized pre-1995 needs plumbing inspection. Water heater: traditional inside/attic 15, outside/garage 20; tankless 20. No wood stove as sole heat; underground fuel tanks ineligible. Unsecured pools ineligible; pool liability needs 4-ft locked fence or screen; diving boards/slides ineligible for pool liability. Pets: vicious/bite history, guard dogs, wolf hybrids, >3 dogs, zoo/exotic ineligible; animal liability not eligible with exotic or bite history. Water exclusion auto-attaches if home over 40 years or PB unless automatic shutoff. Payment: annual 100% before effective, or four-pay 25% at bind+14 days then months 2/5/8. Late pay accepted 1 month past due. Reinstatement >30 days refer; Statement of No Known Losses required. CS 1-800-711-9386.";

export const OLYMPUS_HO_APPETITE: PublishedHoAppetite = {
  slug: "olympus",
  legalName: "Olympus Insurance Company",
  aliases: ["olympus insurance", "olympus"],
  line: "HO3",
  state: "FL",
  minCovA: OLYMPUS_MIN_COV_A,
  maxCovA: OLYMPUS_MAX_COV_A,
  maxDwellingAgeYears: null,
  minYearBuilt: null,
  minMilesToCoast: null,
  maxRoofAge: 15,
  allowedRoofCoverings: ["architectural shingle", "tile", "metal"],
  mobileAllowed: false,
  placement: "Olympus Agent Portal",
  csPhone: "1-800-711-9386",
  supportEmail: null,
  website: "https://www.olympusinsurance.com",
  hardDeclines: [
    "state!=FL",
    "poor_construction",
    "mobile_home",
    "manufactured",
    "vacant",
    "min_cov_a:500000",
    "max_cov_a:5000000",
  ],
  softCautions: ["older_roof"],
  preferredSignals: ["strong_construction", "mitigation_credits"],
  notesForAgent: OLYMPUS_HO_NOTES,
  bulletinDate: OLYMPUS_UW_GUIDE_DATE,
};

/** Apex Star Reciprocal Exchange — FL admitted P&C reciprocal. Contacts only; no invented UW mins. */
export const APEX_STAR_CS_PHONE = "(888) 876-8005";
export const APEX_STAR_SUPPORT_EMAIL = "customerservice@apexstarins.com";
export const APEX_STAR_WEBSITE = "https://apexstarins.com";
export const APEX_STAR_HQ = "6135 W. Sitka St., Tampa, FL 33634";
export const APEX_STAR_NAIC = "17742";
export const APEX_STAR_GROUP = "StarLight Insurance Group";

export const APEX_STAR_HO_NOTES =
  `Apex Star Reciprocal Exchange (aka Apex Star Insurance Exchange). Florida-admitted P&C reciprocal, member of ${APEX_STAR_GROUP} (Tampa). HO-3, DP-3, and commercial property. Contact ${APEX_STAR_SUPPORT_EMAIL} / ${APEX_STAR_CS_PHONE}. Web apexstarins.com. HQ ${APEX_STAR_HQ}. NAIC ${APEX_STAR_NAIC}. No UW mins on this contacts sheet.`;

export const APEX_STAR_CARRIER_INFO =
  "Apex Star Reciprocal Exchange (aka Apex Star Insurance Exchange). Florida-admitted P&C reciprocal. StarLight Insurance Group, Tampa. HO-3 / DP-3 / commercial property. apexstarins.com. customerservice@apexstarins.com / (888) 876-8005.";

/**
 * American Modern — Javy 2026-09-22.
 * Founding line is manufactured / mobile (FitFirst form MHO, all 50 states, no age cap).
 * Desk forms are MHO, DP1, and DP3, shopped on the HO line. Does not write standard HO-3,
 * so this record stays off PUBLISHED_HO_APPETITE (that list is standard homeowners paper).
 * No UW mins until a QRG arrives. Collector vehicles stay in the notes: the desk has no
 * specialty-auto written-line code separate from AUTO.
 */
export const AMERICAN_MODERN_WEBSITE = "https://www.americanmodern.com";

export const AMERICAN_MODERN_HO_NOTES =
  "American Modern. Manufactured and mobile homes are the founding line (HO-7 style, FitFirst form MHO, all 50 states, no age cap). Also writes seasonal and vacation homes, vacant property, rental and landlord dwellings (desk forms DP1 and DP3), and non-standard site-built homes (older / hard-to-place primary). Other personal lines, notes only: collector and classic cars; motorcycles, ATVs, UTVs, snowmobiles, and golf carts; boats, yachts, and personal watercraft; pet insurance; farm and ranch in nine states (state list not on this sheet). Does not write standard personal auto, standard HO-3 homeowners, or life. Web https://www.americanmodern.com. No UW mins sheet yet.";

export const AMERICAN_MODERN_CARRIER_INFO =
  "American Modern. Desk forms MHO, DP1, and DP3. Manufactured and mobile homes in all 50 states, no age cap. Seasonal and vacation homes, vacant property, rental and landlord dwellings, and non-standard site-built homes. Collector and classic cars, motorcycles and off-road vehicles, boats and personal watercraft, pet insurance, and farm and ranch in nine states. Does not write standard personal auto, standard HO-3 homeowners, or life. https://www.americanmodern.com. No UW mins sheet yet.";

export const AMERICAN_MODERN_DONT_WRITE =
  "Does not write standard personal auto, standard HO-3 homeowners, or life.";

export const AMERICAN_MODERN_TERRITORY =
  "Manufactured and mobile: all 50 states, no age cap. Farm and ranch: nine states (list not on this sheet).";

export const AMERICAN_MODERN_HO_APPETITE: PublishedHoAppetite = {
  slug: "american_modern",
  legalName: "American Modern",
  aliases: ["american modern"],
  line: "MHO",
  state: "US",
  minCovA: null,
  maxCovA: null,
  maxDwellingAgeYears: null,
  minYearBuilt: null,
  minMilesToCoast: null,
  maxRoofAge: null,
  allowedRoofCoverings: null,
  mobileAllowed: true,
  placement: "",
  csPhone: null,
  supportEmail: null,
  website: AMERICAN_MODERN_WEBSITE,
  hardDeclines: [],
  softCautions: [],
  preferredSignals: ["manufactured", "mobile_home", "mho"],
  notesForAgent: AMERICAN_MODERN_HO_NOTES,
};

export const APEX_STAR_HO_APPETITE: PublishedHoAppetite = {
  slug: "apex_star",
  legalName: "Apex Star Reciprocal Exchange",
  aliases: [
    "apex star reciprocal exchange",
    "apex star insurance exchange",
    "apex star reciprocal",
    "apex star",
  ],
  line: "HO3",
  state: "FL",
  minCovA: null,
  maxCovA: null,
  maxDwellingAgeYears: null,
  minYearBuilt: null,
  minMilesToCoast: null,
  maxRoofAge: null,
  allowedRoofCoverings: null,
  mobileAllowed: false,
  placement: "Apex Star",
  csPhone: APEX_STAR_CS_PHONE,
  supportEmail: APEX_STAR_SUPPORT_EMAIL,
  website: APEX_STAR_WEBSITE,
  hardDeclines: ["state!=FL", "mobile_home"],
  softCautions: ["older_roof"],
  preferredSignals: ["fl_reciprocal", "fl_single_family"],
  notesForAgent: APEX_STAR_HO_NOTES,
};

export const PUBLISHED_HO_APPETITE: PublishedHoAppetite[] = [
  TRIDENT_HO_APPETITE,
  SOUTHERN_OAK_HO_APPETITE,
  STAND_HO_APPETITE,
  UNIVERSAL_PC_HO_APPETITE,
  OLYMPUS_HO_APPETITE,
  APEX_STAR_HO_APPETITE,
];

export function publishedHoBySlug(slug: string): PublishedHoAppetite | undefined {
  return PUBLISHED_HO_APPETITE.find((row) => row.slug === slug);
}

export function minCovAToken(minCovA: number): string {
  return `min_cov_a:${minCovA}`;
}

export function maxCovAToken(maxCovA: number): string {
  return `max_cov_a:${maxCovA}`;
}

export function maxDwellingAgeToken(years: number): string {
  return `max_dwelling_age:${years}`;
}

export function minMilesToCoastToken(miles: number): string {
  return `min_miles_to_coast:${miles}`;
}

export function minYearBuiltToken(year: number): string {
  return `min_year_built:${year}`;
}

export function protectionClassToken(pc: number): string {
  return `pc:${pc}`;
}

function parsePrefixedNumber(token: string, prefix: string): number | null {
  const match = new RegExp(`^${prefix}:(\\d+(?:\\.\\d+)?)$`, "i").exec(token.trim());
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

export function parseMinCovAToken(token: string): number | null {
  return parsePrefixedNumber(token, "min_cov_a");
}

export function parseMaxCovAToken(token: string): number | null {
  return parsePrefixedNumber(token, "max_cov_a");
}

export function parseMaxDwellingAgeToken(token: string): number | null {
  return parsePrefixedNumber(token, "max_dwelling_age");
}

export function parseMinMilesToCoastToken(token: string): number | null {
  return parsePrefixedNumber(token, "min_miles_to_coast");
}

export function parseMinYearBuiltToken(token: string): number | null {
  return parsePrefixedNumber(token, "min_year_built");
}

export function parseProtectionClassToken(token: string): number | null {
  return parsePrefixedNumber(token, "pc");
}

/** "10", "PC10", "PC 9" → 10 / 9. */
export function parseProtectionClassValue(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const match = String(value).match(/(\d+)/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}
