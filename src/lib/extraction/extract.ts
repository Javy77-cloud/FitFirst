import { CONFIDENCE_THRESHOLD } from "@/lib/domain";
import {
  type FieldMapDocType,
  inferFieldMapDocType,
  lookupSheetField,
  sheetFieldsForDocType,
} from "./field-maps";
import {
  EXTRACT_LABELS,
  aliasToKey,
  isBlockedExtractKey,
  looksLikeSsn,
} from "./labels";

export type ExtractedField = {
  fieldKey: string;
  label: string;
  rawValue: string;
  normalizedValue: string;
  confidence: number;
  flagged: boolean;
  source: "labeled" | "inferred" | "uncertain";
};

export type UnmappedExtractLabel = {
  sourceLabel: string;
  rawValue: string;
};

export type ExtractionResult = {
  fields: ExtractedField[];
  documentQuality: "clean" | "messy";
  qualityNotes: string[];
  glanceRequired: boolean;
  /** Labeled lines with no map row — stay blank on the sheet; review bucket. */
  unmappedLabels: UnmappedExtractLabel[];
  fieldMapDocType: FieldMapDocType | null;
};

const UNCERTAIN_VALUE = /\?|\bunk(?:nown)?\b|\billegible\b|\bn\/?a\b|\btbd\b/i;
const OCR_CONFUSION = /\b(?:1q\d{2}|t1le|n0ne|cl4y|m3tal|fr4me)\b/i;
const MESSY_MARKERS =
  /handwritten|low ocr|poor scan|illegible|messy handwriting|\[handwritten/i;

type Pattern = {
  key: string;
  re: RegExp;
  normalize: (raw: string) => string;
};

const PATTERNS: Pattern[] = [
  {
    key: "year_built",
    re: /(?:year\s*(?:built|of\s*construction)|yr\.?\s*blt\.?|yr\s*built|constructed|built(?:\s*in)?)\s*[:#]?\s*([0-9lIOqQ]{4})/i,
    normalize: normalizeYear,
  },
  {
    key: "roof_year",
    re: /(?:roof\s*(?:year|yr|age\s*year|installed)|year\s*(?:of\s*)?roof)\s*[:#]?\s*([0-9lIOqQ]{4})/i,
    normalize: normalizeYear,
  },
  {
    key: "coverage_a",
    re: /(?:coverage\s*a(?:\s*\([^)]*\)|\s+dwelling)?|cov\.?\s*a|dwelling(?:\s*limit)?|building\s*limit)\s*[:#]?\s*\$?\s*([\d,]{3,})|^\s*A\.\s*Dwelling\s+\$?\s*([\d,]{3,})/im,
    normalize: normalizeMoney,
  },
  {
    key: "coverage_b",
    re: /(?:coverage\s*b(?:\s*\([^)]*\)|\s+other\s*structures)?|cov\.?\s*b|other\s*structures)\s*[:#]\s*\$?\s*([\d,]{3,})|^\s*B\.\s*Other\s+Structures\s+\$?\s*([\d,]{3,})/im,
    normalize: normalizeMoney,
  },
  {
    key: "coverage_c",
    re: /(?:coverage\s*c(?:\s*\([^)]*\)|\s+personal\s*property)?|cov\.?\s*c|personal\s*property|contents(?:\s*limit)?)\s*[:#]\s*\$?\s*([\d,]{3,})|^\s*C\.\s*Personal\s+Property\s+\$?\s*([\d,]{3,})/im,
    normalize: normalizeMoney,
  },
  {
    key: "coverage_d",
    re: /(?:coverage\s*d(?:\s*\([^)]*\)|\s+loss\s*of\s*use)?|cov\.?\s*d|loss\s*of\s*use|additional\s*living)\s*[:#]\s*\$?\s*([\d,]{3,})|^\s*D\.\s*Loss\s+of\s+Use\s+\$?\s*([\d,]{3,})/im,
    normalize: normalizeMoney,
  },
  {
    key: "coverage_e",
    re: /(?:coverage\s*e(?:\s*\([^)]*\)|\s+liability)?|cov\.?\s*e|personal\s+liability)\s*[:#]\s*\$?\s*([\d,]{3,})|^\s*E\.\s*Personal\s+Liability\s+\$?\s*([\d,]{3,})/im,
    normalize: normalizeMoney,
  },
  {
    key: "coverage_f",
    re: /(?:coverage\s*f(?:\s*\([^)]*\)|\s+medical)?|cov\.?\s*f|medical\s+payments)\s*[:#]\s*\$?\s*([\d,]{3,})|^\s*F\.\s*Medical\s+Payments\s+\$?\s*([\d,]{3,})/im,
    normalize: normalizeMoney,
  },
  {
    key: "hurricane_deductible",
    re: /(?:hurricane(?:\s*ded(?:uctible)?)?)\s*[:#]?\s*(\$?[\d,]+(?:\.\d+)?%?|\d+%)/i,
    normalize: normalizeDeductible,
  },
  {
    key: "aop_deductible",
    re: /(?:aop(?:\s*ded(?:uctible)?)?|all\s*other\s*perils(?:\s*ded(?:uctible)?)?)\s*[:#]?\s*(\$?[\d,]+(?:\.\d+)?%?)/i,
    normalize: normalizeDeductible,
  },
  {
    key: "wind_deductible",
    re: /(?:wind(?:\/hail)?(?:\s*ded(?:uctible)?)?)\s*[:#]?\s*(\$?[\d,]+(?:\.\d+)?%?)/i,
    normalize: normalizeDeductible,
  },
  {
    key: "replacement_cost_estimate",
    re: /(?:replacement\s*cost(?:\s*estimate)?|rce|msb)\s*[:#]?\s*\$?\s*([\d,]{3,})/i,
    normalize: normalizeMoney,
  },
  {
    key: "current_premium",
    re: /(?:(?:current|annual|total)\s*premium|premium)\s*[:#]?\s*\$?\s*([\d,]{3,})/i,
    normalize: normalizeMoney,
  },
  {
    key: "construction",
    re: /(?:construction|const\.?)\s*[:#]?\s*([a-z0-9 /+-]+)/i,
    normalize: normalizeConstruction,
  },
  {
    key: "roof_covering",
    re: /(?:roof\s*covering|roof\s*cov\.?|roof\s*type|roof\s*material)\s*[:#]?\s*([a-z0-9 /+&,.-]+)/i,
    normalize: normalizeRoof,
  },
  {
    key: "roof_shape",
    re: /(?:roof\s*shape|roof\s*geometry)\s*[:#]?\s*([a-z0-9 /+-]+)/i,
    normalize: (s) => s.toLowerCase().trim(),
  },
  {
    key: "opening_protection",
    re: /(?:opening\s*protection|opn\.?\s*prot\.?|shutters)\s*[:#]?\s*([a-z0-9 /+-]+)/i,
    normalize: normalizeOpenings,
  },
  {
    key: "occupancy",
    re: /(?:occupancy|occ\.?)\s*[:#]?\s*([a-z0-9 /+-]+)/i,
    normalize: normalizeOccupancy,
  },
  {
    key: "stories",
    re: /(?:stories|#\s*stories|story)\s*[:#]?\s*(\d+)/i,
    normalize: (s) => String(parseInt(s, 10)),
  },
  {
    key: "miles_to_coast",
    re: /(?:miles\s*to\s*(?:coast|water|shore)|mi(?:les)?\.?\s*to\s*coast)\s*[:#]?\s*(\d+(?:\.\d+)?)/i,
    normalize: (s) => String(parseFloat(s)),
  },
  {
    key: "protection_class",
    re: /(?:protection\s*class|prot\.?\s*class|ppc)\s*[:#]?\s*([0-9]{1,2}[A-Z]?)/i,
    normalize: (s) => s.toUpperCase(),
  },
  {
    key: "county",
    re: /(?:county)\s*[:#]?\s*([a-z .'-]+)/i,
    normalize: (s) => titleCase(s.replace(/county$/i, "").trim()),
  },
  {
    key: "city",
    re: /(?:city|location\s*city)\s*[:#]?\s*([a-z .'-]+)/i,
    normalize: (s) => titleCase(s.trim()),
  },
  {
    key: "address",
    re: /(?:location|property\s*address|insured\s*location|residence\s*premises)\s*[:#]?\s*([0-9].+)/i,
    normalize: (s) => streetFromLocation(s),
  },
  {
    key: "state",
    re: /(?:location|property\s*address|insured\s*location|residence\s*premises|premises(?:\s*address)?).+,\s*([A-Z]{2})\s+\d{5}/i,
    normalize: (s) => s.toUpperCase(),
  },
  {
    key: "zip",
    re: /(?:location|property\s*address|insured\s*location|residence\s*premises|premises(?:\s*address)?).+,\s*[A-Z]{2}\s+(\d{5})/i,
    normalize: (s) => s,
  },
  {
    key: "square_feet",
    re: /(?:square\s*feet|sq\.?\s*ft\.?|living\s*area|heated\s*sq)/i.source
      ? /(?:square\s*feet|sq\.?\s*ft\.?|living\s*area|heated\s*sq\.?\s*ft\.?)\s*[:#]?\s*([\d,]+)/i
      : /(?:square\s*feet)\s*[:#]?\s*([\d,]+)/i,
    normalize: (s) => String(parseInt(s.replace(/,/g, ""), 10)),
  },
  {
    key: "beds",
    re: /(?:bedrooms|beds|#\s*beds)\s*[:#]?\s*(\d+(?:\.\d+)?)/i,
    normalize: (s) => s,
  },
  {
    key: "baths",
    re: /(?:bathrooms|baths|#\s*baths)\s*[:#]?\s*(\d+(?:\.\d+)?)/i,
    normalize: (s) => s,
  },
  {
    key: "pool",
    re: /(?:pool|swimming\s*pool)\s*[:#]?\s*(yes|no|y|n|none)/i,
    normalize: (s) => (/^(y|yes)$/i.test(s) ? "true" : "false"),
  },
  {
    key: "mobile_home",
    re: /(?:mobile\s*home|manufactured(?:\s*home)?)\s*[:#]?\s*(yes|no|y|n)/i,
    normalize: (s) => (/^(y|yes)$/i.test(s) ? "true" : "false"),
  },
  {
    key: "current_carrier",
    re: /(?:current\s*carrier|incumbent(?:\s*carrier)?|expiring\s*carrier|writing\s*company|insurance\s*company)\s*[:#]?\s*([a-z0-9 .&'-]+)/i,
    normalize: (s) => s.replace(/\s+/g, " ").trim(),
  },
  {
    key: "policy_number",
    re: /(?:policy\s*(?:number|no\.?|#))\s*[:#]?\s*([A-Z0-9-]{4,})/i,
    normalize: (s) => s.trim(),
  },
  {
    key: "form",
    re: /(?:policy\s*form|ho\s*form)\s*[:#]?\s*([A-Z0-9-]{2,12})|(?:^|\n)\s*form\s*[:#]\s*(HO[-\s]?[0-9]+)/im,
    normalize: (s) => s.replace(/\s+/g, "").toUpperCase(),
  },
  {
    key: "named_insured",
    re: /(?:primary\s+)?named\s+insured\s*[:#]\s*([^\n]+)/i,
    normalize: (s) => s.replace(/\s+/g, " ").trim(),
  },
  {
    key: "secondary_named_insured",
    re: /(?:additional|secondary)\s+named\s+insured\s*[:#]\s*([^\n]+)/i,
    normalize: (s) => s.replace(/\s+/g, " ").trim(),
  },
  {
    key: "mailing_address",
    re: /mailing\s+address\s*[:#]\s*([^\n]+)/i,
    normalize: (s) => s.replace(/\s+/g, " ").trim(),
  },
  {
    key: "ordinance_or_law",
    re: /ordinance\s+or\s+law\s*[:#]?\s*(\d+%|\$?[\d,]+)/i,
    normalize: (s) => s.replace(/\s+/g, "").trim(),
  },
  {
    key: "water_backup",
    re: /water\s+backup\s*[:#]?\s*\$?\s*([\d,]{3,})/i,
    normalize: normalizeMoney,
  },
  {
    key: "effective_date",
    re: /(?:effective(?:\s*date)?|policy\s*effective|inception)\s*[:#]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
    normalize: (s) => s,
  },
  {
    key: "expiration_date",
    re: /(?:expiration(?:\s*date)?|policy\s*expiration|expires)\s*[:#]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
    normalize: (s) => s,
  },
  {
    key: "mortgagee",
    re: /(?:first\s*)?mortgagee(?:\s*clause)?\s*[:#]\s*([^\n]+)/i,
    normalize: (s) => s.replace(/\s+/g, " ").trim(),
  },
  {
    key: "flood_zone",
    re: /(?:flood\s*zone|fema\s*zone|nfip\s*zone)\s*[:#]?\s*([A-Z]{1,3}[0-9]?)/i,
    normalize: (s) => s.toUpperCase(),
  },
  {
    key: "four_point_date",
    re: /(?:4[\s-]*point|four[\s-]*point)\s*(?:inspection\s*)?(?:date|insp)?\s*[:#]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
    normalize: (s) => s,
  },
  {
    key: "four_point_result",
    re: /(?:4[\s-]*point|four[\s-]*point)\s*(?:result|status)\s*[:#]\s*([^\n]+)/i,
    normalize: (s) => s.replace(/\s+/g, " ").trim(),
  },
  {
    key: "wind_mit_form",
    re: /(?:wind\s*mit(?:igation)?(?:\s*form)?|oir[\s-]?b[\s-]?1[\s-]?1802|oir[\s-]?b[\s-]?1[\s-]?802)\s*[:#]\s*([^\n]+)/i,
    normalize: (s) => s.replace(/\s+/g, " ").trim(),
  },
  {
    key: "vin",
    re: /(?:vin|vehicle\s*id(?:entification)?)\s*[:#]?\s*([A-HJ-NPR-Z0-9]{11,17})/i,
    normalize: (s) => s.toUpperCase(),
  },
  {
    key: "vehicle_year",
    re: /(?:vehicle\s*year|year\/make\/model)\s*[:#]?\s*(\d{4})/i,
    normalize: normalizeYear,
  },
  {
    key: "vehicle_make",
    re: /(?:vehicle\s*make|make)\s*[:#]\s*([a-z0-9 .'-]+)/i,
    normalize: (s) => s.trim(),
  },
  {
    key: "vehicle_model",
    re: /(?:vehicle\s*model|model)\s*[:#]\s*([a-z0-9 .'-]+)/i,
    normalize: (s) => s.trim(),
  },
  {
    key: "garaging_zip",
    re: /(?:garaging\s*zip)\s*[:#]?\s*(\d{5})/i,
    normalize: (s) => s,
  },
  {
    key: "liability_bi",
    re: /(?:liability\s*bi|bodily\s*injury|bi\s*limits?)\s*[:#]?\s*([0-9,/ $kK]+)/i,
    normalize: (s) => s.replace(/\s+/g, "").trim(),
  },
  {
    key: "liability_pd",
    re: /(?:property\s*damage|pd\s*limit)\s*[:#]?\s*(\$?[\d,]+)/i,
    normalize: normalizeMoney,
  },
  {
    key: "um_uim",
    re: /(?:um\s*\/\s*uim|uninsured\s*motorist)\s*[:#]?\s*([0-9,/ $kK]+)/i,
    normalize: (s) => s.replace(/\s+/g, "").trim(),
  },
  {
    key: "pip",
    re: /(?:\bpip\b)\s*[:#]?\s*(\$?[\d,]+)/i,
    normalize: normalizeMoney,
  },
  {
    key: "comp_deductible",
    re: /(?:comp(?:rehensive)?\s*ded(?:uctible)?)\s*[:#]?\s*(\$?[\d,]+)/i,
    normalize: normalizeDeductible,
  },
  {
    key: "collision_deductible",
    re: /(?:collision\s*ded(?:uctible)?)\s*[:#]?\s*(\$?[\d,]+)/i,
    normalize: normalizeDeductible,
  },
];

export function assessDocumentQuality(text: string): {
  messy: boolean;
  notes: string[];
  penalty: number;
} {
  const notes: string[] = [];
  let penalty = 0;
  if (MESSY_MARKERS.test(text)) {
    notes.push("Document marked as handwritten / poor scan");
    penalty += 0.22;
  }
  if (OCR_CONFUSION.test(text)) {
    notes.push("OCR confusion tokens (1/l, 0/o, q/9) in field values");
    penalty += 0.12;
  }
  const questionMarks = (text.match(/\?/g) ?? []).length;
  if (questionMarks >= 1) {
    notes.push("Uncertain marks on the page");
    penalty += Math.min(0.1, questionMarks * 0.04);
  }
  return { messy: penalty >= 0.18, notes, penalty };
}

/** Collapse OCR/PDF spacing so "$ 321 , 000" and "Cov A  321000" still map. */
export function normalizeExtractText(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\$\s+(\d)/g, "$$$1")
    .replace(/(\d)\s+,\s+(\d)/g, "$1,$2")
    .replace(/(\d), (\d{3})/g, "$1,$2");
}

export function extractFieldsFromText(text: string, docType?: string | null): ExtractionResult {
  const quality = assessDocumentQuality(text);
  const byKey = new Map<string, ExtractedField>();
  text = normalizeExtractText(text);
  const mapType = inferFieldMapDocType(text, docType);
  const unmappedLabels: UnmappedExtractLabel[] = [];

  const labeled = mapType
    ? fromMappedLines(text, mapType, quality.penalty, unmappedLabels)
    : fromLabeledLines(text, quality.penalty);

  const patterned = fromPatterns(text, quality.penalty);
  const allowed = mapType ? sheetFieldsForDocType(mapType) : null;

  for (const field of [...patterned, ...labeled]) {
    if (isBlockedExtractKey(field.fieldKey) || looksLikeSsn(field.rawValue)) continue;
    if (allowed && !allowed.has(field.fieldKey)) continue;
    const existing = byKey.get(field.fieldKey);
    if (!existing || field.confidence > existing.confidence) {
      byKey.set(field.fieldKey, field);
    }
  }

  const fields = [...byKey.values()];
  return {
    fields,
    documentQuality: quality.messy ? "messy" : "clean",
    qualityNotes: quality.notes,
    glanceRequired: fields.some((f) => f.flagged) || unmappedLabels.length > 0,
    unmappedLabels,
    fieldMapDocType: mapType,
  };
}

function fromPatterns(text: string, penalty: number): ExtractedField[] {
  const fields: ExtractedField[] = [];
  for (const pattern of PATTERNS) {
    const match = pattern.re.exec(text);
    const raw = (match?.[1] ?? match?.[2] ?? "").trim();
    if (!raw) continue;
    const built = toField(pattern.key, raw, pattern.normalize, penalty);
    if (built) fields.push(built);
  }
  return fields;
}

function fromLabeledLines(text: string, penalty: number): ExtractedField[] {
  const fields: ExtractedField[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.length > 220) continue;
    const match = /^([A-Za-z][A-Za-z0-9 ./%#-]{0,48})\s*[:#]\s*(.+)$/.exec(line);
    if (!match) continue;
    const key = aliasToKey(match[1]);
    if (!key || isBlockedExtractKey(key)) continue;
    const rawValue = match[2].trim();
    if (!rawValue || looksLikeSsn(rawValue)) continue;
    const built = toField(key, rawValue, normalizerFor(key), penalty);
    if (built) fields.push(built);
  }
  return fields;
}

/** Map-only labeled lines. Unmapped labels are recorded, never guessed onto a key. */
function fromMappedLines(
  text: string,
  docType: FieldMapDocType,
  penalty: number,
  unmapped: UnmappedExtractLabel[],
): ExtractedField[] {
  const fields: ExtractedField[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.length > 220) continue;
    const match = /^([A-Za-z][A-Za-z0-9 ./%#-]{0,56})\s*[:#]\s*(.+)$/.exec(line);
    if (!match) continue;
    const sourceLabel = match[1].trim();
    const rawValue = match[2].trim();
    if (!rawValue || looksLikeSsn(rawValue)) continue;
    const key = lookupSheetField(docType, sourceLabel);
    if (!key) {
      if (!isBlockedExtractKey(normalizeBlocked(sourceLabel))) {
        unmapped.push({ sourceLabel, rawValue });
      }
      continue;
    }
    if (isBlockedExtractKey(key)) continue;
    const built = toField(key, rawValue, normalizerFor(key), penalty);
    if (built) fields.push(built);
  }
  return fields;
}

function normalizeBlocked(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function toField(
  key: string,
  rawValue: string,
  normalize: (raw: string) => string,
  penalty: number,
): ExtractedField | null {
  const normalizedValue = normalize(rawValue);
  if (normalizedValue === "" || normalizedValue === "NaN") return null;
  const uncertain = UNCERTAIN_VALUE.test(rawValue) || OCR_CONFUSION.test(rawValue);
  const source: ExtractedField["source"] = uncertain ? "uncertain" : "labeled";
  let confidence = source === "labeled" ? 0.94 : 0.58;
  confidence -= penalty;
  if (uncertain) confidence -= 0.2;
  confidence = clamp(confidence, 0.05, 0.99);
  return {
    fieldKey: key,
    label: EXTRACT_LABELS[key] ?? key.replaceAll("_", " "),
    rawValue,
    normalizedValue,
    confidence: round3(confidence),
    flagged: confidence < CONFIDENCE_THRESHOLD,
    source,
  };
}

function normalizerFor(key: string): (raw: string) => string {
  if (
    key === "year_built" ||
    key === "roof_year" ||
    key === "vehicle_year" ||
    key === "electrical_year" ||
    key === "electrical_updated" ||
    key === "plumbing_year" ||
    key === "water_heater_year" ||
    key === "hvac_year"
  ) {
    return normalizeYear;
  }
  if (
    key === "coverage_a" ||
    key === "coverage_b" ||
    key === "coverage_c" ||
    key === "coverage_d" ||
    key === "coverage_e" ||
    key === "coverage_f" ||
    key === "water_backup" ||
    key === "replacement_cost_estimate" ||
    key === "current_premium" ||
    key === "liability_pd" ||
    key === "pip"
  ) {
    return normalizeMoney;
  }
  if (key === "hurricane_deductible" || key === "aop_deductible" || key === "wind_deductible") {
    return normalizeDeductible;
  }
  if (key === "construction") return normalizeConstruction;
  if (key === "roof_covering") return normalizeRoof;
  if (key === "roof_shape") return (s) => s.toLowerCase().trim();
  if (key === "opening_protection") return normalizeOpenings;
  if (key === "occupancy") return normalizeOccupancy;
  if (key === "address") return streetFromLocation;
  if (key === "city" || key === "county") {
    return (s) => titleCase(s.replace(/county$/i, "").trim());
  }
  if (key === "state") return (s) => s.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase();
  if (key === "zip" || key === "garaging_zip") return (s) => (s.match(/\d{5}/)?.[0] ?? s);
  if (key === "square_feet" || key === "stories") {
    return (s) => {
      const n = parseInt(s.replace(/,/g, ""), 10);
      return Number.isFinite(n) ? String(n) : s;
    };
  }
  if (key === "pool" || key === "mobile_home") {
    return (s) => (/^(y|yes|true)$/i.test(s.trim()) ? "true" : /^(n|no|false|none)$/i.test(s.trim()) ? "false" : s);
  }
  if (key === "form") return (s) => s.replace(/\s+/g, "").toUpperCase();
  if (key === "swr") {
    return (s) => (/^(y|yes|true|present)$/i.test(s.trim()) ? "yes" : /^(n|no|false|none)$/i.test(s.trim()) ? "no" : s.replace(/\s+/g, " ").trim());
  }
  if (key === "flood_zone") return (s) => s.trim().toUpperCase();
  if (key === "named_insured" || key === "mortgagee") return (s) => s.replace(/\s+/g, " ").trim();
  return (s) => s.replace(/\s+/g, " ").trim();
}

export function fieldKeyToRiskColumn(fieldKey: string): string | null {
  const map: Record<string, string> = {
    address: "address1",
    city: "city",
    county: "county",
    state: "state",
    zip: "zip",
    year_built: "yearBuilt",
    construction: "construction",
    occupancy: "occupancy",
    stories: "stories",
    coverage_a: "coverageA",
    roof_year: "roofYear",
    roof_covering: "roofCovering",
    opening_protection: "openingProtection",
    pool: "pool",
    protection_class: "protectionClass",
    miles_to_coast: "milesToCoast",
    square_feet: "squareFeet",
    mobile_home: "mobileHome",
    replacement_cost_estimate: "replacementCostEstimate",
  };
  return map[fieldKey] ?? null;
}

export function coerceRiskValue(
  fieldKey: string,
  normalized: string,
): string | number | boolean | null {
  if (normalized === "" || normalized === "NaN") return null;
  if (
    fieldKey === "year_built" ||
    fieldKey === "roof_year" ||
    fieldKey === "stories" ||
    fieldKey === "coverage_a" ||
    fieldKey === "square_feet" ||
    fieldKey === "replacement_cost_estimate"
  ) {
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }
  if (fieldKey === "miles_to_coast") {
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }
  if (fieldKey === "pool" || fieldKey === "mobile_home") {
    return normalized === "true";
  }
  return normalized;
}

function normalizeYear(raw: string): string {
  const mapped = raw
    .replace(/[lI]/g, "1")
    .replace(/[O]/g, "0")
    .replace(/q/gi, "9");
  const n = parseInt(mapped, 10);
  if (!Number.isFinite(n) || n < 1800 || n > 2100) return raw;
  return String(n);
}

function normalizeMoney(raw: string): string {
  const n = parseInt(raw.replace(/[, $]/g, ""), 10);
  return Number.isFinite(n) ? String(n) : raw;
}

function normalizeDeductible(raw: string): string {
  const trimmed = raw.replace(/\s+/g, "").trim();
  if (/%/.test(trimmed)) return trimmed.replace(/\$/g, "");
  return normalizeMoney(trimmed);
}

function normalizeConstruction(raw: string): string {
  const s = raw.toLowerCase();
  if (/frame|wood|fr4me/.test(s)) return "frame";
  if (/masonry|cbs|concrete|block/.test(s)) return "masonry";
  if (/manufactured|mobile/.test(s)) return "manufactured";
  return raw.toLowerCase().trim();
}

function normalizeRoof(raw: string): string {
  const s = raw.toLowerCase();
  const parts: string[] = [];
  if (/clay|t1le|tile/.test(s)) parts.push("clay tile");
  if (/metal|mtl|m3tal/.test(s)) parts.push("metal");
  if (/shingle|comp/.test(s)) parts.push("shingle");
  if (/tile/.test(s) && !parts.includes("clay tile")) parts.push("tile");
  return parts.length ? parts.join(" + ") : s.trim();
}

function normalizeOpenings(raw: string): string {
  const s = raw.toLowerCase();
  if (/full|impact|shutters/.test(s)) return "full";
  if (/partial/.test(s)) return "partial";
  if (/none|n0ne|no|unk/.test(s)) return "none";
  return s.trim();
}

function normalizeOccupancy(raw: string): string {
  const s = raw.toLowerCase();
  if (/owner/.test(s)) return "owner";
  if (/tenant|rental/.test(s)) return "tenant";
  if (/vacant/.test(s)) return "vacant";
  return s.trim();
}

function streetFromLocation(raw: string): string {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  const withLocality = cleaned.match(/^(\d+.+?),\s*[A-Za-z .'-]+,\s*[A-Z]{2}\s+\d{5}/);
  if (withLocality) return withLocality[1].trim();
  return cleaned;
}

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
