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
