export const CARRIER_SEGMENTS = [
  "national",
  "regional",
  "fl_property",
  "e_and_s",
  "specialty",
  "life",
  "health",
] as const;
export type CarrierSegment = (typeof CARRIER_SEGMENTS)[number];

export const CAT_POSTURES = ["open", "selective", "restricted", "closed_new_biz"] as const;
export type CatPosture = (typeof CAT_POSTURES)[number];

export const QUOTE_GATE_STATUSES = ["Quote", "Maybe", "Skip-Decline"] as const;
export type QuoteGateStatus = (typeof QUOTE_GATE_STATUSES)[number];

export type WindMit = "none" | "poor" | "partial" | "full";
export type CoastTier = 1 | 2 | 3 | "inland";
export type ConstructionQuality = "poor" | "average" | "strong";

export type AutoFlags = {
  dui: boolean;
  sr22: boolean;
  lapse: boolean;
  tickets: boolean;
  accidents: boolean;
};

/**
 * Fields the quote-gate evaluates. Wire extras from the real master sheet later —
 * the evaluator is implemented against this snapshot so it is testable now.
 */
export type MasterRiskSnapshot = {
  state: string | null;
  /** HO3 | HO6 | DP1 | DP3 | COLLECTOR_AUTO | NONSTANDARD_PAP | … */
  line: string;
  occupancy: string | null;
  roofAgeYears: number | null;
  /** TODO: wire to roof cert / 4-point / wind-mit form on the master sheet. */
  roofCertified: boolean | null;
  yearBuilt: number | null;
  /** TODO: wire to opening_protection / wind_mit_form. */
  windMit: WindMit | null;
  /** TODO: wire to miles_to_coast / territory / CAT tier. */
  coastTier: CoastTier | null;
  milesToCoast: number | null;
  /** TODO: wire to construction quality / 4-point result. */
  constructionQuality: ConstructionQuality | null;
  construction: string | null;
  isMobile: boolean;
  isManufactured: boolean;
  isVacant: boolean;
  isCollectorAuto: boolean;
  isDailyDriver: boolean | null;
  /** TODO: wire to collector-auto garage / storage question. */
  secureStorage: boolean | null;
  autoFlags: AutoFlags;
  admittedDeclinedCount: number;
  admittedMarketOpen: boolean | null;
  /** TODO: wire to Kin / modeled CAT pass on the master sheet. */
  modeledCatPass: boolean | null;
  /** TODO: wire to TypTap flood/wind-only vs HO3 need. */
  windFloodNeedMismatch: boolean | null;
  isPreferredStandardHome: boolean | null;
  isStandardPreferredNewConstruction: boolean | null;
  isInland: boolean | null;
  isPreferredAutoProfile: boolean | null;
  dirtyMvr: boolean | null;
  dealId?: string | null;
  riskId?: string | null;
  masterId?: string | null;
};

export type AppetiteCarrier = {
  carrierId: string;
  legalName: string;
  segment: CarrierSegment | string;
  linesOffered: string[];
  linesNotOffered: string[];
  statesAvailable: string[];
  statesRestricted: string[];
  statesRaw: string[];
  portalName: string | null;
  csPhone: string | null;
  claimsPhone: string | null;
  rateable: boolean;
  hardDeclines: string[];
  softCautions: string[];
  preferredSignals: string[];
  catPosture: CatPosture | string;
  notesForAgent: string | null;
  quotePriority: number | null;
  flHoOrder: number | null;
  needsStateConfirm: boolean;
  linkedCarrierId?: string | null;
};

export type QuoteGateDecision = {
  carrierId: string;
  legalName: string;
  status: QuoteGateStatus;
  matchingRule: string | null;
  rank: number;
  preferredHit: boolean;
  cautionHit: boolean;
  appointmentGated: boolean;
};

export type QuoteGateResult = {
  decisions: QuoteGateDecision[];
  quote: QuoteGateDecision[];
  maybe: QuoteGateDecision[];
  skipDecline: QuoteGateDecision[];
};

export type QuoteGateOptions = {
  /** Override FL HO slug order (Admin prefs). */
  flHoOrder?: string[] | null;
  /**
   * Agency appointments keyed by appetite slug for this deal's written line.
   * `false` → Skip-Decline `not_appointed` after appetite eligibility.
   * Missing key → do not invent a skip (same as Markets matcher).
   */
  appointedByCarrier?: Record<string, boolean> | null;
  asOfYear?: number;
};
