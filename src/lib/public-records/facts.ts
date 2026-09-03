import type { PublicFact } from "@/lib/quote-sheet/apply";

export type AddressQuery = {
  address1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
};

export type PublicLookupResult = {
  facts: PublicFact[];
  message: string;
};

function keyOf(address: AddressQuery): string {
  return [address.address1, address.city, address.state, address.zip]
    .map((part) => (part ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim())
    .filter(Boolean)
    .join("|");
}

/** Curated listing / county / FEMA facts. Never a Zestimate or list price as Cov A. */
const CURATED: { match: string; facts: PublicFact[]; note: string }[] = [
  {
    match: "1098 adige ct se|palm bay|32909",
    note: "Brevard PA / listing facts + FEMA NFHL for 1098 Adige Ct SE",
    facts: [
      { fieldKey: "year_built", value: "1989", sourceLabel: "Brevard PA", kind: "county" },
      { fieldKey: "square_feet", value: "1592", sourceLabel: "Listing facts", kind: "listing" },
      { fieldKey: "beds", value: "3", sourceLabel: "Listing facts", kind: "listing" },
      { fieldKey: "baths", value: "2", sourceLabel: "Listing facts", kind: "listing" },
      { fieldKey: "construction", value: "frame", sourceLabel: "Listing facts", kind: "listing" },
      { fieldKey: "stories", value: "1", sourceLabel: "Listing facts", kind: "listing" },
      { fieldKey: "flood_zone", value: "A", sourceLabel: "FEMA flood", kind: "fema" },
    ],
  },
  {
    match: "412 harbor isle|melbourne|32935",
    note: "Sample Melbourne fill-demo — year from the packet; no extra invented listing facts",
    facts: [],
  },
];

export function curatedFactsFor(address: AddressQuery): PublicLookupResult | null {
  const hay = keyOf(address);
  if (!hay) return null;
  for (const row of CURATED) {
    const parts = row.match.split("|");
    if (parts.every((part) => hay.includes(part))) {
      return { facts: row.facts, message: row.note };
    }
  }
  return null;
}

export function addressFromSheet(values: {
  address1?: { value?: string };
  city?: { value?: string };
  state?: { value?: string };
  zip?: { value?: string };
}): AddressQuery {
  return {
    address1: values.address1?.value ?? "",
    city: values.city?.value ?? "",
    state: values.state?.value ?? "",
    zip: values.zip?.value ?? "",
  };
}
