import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import { emptySheetValues } from "./catalog";

type AnaRisk = {
  address1: string;
  city: string;
  county: string;
  state: string;
  zip: string;
  occupancy: string;
  occupancyNote?: string;
  stories: number;
  yearBuilt: number;
  roofYear: number;
  roofCovering: string;
  construction: string;
  constructionNote?: string;
  openingProtection: string;
  pool: boolean;
  protectionClass: string;
  milesToCoast: number;
  coverageA: number;
  coverageANote?: string;
};

/** Seed Ana's Home sheet from the fixture. Cov A is Javy-tested — confirmed, never CHECK. */
export function anaHomeSheetValues(risk: AnaRisk): Record<string, QuoteSheetFieldValue> {
  const values = emptySheetValues("home");
  const confirmed = (value: string, source: QuoteSheetFieldValue["source"] = "seed"): QuoteSheetFieldValue => ({
    value,
    status: "confirmed",
    source,
  });

  values.address1 = confirmed(risk.address1);
  values.city = confirmed(risk.city);
  values.county = confirmed(risk.county);
  values.state = confirmed(risk.state);
  values.zip = confirmed(risk.zip);
  values.year_built = confirmed(String(risk.yearBuilt));
  values.stories = confirmed(String(risk.stories));
  values.construction = confirmed(risk.construction);
  values.occupancy = confirmed(risk.occupancy);
  values.roof_year = confirmed(String(risk.roofYear));
  values.roof_covering = confirmed(risk.roofCovering);
  values.opening_protection = confirmed(risk.openingProtection);
  values.pool = confirmed(risk.pool ? "true" : "false");
  values.protection_class = confirmed(risk.protectionClass);
  values.miles_to_coast = confirmed(String(risk.milesToCoast));
  values.coverage_a = {
    value: String(risk.coverageA),
    status: "confirmed",
    source: "javy",
  };
  const notes = [
    risk.occupancyNote,
    risk.constructionNote,
    risk.coverageANote,
  ]
    .filter(Boolean)
    .join(" ");
  if (notes) values.notes = confirmed(notes);
  return values;
}

export function anaPropertyOneliner(risk: AnaRisk): string {
  return `${risk.address1}, ${risk.city}, ${risk.state} ${risk.zip} · ${risk.yearBuilt} ${risk.construction}`;
}
