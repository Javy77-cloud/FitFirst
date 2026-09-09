import type { StandingRuleInput } from "./types";

/**
 * Conservative FL HO Standing seed — NOT gospel.
 * Documented as source=seed for Developer Hub review.
 * mobile_home → red; very low miles_to_coast → yellow; very old year_built → yellow.
 */
export const FL_HO_STANDING_SEED: Array<
  Omit<StandingRuleInput, "id"> & { id?: string; note: string }
> = [
  {
    field: "mobile_home",
    operator: "eq",
    threshold: true,
    disposition: "red",
    reasonCode: "mobile_home",
    carrierId: null,
    layer: "standing",
    live: true,
    note: "Manufactured / mobile home is out of appetite for seeded FL HO Standing (conservative).",
  },
  {
    field: "miles_to_coast",
    operator: "lte",
    threshold: 0.5,
    disposition: "yellow",
    reasonCode: "coastal",
    carrierId: null,
    layer: "standing",
    live: true,
    note: "Very coastal (≤0.5 mi) flags yellow — seed caution, not a hard decline.",
  },
  {
    field: "year_built",
    operator: "lte",
    threshold: 1960,
    disposition: "yellow",
    reasonCode: "year_built",
    carrierId: null,
    layer: "standing",
    live: true,
    note: "Pre-1960 year built → yellow (four-point / age caution). Seed only.",
  },
];
