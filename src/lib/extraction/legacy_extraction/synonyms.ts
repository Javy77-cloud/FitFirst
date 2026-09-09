/**
 * Synonym dictionary for dec / 4-point / wind mitigation / related-insured docs.
 *
 * Prefer doc-type-scoped entries so Address / Occupancy / Name labels do not
 * collide across forms. Match the printed label, then take the value after the
 * first colon, dash, or equals — never the label or the question text. When two
 * synonyms overlap, the longer, more specific synonym wins; scoped entries beat
 * global ones for the active doc kind.
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
  /** When set, only apply for these doc kinds. Omit = all kinds. */
  docTypes?: SourceDocKind[];
  /** Also emit the same value onto these extract keys. */
  alsoWrite?: string[];
};

/** Shared / legacy targets. Doc-scoped rows below override collisions. */
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
    synonyms: ["Phone Number", "Primary Phone", "Agency Phone", "Cell Phone", "Phone"],
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
    synonyms: ["Dwelling Type"],
  },
  {
    fieldKey: "address",
    synonyms: [
      "Property Street Address",
      "Insured Location",
      "Property address",
      "Location",
    ],
  },
  {
    fieldKey: "city",
    // Skip literal "City: Fort Myers" value-line synonym — label is just City.
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
    synonyms: [
      "Roof Surfacing Material",
      "Covering Material",
      "Roof Covering",
      "Roof Material",
      "Roof type",
      "Roof cov",
    ],
  },
  {
    fieldKey: "roof_deck",
    synonyms: ["Roof Deck Attachment", "Roof Deck"],
  },
  {
    fieldKey: "roof_deck_attachment",
    synonyms: ["Wood Deck (Type II or III)"],
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
    fieldKey: "stories",
    synonyms: ["# of Stories", "Number of Stories", "Stories"],
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
    synonyms: [
      "Hurricane or Hurricane Deductible",
      "Hurricane deductible",
      "Hurricane Deductible",
      "Hurricane",
    ],
  },
  {
    fieldKey: "current_premium",
    synonyms: ["Total Annual Policy Premium", "Annual Premium", "Total Premium", "Current premium", "Premium"],
  },
  {
    fieldKey: "policy_number",
    synonyms: ["Policy Number", "Policy No", "Policy #"],
  },
  {
    fieldKey: "effective_date",
    synonyms: ["Policy Effective Date", "Effective Date", "Policy Effective"],
  },
  {
    fieldKey: "expiration_date",
    synonyms: ["Policy Expiration Date", "Expiration Date", "Policy Expiration"],
  },
];

/** Wind mitigation — Javy synonym list (scoped). */
export const WIND_MIT_SYNONYMS: SynonymEntry[] = [
  {
    fieldKey: "applicant_name",
    synonyms: ["Owner Name", "Owner's Name"],
    docTypes: ["wind_mit"],
  },
  {
    fieldKey: "applicant_address",
    synonyms: ["Address Inspected", "Address"],
    alsoWrite: ["mailing_address", "address"],
    docTypes: ["wind_mit"],
  },
  {
    fieldKey: "city",
    synonyms: ["City"],
    docTypes: ["wind_mit"],
  },
  {
    fieldKey: "zip",
    synonyms: ["Zip", "ZIP"],
    docTypes: ["wind_mit"],
  },
  {
    fieldKey: "county",
    synonyms: ["County"],
    docTypes: ["wind_mit"],
  },
  {
    fieldKey: "email",
    synonyms: ["Email"],
    docTypes: ["wind_mit"],
  },
  {
    fieldKey: "phone",
    synonyms: ["Cell Phone"],
    docTypes: ["wind_mit"],
  },
  {
    fieldKey: "year_built",
    synonyms: ["Year of Home", "Year Built"],
    docTypes: ["wind_mit"],
  },
  {
    fieldKey: "stories",
    synonyms: ["# of Stories", "Number of Stories", "Stories"],
    docTypes: ["wind_mit"],
  },
  {
    fieldKey: "wind_mit_inspector",
    synonyms: ["Qualified Inspector Name", "Inspector Name"],
    docTypes: ["wind_mit"],
  },
  {
    fieldKey: "license_or_certificate_number",
    synonyms: ["License or Certificate #", "License or Certificate Number", "License #"],
    docTypes: ["wind_mit"],
  },
  {
    fieldKey: "inspection_company",
    synonyms: ["Inspection Company"],
    docTypes: ["wind_mit"],
  },
  {
    fieldKey: "building_code",
    synonyms: ["Building Code"],
    docTypes: ["wind_mit"],
  },
];

/** Four-point — Javy synonym list (scoped). */
export const FOUR_POINT_SYNONYMS: SynonymEntry[] = [
  {
    fieldKey: "applicant_name",
    synonyms: ["Insured/Applicant Name", "Insured Name", "Applicant Name"],
    docTypes: ["four_point"],
  },
  {
    fieldKey: "applicant_address",
    synonyms: ["Address Inspected"],
    alsoWrite: ["address"],
    docTypes: ["four_point"],
  },
  {
    fieldKey: "year_built",
    synonyms: ["Actual Year Built", "Actual year built"],
    docTypes: ["four_point"],
  },
  {
    fieldKey: "date_inspected",
    synonyms: ["Four-Point Date", "Four Point Date", "4-Point Date", "4 Point Date"],
    alsoWrite: ["four_point_date"],
    docTypes: ["four_point"],
  },
  {
    fieldKey: "electrical_circuit_amps",
    synonyms: [
      "Electrical Circuit Amps",
      "Electrical Circuit Amp",
      "Electrical Amps",
      "Total Amps",
      "Total Amp",
      "Circuit Amps",
      "Circuit Amp",
      "Amps",
    ],
    docTypes: ["four_point"],
  },
  {
    fieldKey: "panel_age",
    synonyms: ["Panel Age", "Age of Electrical Panel", "Age of electrical panel"],
    docTypes: ["four_point"],
  },
  {
    fieldKey: "hvac_year",
    synonyms: ["Year Last Updated", "Year last updated", "HVAC Year"],
    docTypes: ["four_point"],
  },
  {
    fieldKey: "water_heater_age",
    synonyms: ["Age of Water Heater", "Age of water heater"],
    docTypes: ["four_point"],
  },
  {
    fieldKey: "plumbing_original",
    synonyms: ["Original to Home", "Original to home"],
    docTypes: ["four_point"],
  },
  {
    fieldKey: "roof_covering",
    synonyms: ["Covering Material", "Roof Covering", "Roof covering"],
    docTypes: ["four_point"],
  },
  {
    fieldKey: "roof_year",
    synonyms: [
      "Date of Last Roofing Permit",
      "Covering Date",
      "Roof Covering Date",
      "Roof Year",
    ],
    docTypes: ["four_point"],
  },
];

/** Dec page — Javy synonym list (scoped; Address / Occupancy do not collide). */
export const DEC_SYNONYMS: SynonymEntry[] = [
  {
    fieldKey: "mailing_address",
    synonyms: ["Insured Name"],
    docTypes: ["dec"],
  },
  {
    fieldKey: "applicant_address",
    synonyms: ["Residence Premises", "Residence premises"],
    alsoWrite: ["address"],
    docTypes: ["dec"],
  },
  {
    fieldKey: "months_occupied",
    synonyms: ["Occupancy", "Occ"],
    alsoWrite: ["occupancy"],
    docTypes: ["dec"],
  },
  {
    fieldKey: "usage",
    synonyms: ["Type of Residence"],
    docTypes: ["dec"],
  },
  {
    fieldKey: "entity_type",
    synonyms: ["Dwelling Type"],
    docTypes: ["dec"],
  },
  {
    fieldKey: "construction",
    synonyms: ["Construction Type", "Construction"],
    docTypes: ["dec"],
  },
  {
    fieldKey: "coverage_a",
    synonyms: ["Coverage A - Dwelling", "Coverage A – Dwelling", "Coverage A Dwelling"],
    docTypes: ["dec"],
  },
  {
    fieldKey: "ordinance_or_law",
    synonyms: ["Ordinance or Law", "Ordinance or law"],
    docTypes: ["dec"],
  },
  {
    fieldKey: "water_backup",
    synonyms: [
      "Water Backup and Sump Overflow Coverage",
      "Water Backup",
      "Water backup",
    ],
    docTypes: ["dec"],
  },
  {
    fieldKey: "scheduled_personal_property",
    synonyms: ["Personal Property Replacement Cost"],
    docTypes: ["dec"],
  },
  {
    fieldKey: "hurricane_deductible",
    synonyms: ["Hurricane or Hurricane Deductible", "Hurricane Deductible", "Hurricane"],
    docTypes: ["dec"],
  },
  {
    fieldKey: "aop_deductible",
    synonyms: ["All Other Perils", "AOP", "AOP deductible"],
    docTypes: ["dec"],
  },
  {
    fieldKey: "wind_hail_deductible",
    synonyms: [
      "Windstorm or Hail",
      "Other Than Hurricane",
      "Wind / Hail",
      "Wind/Hail",
      "Wind Hail",
    ],
    docTypes: ["dec"],
  },
  {
    fieldKey: "current_policy_named_insured",
    synonyms: ["Name Insured", "Named Insured", "Primary named insured"],
    alsoWrite: ["named_insured"],
    docTypes: ["dec"],
  },
  {
    fieldKey: "policy_number",
    synonyms: ["Policy Number"],
    docTypes: ["dec"],
  },
  {
    fieldKey: "current_premium",
    synonyms: ["Total Annual Policy Premium", "Annual Premium"],
    docTypes: ["dec"],
  },
  {
    fieldKey: "effective_date",
    synonyms: ["Policy Effective Date", "Effective Date"],
    docTypes: ["dec"],
  },
  {
    fieldKey: "expiration_date",
    synonyms: ["Policy Expiration Date", "Expiration Date"],
    docTypes: ["dec"],
  },
  {
    fieldKey: "mortgagee",
    synonyms: [
      "First Mortgagee",
      "Additional Interest",
      "Mortgagee",
      "Mortgagee Clause",
    ],
    docTypes: ["dec"],
  },
  {
    fieldKey: "loan_number",
    synonyms: ["Loan Number", "Loan #"],
    docTypes: ["dec"],
  },
];

export const DOC_SCOPED_SYNONYMS: Record<SourceDocKind, SynonymEntry[]> = {
  wind_mit: WIND_MIT_SYNONYMS,
  four_point: FOUR_POINT_SYNONYMS,
  dec: DEC_SYNONYMS,
  related_insured: [],
};

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
  docTypes?: SourceDocKind[];
  alsoWrite?: string[];
  scoped: boolean;
};

function compactLabel(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeHaystack(raw: string): string {
  return raw.replace(/[–—]/g, "-").replace(/\s+/g, " ");
}

function prepareEntries(entries: SynonymEntry[], scoped: boolean): PreparedSynonym[] {
  return entries.flatMap((entry) =>
    entry.synonyms.map((synonym) => {
      const trimmed = synonym.trim();
      const endsWithDelim = /[:–—=\-]\s*$/.test(trimmed);
      const core = trimmed.replace(/[:–—=\-]\s*$/, "").trim();
      return {
        fieldKey: entry.fieldKey,
        synonym: trimmed,
        needle: normalizeHaystack(core).toLowerCase(),
        endsWithDelim,
        docTypes: entry.docTypes,
        alsoWrite: entry.alsoWrite,
        scoped,
      };
    }),
  );
}

/** Active dictionary for a doc kind: scoped rows first, then global. */
export function synonymEntriesFor(kind?: SourceDocKind | null): SynonymEntry[] {
  const scoped = kind ? DOC_SCOPED_SYNONYMS[kind] ?? [] : [];
  return [...scoped, ...SYNONYM_DICTIONARY];
}

function preparedFor(kind?: SourceDocKind | null): PreparedSynonym[] {
  const scoped = kind ? prepareEntries(DOC_SCOPED_SYNONYMS[kind] ?? [], true) : [];
  const global = prepareEntries(SYNONYM_DICTIONARY, false);
  return [...scoped, ...global].sort((a, b) => {
    const lenDelta = b.needle.length - a.needle.length;
    if (lenDelta !== 0) return lenDelta;
    if (a.scoped !== b.scoped) return a.scoped ? -1 : 1;
    return 0;
  });
}

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
  // Adjacent blank label pulled as value: "Cell Phone:" / "Email:"
  if (/^[A-Za-z][A-Za-z0-9/# ]{0,40}:\s*$/.test(v)) return true;
  // OIR option-body prose (not a filled answer)
  if (
    v.length > 80 ||
    /glazed openings|permit application|roof sheathing|truss\/rafter|product approval/i.test(v)
  ) {
    return true;
  }
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

function entryApplies(row: PreparedSynonym, kind?: SourceDocKind | null): boolean {
  if (!row.docTypes || row.docTypes.length === 0) return true;
  if (!kind) return true;
  return row.docTypes.includes(kind);
}

/**
 * All synonym hits on one line. Overlapping hits keep the longer synonym;
 * doc-scoped rows beat global when both match.
 */
export function matchSynonymsOnLine(
  line: string,
  kind?: SourceDocKind | null,
): SynonymMatch[] {
  const original = line.replace(/\s+/g, " ").trim();
  if (!original) return [];
  const haystack = normalizeHaystack(original);
  const haystackLower = haystack.toLowerCase();
  const candidates: Array<SynonymMatch & { scoped: boolean; alsoWrite?: string[] }> = [];

  for (const row of preparedFor(kind)) {
    if (!entryApplies(row, kind)) continue;
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
        scoped: row.scoped,
        alsoWrite: row.alsoWrite,
      });
      from = afterNeedle;
    }
  }

  return expandAlsoWrite(resolveOverlaps(candidates, haystack));
}

function expandAlsoWrite(
  hits: Array<SynonymMatch & { alsoWrite?: string[] }>,
): SynonymMatch[] {
  const out: SynonymMatch[] = [];
  for (const hit of hits) {
    const { alsoWrite: _aw, ...base } = hit as SynonymMatch & { alsoWrite?: string[] };
    out.push(base);
    for (const extra of hit.alsoWrite ?? []) {
      out.push({ ...base, fieldKey: extra });
    }
  }
  return out;
}

function resolveOverlaps(
  candidates: Array<SynonymMatch & { scoped: boolean; alsoWrite?: string[] }>,
  haystack: string,
): Array<SynonymMatch & { alsoWrite?: string[] }> {
  const ranked = [...candidates].sort((a, b) => {
    const lenDelta = b.synonym.length - a.synonym.length;
    if (lenDelta !== 0) return lenDelta;
    if (a.scoped !== b.scoped) return a.scoped ? -1 : 1;
    return a.start - b.start;
  });
  const kept: Array<SynonymMatch & { alsoWrite?: string[] }> = [];
  const claimed: Array<{ start: number; end: number }> = [];

  for (const hit of ranked) {
    const synonymEnd = hit.start + normalizeHaystack(hit.synonym.replace(/[:–—=\-]\s*$/, "")).length;
    const overlaps = claimed.some((span) => hit.start < span.end && synonymEnd > span.start);
    if (overlaps) continue;
    const nextStart = nextHitStart(ranked, hit, claimed, synonymEnd);
    const sliced = sliceValueUntil(haystack, hit, synonymEnd, nextStart);
    kept.push({ ...sliced, alsoWrite: hit.alsoWrite });
    claimed.push({ start: hit.start, end: Math.max(synonymEnd, sliced.end) });
  }

  return kept.sort((a, b) => a.start - b.start);
}

function nextHitStart(
  ranked: SynonymMatch[],
  current: SynonymMatch,
  _claimed: Array<{ start: number; end: number }>,
  synonymEnd: number,
): number {
  // Always cut at the next synonym label on the line — even if that label was
  // already claimed (longer synonyms are ranked first). Skipping claimed hits
  // caused "County: Cell Phone:" to pull "Cell Phone:" into county.
  let next = Number.POSITIVE_INFINITY;
  for (const other of ranked) {
    if (other === current) continue;
    if (other.start < synonymEnd) continue;
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

export function matchSynonymsInText(
  text: string,
  kind?: SourceDocKind | null,
): SynonymMatch[] {
  const hits: SynonymMatch[] = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i] ?? "";
    for (const hit of matchSynonymsOnLine(rawLine, kind)) {
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
export function bestSynonymValues(
  text: string,
  kind?: SourceDocKind | null,
): Map<string, SynonymMatch> {
  const byKey = new Map<string, SynonymMatch>();
  for (const hit of matchSynonymsInText(text, kind)) {
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

export function synonymFieldKeys(kind?: SourceDocKind | null): Set<string> {
  return new Set(synonymEntriesFor(kind).map((row) => row.fieldKey));
}

/** Printed labels tried for a field — Why drawer blanks. */
export function synonymsForField(fieldKey: string, kind?: SourceDocKind | null): string[] {
  const out: string[] = [];
  for (const row of synonymEntriesFor(kind)) {
    if (row.fieldKey === fieldKey) out.push(...row.synonyms);
  }
  return out;
}
