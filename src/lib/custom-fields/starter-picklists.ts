import { DEAL_TITLE_LOB_WORDS } from "@/lib/deals/deal-title";
import { DEAL_LINE_OPTIONS } from "@/lib/deals/deal-line";

export const STARTER_PICKLIST_US_STATES = "US states";
export const STARTER_PICKLIST_LINES = "Lines of business";
export const STARTER_PICKLIST_CARRIERS = "Common carriers";
export const STARTER_PICKLIST_NAMES = [
  STARTER_PICKLIST_US_STATES,
  STARTER_PICKLIST_LINES,
  STARTER_PICKLIST_CARRIERS,
] as const;

/** 50 states + DC. Code first so a State field can store FL. */
export const US_STATE_OPTIONS: string[] = [
  "AL — Alabama",
  "AK — Alaska",
  "AZ — Arizona",
  "AR — Arkansas",
  "CA — California",
  "CO — Colorado",
  "CT — Connecticut",
  "DE — Delaware",
  "DC — District of Columbia",
  "FL — Florida",
  "GA — Georgia",
  "HI — Hawaii",
  "ID — Idaho",
  "IL — Illinois",
  "IN — Indiana",
  "IA — Iowa",
  "KS — Kansas",
  "KY — Kentucky",
  "LA — Louisiana",
  "ME — Maine",
  "MD — Maryland",
  "MA — Massachusetts",
  "MI — Michigan",
  "MN — Minnesota",
  "MS — Mississippi",
  "MO — Missouri",
  "MT — Montana",
  "NE — Nebraska",
  "NV — Nevada",
  "NH — New Hampshire",
  "NJ — New Jersey",
  "NM — New Mexico",
  "NY — New York",
  "NC — North Carolina",
  "ND — North Dakota",
  "OH — Ohio",
  "OK — Oklahoma",
  "OR — Oregon",
  "PA — Pennsylvania",
  "RI — Rhode Island",
  "SC — South Carolina",
  "SD — South Dakota",
  "TN — Tennessee",
  "TX — Texas",
  "UT — Utah",
  "VT — Vermont",
  "VA — Virginia",
  "WA — Washington",
  "WV — West Virginia",
  "WI — Wisconsin",
  "WY — Wyoming",
];

export const LINE_OF_BUSINESS_OPTIONS: string[] = [
  ...new Set([
    ...Object.values(DEAL_TITLE_LOB_WORDS),
    ...DEAL_LINE_OPTIONS.map((row) => row.label),
  ]),
];

/** Desk + common personal-lines paper. Not a live appointment list. */
export const COMMON_CARRIER_OPTIONS: string[] = [
  "American Integrity",
  "Allstate",
  "Benchmark",
  "Citizens",
  "Farmers",
  "Florida Peninsula",
  "Geico",
  "GeoVera",
  "Hadron",
  "Hartford",
  "Heritage",
  "Kin",
  "Liberty Mutual",
  "Nationwide",
  "Progressive",
  "QBE",
  "SageSure",
  "Security First",
  "Slide",
  "State Farm",
  "Tailrow",
  "Tower Hill",
  "Travelers",
  "TypTap",
  "Universal",
  "USAA",
  "VAVE",
  "VYRD",
];

export type StarterFieldPicklist = {
  name: string;
  options: string[];
};

export const STARTER_FIELD_PICKLISTS: StarterFieldPicklist[] = [
  { name: STARTER_PICKLIST_US_STATES, options: US_STATE_OPTIONS },
  { name: STARTER_PICKLIST_LINES, options: LINE_OF_BUSINESS_OPTIONS },
  { name: STARTER_PICKLIST_CARRIERS, options: COMMON_CARRIER_OPTIONS },
];

export function starterPicklistByName(name: string): StarterFieldPicklist | undefined {
  return STARTER_FIELD_PICKLISTS.find((list) => list.name.toLowerCase() === name.trim().toLowerCase());
}

export function missingStarterPicklistNames(existingNames: string[]): string[] {
  const have = new Set(existingNames.map((name) => name.trim().toLowerCase()));
  return STARTER_FIELD_PICKLISTS.filter((list) => !have.has(list.name.toLowerCase())).map((list) => list.name);
}
