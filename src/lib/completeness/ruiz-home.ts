import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";

/** Bound Camila Ruiz Home sheet — fuller than Ana, still real cells (not a fake score). */
export function ruizHomeSheetValues(): Record<string, QuoteSheetFieldValue> {
  const values = emptySheetValues("home");
  const confirmed = (value: string): QuoteSheetFieldValue => ({
    value,
    status: "confirmed",
    source: "seed",
  });

  values.address1 = confirmed("880 Croton Rd");
  values.city = confirmed("Melbourne");
  values.county = confirmed("Brevard");
  values.state = confirmed("FL");
  values.zip = confirmed("32935");
  values.year_built = confirmed("2004");
  values.stories = confirmed("1");
  values.square_feet = confirmed("2140");
  values.construction = confirmed("masonry");
  values.occupancy = confirmed("owner");
  values.roof_year = confirmed("2019");
  values.roof_covering = confirmed("architectural shingle");
  values.roof_shape = confirmed("hip");
  values.opening_protection = confirmed("impact");
  values.protection_class = confirmed("3");
  values.miles_to_coast = confirmed("12");
  values.pool = confirmed("false");
  values.mobile_home = confirmed("false");
  values.coverage_a = confirmed("402000");
  values.coverage_b = confirmed("40200");
  values.coverage_c = confirmed("201000");
  values.coverage_d = confirmed("80400");
  values.hurricane_deductible = confirmed("2%");
  values.aop_deductible = confirmed("2500");
  values.replacement_cost_estimate = confirmed("398000");
  values.current_carrier = confirmed("American Integrity");
  values.current_premium = confirmed("3340");
  values.effective_date = confirmed("2025-09-01");
  values.expiration_date = confirmed("2026-09-01");
  values.four_point_date = confirmed("2025-08-12");
  values.four_point_result = confirmed("satisfactory");
  values.wind_mit_form = confirmed("OIR-B1-1802");
  values.notes = confirmed("Bound HO3. Sheet filled from the issued declaration page — not a quote.");
  return values;
}
