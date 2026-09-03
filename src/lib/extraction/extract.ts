import { CONFIDENCE_THRESHOLD } from "@/lib/domain";

export type ExtractedField = {
  fieldKey: string;
  label: string;
  rawValue: string;
  normalizedValue: string;
  confidence: number;
  flagged: boolean;
  source: "labeled" | "inferred" | "uncertain";
};

export type ExtractionResult = {
  fields: ExtractedField[];
  documentQuality: "clean" | "messy";
  qualityNotes: string[];
  glanceRequired: boolean;
};

const UNCERTAIN_VALUE = /\?|\bunk(?:nown)?\b|\billegible\b|\bn\/?a\b|\btbd\b/i;
const OCR_CONFUSION = /\b(?:1q\d{2}|t1le|n0ne|cl4y|m3tal|fr4me)\b/i;
const MESSY_MARKERS =
  /handwritten|low ocr|poor scan|illegible|messy handwriting|\[handwritten/i;

const FIELD_LABELS: Record<string, string> = {
  address: "Location",
  city: "City",
  county: "County",
  year_built: "Year built",
  construction: "Construction",
  occupancy: "Occupancy",
  stories: "Stories",
  coverage_a: "Coverage A",
  roof_year: "Roof year",
  roof_covering: "Roof covering",
  opening_protection: "Opening protection",
  pool: "Pool",
  protection_class: "Protection class",
  miles_to_coast: "Miles to coast",
  square_feet: "Square feet",
  mobile_home: "Mobile home",
  replacement_cost_estimate: "Replacement cost (RCE)",
  current_carrier: "Current carrier",
  state: "State",
  zip: "ZIP",
  named_insured: "Named insured",
  secondary_named_insured: "Additional named insured",
  mailing_address: "Mailing address",
  ordinance_or_law: "Ordinance or law",
  water_backup: "Water backup",
  hurricane_deductible: "Hurricane deductible",
  aop_deductible: "AOP deductible",
  wind_hail_deductible: "Wind / hail deductible",
  coverage_b: "Coverage B",
  coverage_c: "Coverage C",
  coverage_d: "Coverage D",
  coverage_e: "Coverage E",
  coverage_f: "Coverage F",
  policy_number: "Policy number",
  form: "Form",
  effective_date: "Effective date",
  expiration_date: "Expiration date",
  current_premium: "Current premium",
  roof_shape: "Roof shape",
};

const MARKET_VALUE_NOISE =
  /zestimate|zillow|list\s*price|estimated\s*(?:market\s*)?value|\bavm\b/i;

type Pattern = {
  key: keyof typeof FIELD_LABELS;
  re: RegExp;
  normalize: (raw: string) => string;
};

const PATTERNS: Pattern[] = [
  {
    key: "year_built",
    re: /(?:year\s*(?:built|of\s*construction)|yr\.?\s*blt\.?|yr\s*built|constructed)\s*[:#]?\s*([0-9lIOqQ]{4})/i,
    normalize: normalizeYear,
  },
  {
    key: "roof_year",
    re: /(?:roof\s*(?:year|yr|age\s*year|installed)|year\s*(?:of\s*)?roof)\s*[:#]?\s*([0-9lIOqQ]{4})/i,
    normalize: normalizeYear,
  },
  {
    key: "coverage_a",
    re: /(?:coverage\s*a|cov\.?\s*a|(?:^|\n)\s*A[\.\)]\s*dwelling|dwelling(?:\s*limit)?)\s*[:#]?\s*\$?\s*([\d,]{3,})/im,
    normalize: normalizeMoney,
  },
  {
    key: "coverage_b",
    re: /(?:coverage\s*b|cov\.?\s*b|(?:^|\n)\s*B[\.\)]\s*other\s*structures|other\s*structures)\s*[:#]?\s*\$?\s*([\d,]{3,})/im,
    normalize: normalizeMoney,
  },
  {
    key: "coverage_c",
    re: /(?:coverage\s*c|cov\.?\s*c|(?:^|\n)\s*C[\.\)]\s*personal\s*property|personal\s*property|contents(?:\s*limit)?)\s*[:#]?\s*\$?\s*([\d,]{3,})/im,
    normalize: normalizeMoney,
  },
  {
    key: "coverage_d",
    re: /(?:coverage\s*d|cov\.?\s*d|(?:^|\n)\s*D[\.\)]\s*loss\s*of\s*use|loss\s*of\s*use)\s*[:#]?\s*\$?\s*([\d,]{3,})/im,
    normalize: normalizeMoney,
  },
  {
    key: "coverage_e",
    re: /(?:coverage\s*e|cov\.?\s*e|(?:^|\n)\s*E[\.\)]\s*personal\s*liability|personal\s*liability)\s*[:#]?\s*\$?\s*([\d,]{3,})/im,
    normalize: normalizeMoney,
  },
  {
    key: "coverage_f",
    re: /(?:coverage\s*f|cov\.?\s*f|(?:^|\n)\s*F[\.\)]\s*medical\s*payments|medical\s*payments|med\s*pay)\s*[:#]?\s*\$?\s*([\d,]{3,})/im,
    normalize: normalizeMoney,
  },
  {
    key: "replacement_cost_estimate",
    re: /(?:replacement\s*cost(?:\s*estimate)?|rce|msb)\s*[:#]?\s*\$?\s*([\d,]{3,})/i,
    normalize: normalizeMoney,
  },
  {
    key: "construction",
    re: /(?:construction|const\.?)\s*[:#]?\s*([a-z0-9 /+-]+)/i,
    normalize: normalizeConstruction,
  },
  {
    key: "roof_covering",
    re: /(?:roof\s*covering|roof\s*cov\.?|roof\s*type)\s*[:#]?\s*([a-z0-9 /+&,.-]+)/i,
    normalize: normalizeRoof,
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
    re: /(?:location|property\s*address|insured\s*location|residence\s*premises|premises(?:\s*address)?|location\s*of\s*property)\s*[:#]?\s*([0-9].+)/i,
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
    re: /(?:square\s*feet|sq\.?\s*ft\.?|living\s*area)\s*[:#]?\s*([\d,]+)/i,
    normalize: (s) => String(parseInt(s.replace(/,/g, ""), 10)),
  },
  {
    key: "pool",
    re: /(?:pool|swimming\s*pool)\s*[:#]?\s*(yes|no|y|n|none)/i,
    normalize: (s) => (/^(y|yes)$/i.test(s) ? "true" : "false"),
  },
  {
    key: "mobile_home",
    re: /(?:mobile\s*home|manufactured)\s*[:#]?\s*(yes|no|y|n)/i,
    normalize: (s) => (/^(y|yes)$/i.test(s) ? "true" : "false"),
  },
  {
    key: "current_carrier",
    re: /(?:current\s*carrier|incumbent(?:\s*carrier)?|expiring\s*carrier|company(?:\s*name)?|insurer|issued\s*by)\s*[:#]?\s*([a-z0-9 .&'-]+)/i,
    normalize: (s) => s.replace(/\s+/g, " ").trim(),
  },
  {
    key: "named_insured",
    re: /(?:(?<!additional\s)(?<!secondary\s)named\s*insured|insured\s*name|primary\s*named\s*insured)\s*[:#]?\s*([^\n]+)/i,
    normalize: (s) => titleCase(s.replace(/\s+/g, " ").trim()),
  },
  {
    key: "secondary_named_insured",
    re: /(?:additional(?:\s*named)?\s*insured|secondary\s*named\s*insured)\s*[:#]?\s*([^\n]+)/i,
    normalize: (s) => titleCase(s.replace(/\s+/g, " ").trim()),
  },
  {
    key: "mailing_address",
    re: /(?:mailing\s*address|mail\s*to)\s*[:#]?\s*([^\n]+)/i,
    normalize: (s) => s.replace(/\s+/g, " ").trim(),
  },
  {
    key: "ordinance_or_law",
    re: /(?:ordinance\s*(?:or\s*)?law)\s*[:#]?\s*(\d+\s*%|\$?\s*[\d,]{2,})/i,
    normalize: (s) => s.replace(/\s+/g, "").replace(/\$/g, ""),
  },
  {
    key: "water_backup",
    re: /(?:water\s*backup|backup\s*of\s*sewer)\s*[:#]?\s*(\$?\s*[\d,]+|included|none)/i,
    normalize: (s) => {
      const compact = s.replace(/\s+/g, "").replace(/\$/g, "");
      if (/included|none/i.test(s)) return s.trim().toLowerCase();
      const n = parseInt(compact.replace(/,/g, ""), 10);
      return Number.isFinite(n) ? String(n) : s.trim();
    },
  },
  {
    key: "hurricane_deductible",
    re: /(?:hurricane\s*ded(?:uctible)?|named\s*storm\s*ded(?:uctible)?)\s*[:#]?\s*(\$?\s*[\d,]+%?|\d+\s*%)/i,
    normalize: normalizeDeductible,
  },
  {
    key: "aop_deductible",
    re: /(?:aop\s*ded(?:uctible)?|all\s*other\s*perils(?:\s*ded(?:uctible)?)?)\s*[:#]?\s*(\$?\s*[\d,]+)/i,
    normalize: normalizeDeductible,
  },
  {
    key: "wind_hail_deductible",
    re: /(?:wind\s*(?:\/|and)?\s*hail\s*ded(?:uctible)?|wind\s*ded(?:uctible)?)\s*[:#]?\s*(\$?\s*[\d,]+%?|\d+\s*%)/i,
    normalize: normalizeDeductible,
  },
  {
    key: "policy_number",
    re: /(?:policy\s*(?:number|no\.?|#)|pol(?:icy)?\s*#)\s*[:#]?\s*([A-Z0-9][A-Z0-9\-]{4,})/i,
    normalize: (s) => s.replace(/\s+/g, "").toUpperCase(),
  },
  {
    key: "form",
    re: /(?:form(?:\s*type)?|policy\s*form)\s*[:#]?\s*(HO[-\s]?[3458]|DP[-\s]?\d)/i,
    normalize: (s) => s.replace(/\s+/g, "").toUpperCase().replace(/^(HO|DP)(\d)/, "$1-$2"),
  },
  {
    key: "effective_date",
    re: /(?:effective(?:\s*date)?|inception|policy\s*period)\s*[:#]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    normalize: normalizeDate,
  },
  {
    key: "expiration_date",
    re: /(?:expir(?:ation|es|y)(?:\s*date)?|policy\s*period\s*[:#]?\s*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\s*(?:to|through|[–-]))\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    normalize: normalizeDate,
  },
  {
    key: "current_premium",
    re: /(?:annual\s*premium|total\s*premium|premium)\s*[:#]?\s*\$?\s*([\d,]{3,})/i,
    normalize: normalizeMoney,
  },
  {
    key: "roof_shape",
    re: /(?:roof\s*shape|roof\s*geometry)\s*[:#]?\s*([a-z]+)/i,
    normalize: (s) => s.toLowerCase().trim(),
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

export function extractFieldsFromText(text: string): ExtractionResult {
  const quality = assessDocumentQuality(text);
  const fields: ExtractedField[] = [];

  for (const pattern of PATTERNS) {
    const match = pattern.re.exec(text);
    if (!match?.[1]) continue;
    if (isForbiddenLine(text, match)) continue;
    if (isMarketValueNoise(text, match, pattern.key)) continue;
    const rawValue = match[1].trim();
    const normalizedValue = pattern.normalize(rawValue);
    const uncertain =
      UNCERTAIN_VALUE.test(rawValue) || OCR_CONFUSION.test(rawValue);
    const source: ExtractedField["source"] = uncertain
      ? "uncertain"
      : "labeled";
    let confidence = source === "labeled" ? 0.94 : 0.58;
    confidence -= quality.penalty;
    if (uncertain) confidence -= 0.2;
    if (normalizedValue === "" || normalizedValue === "NaN") {
      confidence = Math.min(confidence, 0.4);
    }
    confidence = clamp(confidence, 0.05, 0.99);
    fields.push({
      fieldKey: pattern.key,
      label: FIELD_LABELS[pattern.key],
      rawValue,
      normalizedValue,
      confidence: round3(confidence),
      flagged: confidence < CONFIDENCE_THRESHOLD,
      source,
    });
  }

  return {
    fields,
    documentQuality: quality.messy ? "messy" : "clean",
    qualityNotes: quality.notes,
    glanceRequired: fields.some((f) => f.flagged),
  };
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
  const compact = raw.replace(/\s+/g, "").trim();
  if (/%/.test(compact)) return compact.replace(/[$,]/g, "");
  const n = parseInt(compact.replace(/[$,]/g, ""), 10);
  return Number.isFinite(n) ? String(n) : raw.trim();
}

function normalizeDate(raw: string): string {
  const parts = raw.split(/[\/\-]/).map((p) => p.trim());
  if (parts.length !== 3) return raw.trim();
  const [a, b, c] = parts;
  const year = c.length === 2 ? `20${c}` : c;
  const mm = a.padStart(2, "0");
  const dd = b.padStart(2, "0");
  if (!/^\d{2}$/.test(mm) || !/^\d{2}$/.test(dd) || !/^\d{4}$/.test(year)) return raw.trim();
  return `${mm}/${dd}/${year}`;
}

/** Never invent SSN or claims — skip those lines even if a dollar/id pattern matches. */
function isForbiddenLine(text: string, match: RegExpExecArray): boolean {
  const lineStart = text.lastIndexOf("\n", match.index) + 1;
  const lineEnd = text.indexOf("\n", match.index);
  const line = text.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
  return /social\s*security|\bssn\b|\btin\b|claim\s*(?:number|#|no)/i.test(line);
}

/** Never take Cov A / RCE from a Zestimate, Zillow list price, or AVM line. */
function isMarketValueNoise(
  text: string,
  match: RegExpExecArray,
  key: string,
): boolean {
  if (key !== "coverage_a" && key !== "replacement_cost_estimate") return false;
  if (MARKET_VALUE_NOISE.test(match[0])) return true;
  const lineStart = text.lastIndexOf("\n", match.index) + 1;
  const lineEnd = text.indexOf("\n", match.index);
  const line = text.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
  if (!MARKET_VALUE_NOISE.test(line)) return false;
  return !/(?:coverage\s*a|cov\.?\s*a|dwelling(?:\s*limit)?|replacement\s*cost|rce|msb)/i.test(
    line,
  );
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
