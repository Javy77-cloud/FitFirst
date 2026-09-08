/**
 * Synonym dictionary for dec / 4-point / wind mitigation / related-insured docs.
 *
 * Match the printed label (or an alternate the form actually uses), then take
 * the value after the first colon, dash, or equals on that line — never the
 * label or the question text. When two synonyms overlap, the longer, more
 * specific synonym wins.
 */

export const SOURCE_DOC_TAGS = {
  four_point: "4pt inspection",
  wind_mit: "wind mitigation",
  dec: "dec page",
  related_insured: "related insured",
} as const;

export type SourceDocKind = keyof typeof SOURCE_DOC_TAGS;

export type SynonymEntry = {
  fieldKey: string;
  synonyms: string[];
};

/** Target field → labels documents actually print. Longer phrases first at lookup. */
export const SYNONYM_DICTIONARY: SynonymEntry[] = [
  {
    fieldKey: "named_insured",
    synonyms: [
      "Insured Name and Mailing",
      "Applicant's Legal Name",
      "Applicant Last Name",
      "Named Insured",
      "Primary named insured",
      "Applicant name",
      "Name",
    ],
  },
  {
    fieldKey: "phone",
    synonyms: ["Phone Number", "Primary Phone", "Agency Phone", "Phone"],
  },
  {
    fieldKey: "email",
    synonyms: ["E-Mail", "Email Address", "Email"],
  },
  {
    fieldKey: "dob",
    synonyms: ["Applicant's Date of Birth", "Date of Birth", "DOB"],
  },
  {
    fieldKey: "entity_type",
    synonyms: ["Type of Residence", "Dwelling Type"],
  },
  {
    fieldKey: "address",
    synonyms: [
      "Property Street Address",
      "Residence Premises",
      "Insured Location",
      "Property address",
      "Mailing Address",
      "Location",
    ],
  },
  {
    fieldKey: "city",
    synonyms: ["City, State, and Zip Code", "Location city", "City"],
  },
  {
    fieldKey: "zip",
    synonyms: ["Zip Code", "Postal code", "Zip"],
  },
  {
    fieldKey: "county",
    synonyms: ["County"],
  },
  {
    fieldKey: "year_built",
    synonyms: [
      "Year Built / Updated",
      "Year of Construction",
      "Actual year built",
      "Year Built",
      "Yr Built",
      "Yr Blt",
    ],
  },
  {
    fieldKey: "square_feet",
    synonyms: ["Total Square Footage", "Sq Footage", "Square Feet", "Sq ft", "Living area"],
  },
  {
    fieldKey: "construction",
    synonyms: ["Construction Type", "Construction", "Frame", "Masonry"],
  },
  {
    fieldKey: "roof_year",
    synonyms: ["Year of Roof/Updated", "Roof Replaced", "Year of roof", "Roof Year"],
  },
  {
    fieldKey: "roof_shape",
    synonyms: ["Roof Shape:", "Roof Shape", "Roof geometry"],
  },
  {
    fieldKey: "roof_covering",
    synonyms: ["Roof Surfacing Material", "Roof Covering", "Roof Material", "Roof type", "Roof cov"],
  },
  {
    fieldKey: "roof_deck",
    synonyms: ["Roof Deck Attachment", "Roof Deck"],
  },
  {
    fieldKey: "roof_deck_attachment",
    synonyms: ["Wood Deck (Type II or III)", "Roof Deck Attachment"],
  },
  {
    fieldKey: "roof_to_wall",
    synonyms: ["Roof-to-Wall Connection", "Roof to Wall Attachment", "Roof to wall"],
  },
  {
    fieldKey: "opening_protection",
    synonyms: ["Opening Protection", "Opn prot", "Shutters"],
  },
  {
    fieldKey: "wind_speed",
    synonyms: ["FBC Wind Speed", "Design wind speed", "Wind speed"],
  },
  {
    fieldKey: "terrain",
    synonyms: ["Terrain"],
  },
  {
    fieldKey: "occupancy",
    synonyms: ["Occupancy", "Occ"],
  },
  {
    fieldKey: "coverage_a",
    synonyms: [
      "Coverage A – Dwelling",
      "Coverage A - Dwelling",
      "Coverage A Dwelling",
      "Coverage A",
      "Dwelling limit",
      "Building limit",
      "Cov A",
      "Dwelling",
    ],
  },
  {
    fieldKey: "coverage_b",
    synonyms: [
      "Coverage B – Other Structures",
      "Coverage B - Other Structures",
      "Coverage B Other Structures",
      "Other Structures",
      "Coverage B",
      "Cov B",
    ],
  },
  {
    fieldKey: "coverage_c",
    synonyms: [
      "Coverage C – Personal Property",
      "Coverage C - Personal Property",
      "Coverage C Personal Property",
      "Personal Property",
      "Coverage C",
      "Cov C",
    ],
  },
  {
    fieldKey: "coverage_d",
    synonyms: [
      "Coverage D – Loss of Use",
      "Coverage D - Loss of Use",
      "Coverage D Loss of Use",
      "Loss of Use",
      "Coverage D",
      "Cov D",
    ],
  },
  {
    fieldKey: "aop_deductible",
    synonyms: ["All Other Perils", "AOP deductible", "AOP", "Deductibles"],
  },
  {
    fieldKey: "hurricane_deductible",
    synonyms: ["Hurricane deductible", "Hurricane"],
  },
  {
    fieldKey: "current_premium",
    synonyms: ["Total Annual Policy Premium", "Annual Premium", "Total Premium", "Current premium", "Premium"],
  },
];

export type SynonymMatch = {
  fieldKey: string;
  synonym: string;
  value: string;
  /** Label matched but nothing usable after the delimiter. */
  blank: boolean;
  /** Why blank — used for synonym_candidates (no_synonym / no_delimiter only). */
  blankReason?: "no_delimiter" | "unusable_question" | null;
  start: number;
  end: number;
  sourceLine?: string;
  sourceLineNo?: number;
};

const CHECKBOX_MARKERS = /[☐☑☒□■▢▣]|\[\s*[xX ]\s*\]|\(\s*[xX ]\s*\)/g;
const VALUE_DELIM = /[:–—=\-]/;
const QUESTION_VALUE =
  /^(what|which|who|where|when|how|why|is|are|describe|list|select|choose|activities)\b/i;

type PreparedSynonym = {
  fieldKey: string;
  synonym: string;
  needle: string;
  endsWithDelim: boolean;
};

function compactLabel(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeHaystack(raw: string): string {
  return raw.replace(/[–—]/g, "-").replace(/\s+/g, " ");
}

const PREPARED: PreparedSynonym[] = SYNONYM_DICTIONARY.flatMap((entry) =>
  entry.synonyms.map((synonym) => {
    const trimmed = synonym.trim();
    const endsWithDelim = /[:–—=\-]\s*$/.test(trimmed);
    const core = trimmed.replace(/[:–—=\-]\s*$/, "").trim();
    return {
      fieldKey: entry.fieldKey,
      synonym: trimmed,
      needle: normalizeHaystack(core).toLowerCase(),
      endsWithDelim,
    };
  }),
).sort((a, b) => b.needle.length - a.needle.length);

export function stripCheckboxMarkers(raw: string): string {
  return raw.replace(CHECKBOX_MARKERS, " ").replace(/\s+/g, " ").trim();
}

export function valueAfterDelimiter(rest: string): { value: string; hasDelimiter: boolean } {
  const trimmed = rest.replace(/^\s+/, "");
  if (!trimmed) return { value: "", hasDelimiter: false };
  const first = trimmed[0];
  if (!VALUE_DELIM.test(first)) return { value: "", hasDelimiter: false };
  return { value: stripCheckboxMarkers(trimmed.slice(1)), hasDelimiter: true };
}

export function isUnusableExtractValue(value: string, synonym = ""): boolean {
  const v = stripCheckboxMarkers(value);
  if (!v) return true;
  if (QUESTION_VALUE.test(v)) return true;
  const compactV = compactLabel(v);
  const compactS = compactLabel(synonym);
  if (compactV && compactS && compactV === compactS) return true;
  return false;
}

function isWordBoundary(haystack: string, index: number): boolean {
  if (index <= 0) return true;
  return /[^a-z0-9]/i.test(haystack[index - 1] ?? "");
}

function findNeedle(haystackLower: string, needle: string, from: number): number {
  let idx = haystackLower.indexOf(needle, from);
  while (idx !== -1) {
    if (isWordBoundary(haystackLower, idx)) return idx;
    idx = haystackLower.indexOf(needle, idx + 1);
  }
  return -1;
}

/**
 * All synonym hits on one line. Overlapping hits keep the longer synonym.
 */
export function matchSynonymsOnLine(line: string): SynonymMatch[] {
  const original = line.replace(/\s+/g, " ").trim();
  if (!original) return [];
  const haystack = normalizeHaystack(original);
  const haystackLower = haystack.toLowerCase();
  const candidates: SynonymMatch[] = [];

  for (const row of PREPARED) {
    let from = 0;
    while (from < haystackLower.length) {
      const idx = findNeedle(haystackLower, row.needle, from);
      if (idx === -1) break;
      const afterNeedle = idx + row.needle.length;
      const rest = haystack.slice(afterNeedle);
      const pulled = valueAfterDelimiter(rest);
      const nextChar = rest.match(/^\s*(.)/)?.[1] ?? "";
      const delimOk =
        pulled.hasDelimiter || (row.endsWithDelim && (!nextChar || /[^a-z0-9]/i.test(nextChar)));
      if (!delimOk) {
        from = idx + 1;
        continue;
      }
      candidates.push({
        fieldKey: row.fieldKey,
        synonym: row.synonym,
        value: "",
        blank: true,
        start: idx,
        end: afterNeedle,
      });
      from = afterNeedle;
    }
  }

  return resolveOverlaps(candidates, haystack);
}

function resolveOverlaps(candidates: SynonymMatch[], haystack: string): SynonymMatch[] {
  const ranked = [...candidates].sort((a, b) => {
    const lenDelta = b.synonym.length - a.synonym.length;
    if (lenDelta !== 0) return lenDelta;
    return a.start - b.start;
  });
  const kept: SynonymMatch[] = [];
  const claimed: Array<{ start: number; end: number }> = [];

  for (const hit of ranked) {
    const synonymEnd = hit.start + normalizeHaystack(hit.synonym.replace(/[:–—=\-]\s*$/, "")).length;
    const overlaps = claimed.some((span) => hit.start < span.end && synonymEnd > span.start);
    if (overlaps) continue;
    const nextStart = nextHitStart(ranked, hit, claimed, synonymEnd);
    const sliced = sliceValueUntil(haystack, hit, synonymEnd, nextStart);
    kept.push(sliced);
    claimed.push({ start: hit.start, end: Math.max(synonymEnd, sliced.end) });
  }

  return kept.sort((a, b) => a.start - b.start);
}

function nextHitStart(
  ranked: SynonymMatch[],
  current: SynonymMatch,
  claimed: Array<{ start: number; end: number }>,
  synonymEnd: number,
): number {
  let next = Number.POSITIVE_INFINITY;
  for (const other of ranked) {
    if (other === current) continue;
    if (other.start < synonymEnd) continue;
    const otherSynEnd = other.start + normalizeHaystack(other.synonym.replace(/[:–—=\-]\s*$/, "")).length;
    const overlapsClaimed = claimed.some((span) => other.start < span.end && otherSynEnd > span.start);
    if (overlapsClaimed) continue;
    next = Math.min(next, other.start);
  }
  return next;
}

function sliceValueUntil(
  haystack: string,
  hit: SynonymMatch,
  synonymEnd: number,
  nextStart: number,
): SynonymMatch {
  const rest = haystack.slice(synonymEnd, Number.isFinite(nextStart) ? nextStart : undefined);
  const pulled = valueAfterDelimiter(rest);
  const raw = pulled.hasDelimiter ? pulled.value : "";
  let blankReason: SynonymMatch["blankReason"] = null;
  if (!pulled.hasDelimiter || !raw.trim()) blankReason = "no_delimiter";
  else if (isUnusableExtractValue(raw, hit.synonym)) blankReason = "unusable_question";
  const blank = blankReason != null;
  const value = blank ? "" : stripCheckboxMarkers(raw);
  return {
    ...hit,
    value,
    blank,
    blankReason,
    end: Number.isFinite(nextStart) ? nextStart : synonymEnd + rest.length,
  };
}

export function matchSynonymsInText(text: string): SynonymMatch[] {
  const hits: SynonymMatch[] = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i] ?? "";
    for (const hit of matchSynonymsOnLine(rawLine)) {
      hits.push({
        ...hit,
        sourceLine: rawLine.replace(/\s+/g, " ").trim(),
        sourceLineNo: i + 1,
      });
    }
  }
  return hits;
}

/** One value per field. First non-blank wins (document order). */
export function bestSynonymValues(text: string): Map<string, SynonymMatch> {
  const byKey = new Map<string, SynonymMatch>();
  for (const hit of matchSynonymsInText(text)) {
    const existing = byKey.get(hit.fieldKey);
    if (!existing) {
      byKey.set(hit.fieldKey, hit);
      continue;
    }
    if (existing.blank && !hit.blank) byKey.set(hit.fieldKey, hit);
  }
  return byKey;
}

export function sourceDocumentTag(docType?: string | null): string {
  const kind = inferSourceDocKind("", docType);
  return SOURCE_DOC_TAGS[kind];
}

export function inferSourceDocKind(text: string, docType?: string | null): SourceDocKind {
  const declared = (docType ?? "").trim().toLowerCase();
  if (declared === "four_point" || declared === "4_point" || declared === "4pt") return "four_point";
  if (declared === "wind_mit" || declared === "wind_mitigation") return "wind_mit";
  if (declared === "related_insured" || declared === "related") return "related_insured";
  if (declared === "dec" || declared === "policy" || declared === "current_policy") return "dec";

  const blob = text.slice(0, 2400);
  if (/homeowners\s+declarations|declaration(?:s)?\s+page/i.test(blob)) return "dec";
  if (/related\s+insured|applicant'?s\s+legal\s+name|insured\s+name\s+and\s+mailing/i.test(blob)) {
    return "related_insured";
  }
  if (/wind\s*mit|oir[\s-]?b[\s-]?1[\s-]?1?802/i.test(blob)) return "wind_mit";
  if (/4[\s-]*point|four[\s-]*point/i.test(blob)) return "four_point";
  return "dec";
}

export function synonymFieldKeys(): Set<string> {
  return new Set(SYNONYM_DICTIONARY.map((row) => row.fieldKey));
}

/** Printed labels tried for a field — Why drawer blanks. */
export function synonymsForField(fieldKey: string): string[] {
  return SYNONYM_DICTIONARY.find((row) => row.fieldKey === fieldKey)?.synonyms ?? [];
}
