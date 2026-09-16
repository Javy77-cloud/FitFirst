import { DEAL_TITLE_LOB_WORDS } from "@/lib/deals/deal-title";
import { DEAL_LINE_OPTIONS } from "@/lib/deals/deal-line";
import { OCCUPATION_OPTIONS } from "@/lib/quote-sheet/applicant-core";
import { POLICY_SUB_TYPES } from "@/lib/commissions/zoho-fields";
import {
  CONTACT_CROSS_SELL_OPTIONS,
  CONTACT_EDUCATION_OPTIONS,
  CONTACT_EMPLOYMENT_OPTIONS,
  CONTACT_MARITAL_OPTIONS,
  CONTACT_METHOD_OPTIONS,
  CONTACT_RECENT_LIFE_EVENT_OPTIONS,
  CONTACT_TIME_OPTIONS,
} from "@/lib/contacts/contact-field-catalog";
import { LEAD_SOURCES } from "@/lib/crm/sources";
import { MARITAL_STATUS_OPTIONS } from "@/lib/quote-sheet/applicant-core";

export const STARTER_PICKLIST_US_STATES = "US states";
export const STARTER_PICKLIST_LINES = "Lines of business";
export const STARTER_PICKLIST_CARRIERS = "Common carriers";
export const STARTER_PICKLIST_LEAD_CADENCE = "Lead cadence";
export const STARTER_PICKLIST_OCCUPATIONS = "Occupations";
export const STARTER_PICKLIST_RECENT_LIFE_EVENTS = "Recent Life Events";
export const STARTER_PICKLIST_POLICY_SUBTYPES = "Policy subtypes";
export const STARTER_PICKLIST_CROSS_SELL = "Cross-Selling Opportunities";
export const STARTER_PICKLIST_LEAD_SOURCE = "Lead Source";
export const STARTER_PICKLIST_MARITAL_STATUS = "Marital Status";
export const STARTER_PICKLIST_EDUCATION = "Education Level";
export const STARTER_PICKLIST_EMPLOYMENT = "Employment Status";
export const STARTER_PICKLIST_CONTACT_METHOD = "Preferred Contact Method";
export const STARTER_PICKLIST_CONTACT_TIME = "Preferred Contact Time";
export const STARTER_PICKLIST_NAMES = [
  STARTER_PICKLIST_US_STATES,
  STARTER_PICKLIST_LINES,
  STARTER_PICKLIST_CARRIERS,
  STARTER_PICKLIST_LEAD_CADENCE,
  STARTER_PICKLIST_OCCUPATIONS,
  STARTER_PICKLIST_RECENT_LIFE_EVENTS,
  STARTER_PICKLIST_POLICY_SUBTYPES,
  STARTER_PICKLIST_CROSS_SELL,
  STARTER_PICKLIST_LEAD_SOURCE,
  STARTER_PICKLIST_MARITAL_STATUS,
  STARTER_PICKLIST_EDUCATION,
  STARTER_PICKLIST_EMPLOYMENT,
  STARTER_PICKLIST_CONTACT_METHOD,
  STARTER_PICKLIST_CONTACT_TIME,
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
  "Trident Reciprocal Exchange",
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

export const LEAD_CADENCE_PICKLIST_OPTIONS: string[] = [
  "None",
  "New",
  "Contacted",
  "Warm",
  "Cold",
];

export const STARTER_FIELD_PICKLISTS: StarterFieldPicklist[] = [
  { name: STARTER_PICKLIST_US_STATES, options: US_STATE_OPTIONS },
  { name: STARTER_PICKLIST_LINES, options: LINE_OF_BUSINESS_OPTIONS },
  { name: STARTER_PICKLIST_CARRIERS, options: COMMON_CARRIER_OPTIONS },
  { name: STARTER_PICKLIST_LEAD_CADENCE, options: LEAD_CADENCE_PICKLIST_OPTIONS },
  { name: STARTER_PICKLIST_OCCUPATIONS, options: [...OCCUPATION_OPTIONS] },
  { name: STARTER_PICKLIST_RECENT_LIFE_EVENTS, options: [...CONTACT_RECENT_LIFE_EVENT_OPTIONS] },
  { name: STARTER_PICKLIST_POLICY_SUBTYPES, options: [...POLICY_SUB_TYPES] },
  { name: STARTER_PICKLIST_CROSS_SELL, options: [...CONTACT_CROSS_SELL_OPTIONS] },
  { name: STARTER_PICKLIST_LEAD_SOURCE, options: [...LEAD_SOURCES] },
  {
    name: STARTER_PICKLIST_MARITAL_STATUS,
    options: Array.from(
      new Set([...MARITAL_STATUS_OPTIONS, ...CONTACT_MARITAL_OPTIONS]),
    ),
  },
  { name: STARTER_PICKLIST_EDUCATION, options: [...CONTACT_EDUCATION_OPTIONS] },
  { name: STARTER_PICKLIST_EMPLOYMENT, options: [...CONTACT_EMPLOYMENT_OPTIONS] },
  { name: STARTER_PICKLIST_CONTACT_METHOD, options: [...CONTACT_METHOD_OPTIONS] },
  { name: STARTER_PICKLIST_CONTACT_TIME, options: [...CONTACT_TIME_OPTIONS] },
];

export function starterPicklistByName(name: string): StarterFieldPicklist | undefined {
  return STARTER_FIELD_PICKLISTS.find((list) => list.name.toLowerCase() === name.trim().toLowerCase());
}

export function missingStarterPicklistNames(existingNames: string[]): string[] {
  const have = new Set(existingNames.map((name) => name.trim().toLowerCase()));
  return STARTER_FIELD_PICKLISTS.filter((list) => !have.has(list.name.toLowerCase())).map((list) => list.name);
}
