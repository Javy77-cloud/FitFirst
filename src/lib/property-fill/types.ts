import type { PropertyRecordsFact } from "@/lib/getparceldata/map";

export const COUNTY_PA_LABEL = "county PA";
export const FEMA_LABEL = "FEMA";
export const FLOODZONEMAP_LABEL = "FloodZoneMap";
export const PROPERTY_RECORDS_LABEL = "property records";
export const PERMITSTACK_LABEL = "PermitStack";

export type PropertyFillAddress = {
  address1?: string | null;
  city?: string | null;
  county?: string | null;
  state?: string | null;
  zip?: string | null;
};

export type PropertyFillSourceId =
  | "property-records"
  | "county-pa"
  | "floodzonemap"
  | "fema"
  | "permitstack";

export type PropertyFillBundle = {
  facts: PropertyRecordsFact[];
  sourcesUsed: PropertyFillSourceId[];
  message: string;
  status: "ok" | "needs_key" | "no_address" | "not_found" | "error";
};
