/** Free US DOT NHTSA vPIC — no API key, no vault, no signup. */

export const NHTSA_VPIC_LABEL = "NHTSA vPIC";
export const DECODE_VIN_LABEL = "Decode VIN";
export const NHTSA_VPIC_DECODE_VALUES_URL =
  "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues";

/** Settings rule: free public API — agency leaves vault blank. */
export const NHTSA_VPIC_SETTINGS_NOTE =
  "NHTSA vPIC VIN decode is free US DOT open data. No API key and nothing in the vault.";

export type VinDecodeSourceId = "nhtsa-vpic";

export type VinDecodeFact = {
  sheetKey: string;
  value: string;
  sourceLabel: string;
};

/** Flat DecodeVinValues fields we care about for Auto empty-only fill. */
export type VinDecodeValues = {
  make: string;
  model: string;
  modelYear: string;
  trim: string;
  series: string;
  bodyClass: string;
  vehicleType: string;
  fuelTypePrimary: string;
  /** Engine summary (displacement / cylinders / HP when present). */
  engine: string;
  displacementL: string;
  engineCylinders: string;
  engineHP: string;
  /** Safety highlights (ABS / airbag location) when NHTSA returns them. */
  abs: string;
  airBagLocFront: string;
  errorCode: string;
  errorText: string;
};

/** Per-vehicle sheet keys the mapper can write (empty-only upstream). */
export type VinSheetKeyBag = {
  year: string;
  make: string;
  model: string;
  /** Optional — only written when catalog has a home. */
  fuel?: string;
  bodyClass?: string;
  engine?: string;
  /** Optional safety note / field — next tip may expand. */
  safety?: string;
};

/**
 * Auto Risk Profile vehicle fields NHTSA vPIC DecodeVinValues can fill.
 * Engine comes from DisplacementL / EngineCylinders / EngineHP / EngineModel.
 */
export const NHTSA_WIRED_RP_VEHICLE_KEYS = ["vehicle_engine"] as const;

/**
 * Requested Auto RP fields DecodeVinValues does not honestly return.
 * Checked against a live Heather RDX decode and a sample of other VINs:
 * BasePrice is on the payload and always empty (not an OCN). No usage,
 * ownership, lienholder, new/used flag, or odometer / annual miles.
 * Leave these for Gemini (when printed on the dec) or manual entry.
 */
export const NHTSA_RP_VEHICLE_GAPS = [
  {
    sheetKey: "vehicle_usage",
    reason: "Pleasure / commute / business is not a vPIC variable.",
  },
  {
    sheetKey: "vehicle_ownership",
    reason: "Owned / financed / leased is not in the VIN record.",
  },
  {
    sheetKey: "vehicle_ownership_length",
    reason: "Length of ownership is not in the VIN record.",
  },
  {
    sheetKey: "vehicle_lienholder",
    reason: "Lienholder is not in the VIN record.",
  },
  {
    sheetKey: "purchased_new",
    reason: "New vs used purchase is not in the VIN record.",
  },
  {
    sheetKey: "original_cost_new",
    reason: "DecodeVinValues.BasePrice exists and is empty — not a usable OCN.",
  },
  {
    sheetKey: "annual_miles",
    reason: "No odometer or annual mileage in the VIN record. Current miles cannot be derived.",
  },
] as const;
