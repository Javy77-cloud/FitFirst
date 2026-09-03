import {
  isLocationLine,
  occupancyLabel,
  type Occupancy,
} from "@/lib/domain";

export type LocationRecord = {
  id: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  occupancy: string;
  contactId: string | null;
  businessId: string | null;
};

export type PolicyAtLocation = {
  id: string;
  locationId: string | null;
  lineOfBusiness: string;
  policyNumber: string;
};

export function locationNeedsPremises(line: string): boolean {
  return isLocationLine(line);
}

export function defaultOccupancyForLine(line: string): Occupancy {
  if (line === "LANDLORD") return "tenant";
  if (line === "BOP" || line === "GL") return "commercial";
  return "owner";
}

export function groupPoliciesByLocation<P extends PolicyAtLocation>(
  locations: LocationRecord[],
  policies: P[],
): { location: LocationRecord; occupancy: string; policies: P[] }[] {
  return locations.map((location) => ({
    location,
    occupancy: occupancyLabel(location.occupancy),
    policies: policies.filter((policy) => policy.locationId === location.id),
  }));
}

export function unassignedLocationPolicies<P extends PolicyAtLocation>(policies: P[]): P[] {
  return policies.filter((policy) => !policy.locationId && locationNeedsPremises(policy.lineOfBusiness));
}
