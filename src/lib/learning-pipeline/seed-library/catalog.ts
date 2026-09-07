export const SEED_LIBRARY_CAPACITY = 400;

export type SeedMappedForm = {
  id: string;
  formId: string;
  formVersion: string;
  sourceLabel: string;
  fieldType: string;
  carrier: string;
  mappingFrom: string;
  mappingTo: string;
};

const CARRIERS = [
  "Citizens",
  "Universal",
  "Heritage",
  "Slide",
  "TypTap",
  "Tower Hill",
] as const;

const FORMS = [
  { formId: "acord-80", formVersion: "2014/01", sourceLabel: "ACORD 80" },
  { formId: "acord-90", formVersion: "2016/09", sourceLabel: "ACORD 90" },
  { formId: "ho3-dec", formVersion: "HO3-2024", sourceLabel: "HO3 declarations" },
  { formId: "wind-mit", formVersion: "OIR-B1-1802", sourceLabel: "Wind mitigation" },
  { formId: "four-point", formVersion: "4PT-2023", sourceLabel: "Four-point inspection" },
  { formId: "flood-dec", formVersion: "NFIP-2022", sourceLabel: "Flood declarations" },
] as const;

const FIELD_MAPS = [
  { fieldType: "construction", mappingFrom: "construction_type", mappingTo: "construction" },
  { fieldType: "roof_covering", mappingFrom: "roof_cover", mappingTo: "roof_covering" },
  { fieldType: "roof_year", mappingFrom: "year_roof", mappingTo: "roof_year" },
  { fieldType: "year_built", mappingFrom: "yr_built", mappingTo: "year_built" },
  { fieldType: "coverage_a", mappingFrom: "cov_a", mappingTo: "coverage_a" },
  { fieldType: "coverage_c", mappingFrom: "cov_c", mappingTo: "coverage_c" },
  { fieldType: "aop_deductible", mappingFrom: "aop_ded", mappingTo: "aop_deductible" },
  { fieldType: "hurricane_deductible", mappingFrom: "hur_ded", mappingTo: "hurricane_deductible" },
] as const;

function buildSampleRows(): SeedMappedForm[] {
  const rows: SeedMappedForm[] = [];
  let n = 0;
  for (const form of FORMS) {
    for (const field of FIELD_MAPS) {
      const carrier = CARRIERS[n % CARRIERS.length];
      n += 1;
      rows.push({
        id: `seed-map-${String(n).padStart(3, "0")}`,
        formId: form.formId,
        formVersion: form.formVersion,
        sourceLabel: `${form.sourceLabel} · ${field.fieldType}`,
        fieldType: field.fieldType,
        carrier,
        mappingFrom: field.mappingFrom,
        mappingTo: field.mappingTo,
      });
    }
  }
  return rows;
}

export const SEED_MAPPED_FORMS: readonly SeedMappedForm[] = buildSampleRows();

export function seedLibrarySize(): number {
  return SEED_MAPPED_FORMS.length;
}

export function seedLibraryRemaining(): number {
  return Math.max(0, SEED_LIBRARY_CAPACITY - SEED_MAPPED_FORMS.length);
}
