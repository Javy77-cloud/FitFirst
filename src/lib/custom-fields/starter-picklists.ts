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
import { INDUSTRY_OPTIONS } from "./industry-occupation";
import { LIFE_MEDICAL_CONDITION_OPTIONS } from "@/lib/life/conditions";

export const STARTER_PICKLIST_US_STATES = "US states";
export const STARTER_PICKLIST_LINES = "Lines of business";
export const STARTER_PICKLIST_CARRIERS = "Common carriers";
export const STARTER_PICKLIST_LEAD_CADENCE = "Lead cadence";
export const STARTER_PICKLIST_OCCUPATIONS = "Occupations";
export const STARTER_PICKLIST_INDUSTRIES = "Industries";
export const STARTER_PICKLIST_RECENT_LIFE_EVENTS = "Recent Life Events";
export const STARTER_PICKLIST_POLICY_SUBTYPES = "Policy subtypes";
export const STARTER_PICKLIST_CROSS_SELL = "Cross-Selling Opportunities";
export const STARTER_PICKLIST_LEAD_SOURCE = "Lead Source";
export const STARTER_PICKLIST_MARITAL_STATUS = "Marital Status";
export const STARTER_PICKLIST_EDUCATION = "Education Level";
export const STARTER_PICKLIST_EMPLOYMENT = "Employment Status";
export const STARTER_PICKLIST_CONTACT_METHOD = "Preferred Contact Method";
export const STARTER_PICKLIST_CONTACT_TIME = "Preferred Contact Time";
export const STARTER_PICKLIST_DEAL_NOTICES = "Deal notices";
export const STARTER_PICKLIST_DEAL_NOTICES_PC = "Deal notices · P&C";
export const STARTER_PICKLIST_DEAL_NOTICES_LIFE = "Deal notices · Life";
export const STARTER_PICKLIST_DEAL_NOTICES_HEALTH = "Deal notices · Health";
export const STARTER_PICKLIST_LIFE_MEDICAL = "Life medical conditions";
export const STARTER_PICKLIST_NAMES = [
  STARTER_PICKLIST_US_STATES,
  STARTER_PICKLIST_LINES,
  STARTER_PICKLIST_CARRIERS,
  STARTER_PICKLIST_LEAD_CADENCE,
  STARTER_PICKLIST_OCCUPATIONS,
  STARTER_PICKLIST_INDUSTRIES,
  STARTER_PICKLIST_RECENT_LIFE_EVENTS,
  STARTER_PICKLIST_POLICY_SUBTYPES,
  STARTER_PICKLIST_CROSS_SELL,
  STARTER_PICKLIST_LEAD_SOURCE,
  STARTER_PICKLIST_MARITAL_STATUS,
  STARTER_PICKLIST_EDUCATION,
  STARTER_PICKLIST_EMPLOYMENT,
  STARTER_PICKLIST_CONTACT_METHOD,
  STARTER_PICKLIST_CONTACT_TIME,
  STARTER_PICKLIST_DEAL_NOTICES,
  STARTER_PICKLIST_DEAL_NOTICES_PC,
  STARTER_PICKLIST_DEAL_NOTICES_LIFE,
  STARTER_PICKLIST_DEAL_NOTICES_HEALTH,
  STARTER_PICKLIST_LIFE_MEDICAL,
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
  seedKey: string;
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

export const STARTER_PICKLIST_SEED_KEY = {
  usStates: "us_states",
  lines: "lines_of_business",
  carriers: "common_carriers",
  leadCadence: "lead_cadence",
  occupations: "occupations",
  industries: "industries",
  recentLifeEvents: "recent_life_events",
  policySubtypes: "policy_subtypes",
  crossSell: "cross_selling_opportunities",
  leadSource: "lead_source",
  maritalStatus: "marital_status",
  education: "education_level",
  employment: "employment_status",
  contactMethod: "preferred_contact_method",
  contactTime: "preferred_contact_time",
  dealNotices: "deal_notices",
  dealNoticesPc: "deal_notices_pc",
  dealNoticesLife: "deal_notices_life",
  dealNoticesHealth: "deal_notices_health",
  lifeMedical: "life_medical_conditions",
} as const;

export const STARTER_FIELD_PICKLISTS: StarterFieldPicklist[] = [
  { seedKey: STARTER_PICKLIST_SEED_KEY.usStates, name: STARTER_PICKLIST_US_STATES, options: US_STATE_OPTIONS },
  { seedKey: STARTER_PICKLIST_SEED_KEY.lines, name: STARTER_PICKLIST_LINES, options: LINE_OF_BUSINESS_OPTIONS },
  { seedKey: STARTER_PICKLIST_SEED_KEY.carriers, name: STARTER_PICKLIST_CARRIERS, options: COMMON_CARRIER_OPTIONS },
  { seedKey: STARTER_PICKLIST_SEED_KEY.leadCadence, name: STARTER_PICKLIST_LEAD_CADENCE, options: LEAD_CADENCE_PICKLIST_OPTIONS },
  { seedKey: STARTER_PICKLIST_SEED_KEY.occupations, name: STARTER_PICKLIST_OCCUPATIONS, options: [...OCCUPATION_OPTIONS] },
  { seedKey: STARTER_PICKLIST_SEED_KEY.industries, name: STARTER_PICKLIST_INDUSTRIES, options: [...INDUSTRY_OPTIONS] },
  { seedKey: STARTER_PICKLIST_SEED_KEY.recentLifeEvents, name: STARTER_PICKLIST_RECENT_LIFE_EVENTS, options: [...CONTACT_RECENT_LIFE_EVENT_OPTIONS] },
  { seedKey: STARTER_PICKLIST_SEED_KEY.policySubtypes, name: STARTER_PICKLIST_POLICY_SUBTYPES, options: [...POLICY_SUB_TYPES] },
  { seedKey: STARTER_PICKLIST_SEED_KEY.crossSell, name: STARTER_PICKLIST_CROSS_SELL, options: [...CONTACT_CROSS_SELL_OPTIONS] },
  { seedKey: STARTER_PICKLIST_SEED_KEY.leadSource, name: STARTER_PICKLIST_LEAD_SOURCE, options: [...LEAD_SOURCES] },
  {
    seedKey: STARTER_PICKLIST_SEED_KEY.maritalStatus,
    name: STARTER_PICKLIST_MARITAL_STATUS,
    options: Array.from(
      new Set([...MARITAL_STATUS_OPTIONS, ...CONTACT_MARITAL_OPTIONS]),
    ),
  },
  { seedKey: STARTER_PICKLIST_SEED_KEY.education, name: STARTER_PICKLIST_EDUCATION, options: [...CONTACT_EDUCATION_OPTIONS] },
  { seedKey: STARTER_PICKLIST_SEED_KEY.employment, name: STARTER_PICKLIST_EMPLOYMENT, options: [...CONTACT_EMPLOYMENT_OPTIONS] },
  { seedKey: STARTER_PICKLIST_SEED_KEY.contactMethod, name: STARTER_PICKLIST_CONTACT_METHOD, options: [...CONTACT_METHOD_OPTIONS] },
  { seedKey: STARTER_PICKLIST_SEED_KEY.contactTime, name: STARTER_PICKLIST_CONTACT_TIME, options: [...CONTACT_TIME_OPTIONS] },
  {
    seedKey: STARTER_PICKLIST_SEED_KEY.dealNotices,
    name: STARTER_PICKLIST_DEAL_NOTICES,
    options: ["Inspection before bind", "Check mortgagee payment"],
  },
  {
    seedKey: STARTER_PICKLIST_SEED_KEY.dealNoticesPc,
    name: STARTER_PICKLIST_DEAL_NOTICES_PC,
    options: ["Inspection before bind", "Check mortgagee payment"],
  },
  {
    seedKey: STARTER_PICKLIST_SEED_KEY.dealNoticesLife,
    name: STARTER_PICKLIST_DEAL_NOTICES_LIFE,
    options: [],
  },
  {
    seedKey: STARTER_PICKLIST_SEED_KEY.dealNoticesHealth,
    name: STARTER_PICKLIST_DEAL_NOTICES_HEALTH,
    options: [],
  },
  {
    seedKey: STARTER_PICKLIST_SEED_KEY.lifeMedical,
    name: STARTER_PICKLIST_LIFE_MEDICAL,
    options: [...LIFE_MEDICAL_CONDITION_OPTIONS],
  },
];

export function starterPicklistByName(name: string): StarterFieldPicklist | undefined {
  return STARTER_FIELD_PICKLISTS.find((list) => list.name.toLowerCase() === name.trim().toLowerCase());
}

export function starterPicklistBySeedKey(seedKey: string | null | undefined): StarterFieldPicklist | undefined {
  if (!seedKey) return undefined;
  return STARTER_FIELD_PICKLISTS.find((list) => list.seedKey === seedKey);
}

export function matchStarterList<T extends { name: string; seedKey?: string | null }>(
  lists: readonly T[],
  starter: Pick<StarterFieldPicklist, "name" | "seedKey">,
): T | undefined {
  return (
    lists.find((list) => list.seedKey && list.seedKey === starter.seedKey) ??
    lists.find((list) => list.name.trim().toLowerCase() === starter.name.toLowerCase())
  );
}

export function missingStarterPicklists(
  existing: ReadonlyArray<{ name: string; seedKey?: string | null }>,
): StarterFieldPicklist[] {
  return STARTER_FIELD_PICKLISTS.filter((starter) => !matchStarterList(existing, starter));
}

export function missingStarterPicklistNames(existingNames: string[]): string[] {
  return missingStarterPicklists(existingNames.map((name) => ({ name }))).map((list) => list.name);
}
