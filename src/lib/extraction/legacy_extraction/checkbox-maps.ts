/**
 * Wind mitigation OIR checkbox maps — checked letter / option → sheet value.
 * Deterministic only. Unchecked sections stay blank.
 *
 * Handles both OCR text (☑/☒ markers) and typical FL OIR pdf_text shapes
 * (□ empty boxes, letter lines, X tokens, DMI caption / deficiency phrases).
 */

export type CheckboxOption = {
  /** Printed letter or region digit (A, B, 1, N, …). */
  letter?: string;
  /** Alternate printed option text (no letter). */
  labels?: string[];
  value: string;
};

export type CheckboxMap = {
  fieldKey: string;
  sectionSynonyms: string[];
  options: CheckboxOption[];
  /** When set, letter-only matches are skipped (e.g. roof covering material vs 4.2 A/B/C). */
  labelsOnly?: boolean;
};

const SELECTED =
  /(?:☑|☒|■|▣|✓|✔|\[[xX]\]|\([xX]\)|(?<![a-z])checked(?![a-z]))/i;

const EMPTY_BOX = /(?:☐|□|\[\s*\]|\(\s*\))/;

export const WIND_MIT_CHECKBOX_MAPS: CheckboxMap[] = [
  {
    fieldKey: "building_code",
    sectionSynonyms: ["Building Code", "Building code"],
    options: [
      { letter: "A", value: "A" },
      { letter: "B", value: "B" },
      { letter: "C", value: "C" },
      { letter: "D", value: "D" },
    ],
  },
  {
    fieldKey: "wind_speed",
    sectionSynonyms: ["Region", "Design Wind Speed", "Design wind speed", "Wind Speed"],
    options: [
      { letter: "1", labels: ["Region 1", "≥ 140", ">= 140"], value: "140" },
      { letter: "2", labels: ["Region 2", "130 mph – 139", "130 mph - 139"], value: "130" },
      { letter: "3", labels: ["Region 3", "< 130"], value: "130" },
      { labels: ["HVHZ"], value: "HVHZ" },
    ],
  },
  {
    fieldKey: "roof_covering",
    sectionSynonyms: ["Roof Covering Type", "Roof Covering", "Roof covering", "Roof Material"],
    labelsOnly: true,
    options: [
      {
        labels: [
          "Asphalt/Fiberglass Shingle",
          "Asphalt/Fiberglass",
          "Architectural/Dimensional Shingle",
          "Architectural Shingle",
          "Dimensional Shingle",
          "Asphalt Shingle",
          "Fiberglass Shingle",
        ],
        value: "Asphalt/Fiberglass Shingle",
      },
      {
        labels: ["Concrete/Clay Tile", "Concrete Tile", "Clay Tile"],
        value: "Concrete/Clay Tile",
      },
      { labels: ["Metal"], value: "Metal" },
      {
        labels: ["Built Up/Rolled Asphalt", "Built Up", "Built-Up", "Rolled Asphalt"],
        value: "Built Up",
      },
      {
        labels: ["Synthetic/Composite Tile", "Synthetic Tile", "Composite Tile"],
        value: "Synthetic/Composite Tile",
      },
      { labels: ["Membrane"], value: "Membrane" },
    ],
  },
  {
    fieldKey: "roof_deck_attachment",
    sectionSynonyms: ["Roof Deck Attachment", "Roof deck attachment", "Roof Deck"],
    options: [
      { letter: "A", value: "A" },
      { letter: "B", value: "B" },
      { letter: "C", value: "C" },
      { letter: "D", value: "D" },
      { letter: "E", value: "E" },
      { letter: "F", value: "F" },
      { letter: "G", value: "G" },
      { letter: "H", value: "H" },
    ],
  },
  {
    fieldKey: "roof_to_wall",
    sectionSynonyms: [
      "Roof to Wall Attachment",
      "Roof to Wall Connection",
      "Roof-to-Wall Connection",
      "Roof to wall",
    ],
    options: [
      { letter: "A", labels: ["Toenails"], value: "toenails" },
      { letter: "B", labels: ["Clips"], value: "clips" },
      { letter: "C", labels: ["Single Wraps", "Single Wrap"], value: "single wraps" },
      { letter: "D", labels: ["Double Wraps", "Double Wrap"], value: "double wraps" },
      { letter: "E", labels: ["Structural"], value: "structural" },
      { letter: "F", value: "other" },
      { letter: "G", value: "unknown" },
      { letter: "H", labels: ["No attic access"], value: "no attic access" },
    ],
  },
  {
    fieldKey: "roof_shape",
    sectionSynonyms: ["Roof Geometry", "Roof geometry", "Roof Shape", "Roof Shape:"],
    options: [
      { letter: "A", labels: ["Hip Roof", "Hip"], value: "hip" },
      { letter: "B", labels: ["Flat Roof", "Flat"], value: "flat" },
      { letter: "C", labels: ["Other Roof", "Other roof"], value: "other" },
    ],
  },
  {
    fieldKey: "swr",
    sectionSynonyms: [
      "Secondary Water Resistance",
      "Secondary water resistance",
      "Sealed Roof Deck/Secondary Water Resistance",
      "Sealed Roof Deck",
      "SWR",
    ],
    options: [
      { letter: "A", labels: ["Sealed Roof Deck (also called SWR)", "Sealed Roof Deck"], value: "A" },
      { letter: "B", labels: ["No Sealed Roof Deck"], value: "B" },
      { letter: "C", labels: ["Unknown or undetermined"], value: "C" },
    ],
  },
  {
    fieldKey: "opening_protection",
    sectionSynonyms: ["Opening Protection", "Opening protection", "Opn prot"],
    options: [
      { letter: "A", value: "A" },
      { letter: "B", value: "B" },
      { letter: "C", value: "C" },
      { letter: "N", value: "N" },
      { letter: "X", value: "X" },
    ],
  },
];

export type CheckboxHit = {
  fieldKey: string;
  value: string;
  section: string;
  matchedOption: string;
  sourceLine?: string;
  sourceLineNo?: number;
};

function compact(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function lineHasSelectedMarker(line: string): boolean {
  return SELECTED.test(line);
}

function lineHasEmptyBox(line: string): boolean {
  return EMPTY_BOX.test(line);
}

/** True when the line looks like a chosen option (selected marker, or X glued to letter). */
function lineLooksSelected(line: string): boolean {
  if (lineHasSelectedMarker(line)) return true;
  // "X A." / "XA." / "X) A" style from some extractors
  if (/(?:^|[^a-z0-9])X\s*[A-HN1-3](?:\s*[.)\-]|\b)/i.test(line)) return true;
  return false;
}

function letterOnLine(letter: string, line: string): boolean {
  return new RegExp(
    `(?:^|[^a-z0-9])${letter}(?:\\s*[.)\\-:]|\\b)`,
    "i",
  ).test(line);
}

function labelOnLine(label: string, line: string): boolean {
  return line.toLowerCase().includes(label.toLowerCase());
}

function optionTouchesLine(option: CheckboxOption, line: string, labelsOnly: boolean): boolean {
  if (!labelsOnly && option.letter && letterOnLine(option.letter, line)) return true;
  for (const label of option.labels ?? []) {
    if (labelOnLine(label, line)) return true;
  }
  return false;
}

function optionIsSelectedOnLine(
  option: CheckboxOption,
  line: string,
  prevLine: string,
  labelsOnly: boolean,
): boolean {
  if (!optionTouchesLine(option, line, labelsOnly)) return false;

  // Opening-protection option "X" is easy to confuse with chart check marks.
  // Require an explicit checkbox glyph, not a bare X token.
  if (option.letter?.toUpperCase() === "X") {
    if (/(?:☑|☒|■|▣|✓|✔|\[[xX]\]|\([xX]\))/.test(line)) return true;
    if (prevLine && /(?:☑|☒|■|▣|✓|✔|\[[xX]\]|\([xX]\))/.test(prevLine) && letterOnLine("X", line)) {
      return true;
    }
    return false;
  }

  // Classic: selected marker on the option line
  if (lineLooksSelected(line) && !lineHasEmptyBox(line)) return true;
  if (lineLooksSelected(line) && lineHasEmptyBox(line)) {
    // Both empty and selected tokens can appear on dense Region lines —
    // require the selected token near this option's letter/label.
    if (option.letter) {
      const near = new RegExp(
        `(?:☑|☒|■|▣|✓|✔|\\[[xX]\\]|\\([xX]\\)|(?:^|[^a-z0-9])x)\\s*[^\\n]{0,12}${option.letter}(?:\\s*[.)\\-:]|\\b)|${option.letter}(?:\\s*[.)\\-:]|\\b)[^\\n]{0,8}(?:☑|☒|■|▣|✓|✔)`,
        "i",
      );
      if (near.test(line)) return true;
    }
    for (const label of option.labels ?? []) {
      const near = new RegExp(
        `(?:☑|☒|■|▣|✓|✔|\\[[xX]\\]|\\([xX]\\)|(?:^|[^a-z0-9])x)\\s*[^\\n]{0,20}${escapeRe(label)}`,
        "i",
      );
      if (near.test(line)) return true;
    }
  }

  // Marker on previous line, letter/label on this line: "☑\n B. Clips" or "X\n A. Hip"
  if (prevLine && lineLooksSelected(prevLine) && !lineHasEmptyBox(prevLine)) {
    if (!labelsOnly && option.letter && letterOnLine(option.letter, line)) return true;
    for (const label of option.labels ?? []) {
      if (labelOnLine(label, line)) return true;
    }
  }

  // Header style "Building Code: B" / "Region: 1"
  if (option.letter && new RegExp(`[:#]\\s*${option.letter}\\b`, "i").test(line)) return true;

  // Bare selected letter line with no empty box — only when clearly an option row
  if (
    !lineHasEmptyBox(line) &&
    lineLooksSelected(line) === false &&
    option.letter &&
    new RegExp(`^\\s*${option.letter}\\s*[.)\\-]`, "i").test(line) &&
    lineHasSelectedMarker(prevLine)
  ) {
    return true;
  }

  return false;
}

function escapeRe(raw: string): string {
  return raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findSectionWindow(
  lines: string[],
  synonyms: string[],
): { start: number; end: number; synonym: string } | null {
  const needles = synonyms
    .map((s) => ({ raw: s, compact: compact(s) }))
    .sort((a, b) => b.compact.length - a.compact.length);

  for (let i = 0; i < lines.length; i++) {
    const compactLine = compact(lines[i] ?? "");
    for (const needle of needles) {
      if (!needle.compact || !compactLine.includes(needle.compact)) continue;
      // Avoid matching the tiny "Region" inside body copy far from Q2 —
      // require the section-ish line to be short or start with the synonym / question number.
      if (needle.compact === "region") {
        const raw = (lines[i] ?? "").trim();
        if (!/^\s*2?[.)]?\s*Region\b/i.test(raw) && !/^Region\s*:/i.test(raw)) continue;
      }
      let end = Math.min(lines.length, i + 28);
      for (let j = i + 1; j < end; j++) {
        const next = compact(lines[j] ?? "");
        const hitsOtherSection = WIND_MIT_CHECKBOX_MAPS.some((map) => {
          if (map.sectionSynonyms.some((s) => compact(s) === needle.compact)) return false;
          return map.sectionSynonyms.some((s) => {
            const c = compact(s);
            return c.length >= 6 && (next.startsWith(c) || next.includes(c));
          });
        });
        // Also stop at numbered OIR questions 5–9 when leaving an earlier section
        if (/^\s*[5-9]\.\s/.test(lines[j] ?? "")) {
          end = j;
          break;
        }
        if (hitsOtherSection) {
          end = j;
          break;
        }
      }
      return { start: i, end, synonym: needle.raw };
    }
  }
  return null;
}

function pickSelectedInWindow(
  map: CheckboxMap,
  sectionLines: string[],
  absoluteStart: number,
): CheckboxHit | null {
  const labelsOnly = Boolean(map.labelsOnly);
  for (let i = 0; i < sectionLines.length; i++) {
    const line = sectionLines[i] ?? "";
    const prev = i > 0 ? (sectionLines[i - 1] ?? "") : "";
    for (const option of map.options) {
      if (!optionIsSelectedOnLine(option, line, prev, labelsOnly)) continue;
      return {
        fieldKey: map.fieldKey,
        value: option.value,
        section: map.sectionSynonyms[0] ?? map.fieldKey,
        matchedOption: option.letter ?? option.labels?.[0] ?? option.value,
        sourceLine: line.replace(/\s+/g, " ").trim(),
        sourceLineNo: absoluteStart + i + 1,
      };
    }
  }
  return null;
}

/**
 * DMI / OIR pdf_text often burns answers into photo captions and deficiency
 * report phrases instead of emitting ☑ on the letter options.
 */
function extractFromReportPhrases(text: string): CheckboxHit[] {
  const hits: CheckboxHit[] = [];

  const push = (
    fieldKey: string,
    value: string,
    section: string,
    matchedOption: string,
    snippet: string,
  ) => {
    if (hits.some((h) => h.fieldKey === fieldKey)) return;
    hits.push({
      fieldKey,
      value,
      section,
      matchedOption,
      sourceLine: snippet.replace(/\s+/g, " ").trim().slice(0, 180),
    });
  };

  // Only match phrases that DMI / filled reports emit — not blank OIR template copy.

  // Roof covering — photo caption (unique vs template "□ Asphalt/Fiberglass")
  {
    const m = text.match(
      /Architectural\s*\/?\s*Dimensional\s+Shingle\s+Roof\s+Covering/i,
    );
    if (m) {
      push(
        "roof_covering",
        "Asphalt/Fiberglass Shingle",
        "Roof Covering",
        "Asphalt/Fiberglass Shingle",
        m[0],
      );
    } else {
      const tile = text.match(/Concrete\s*\/?\s*Clay\s+Tile\s+Roof\s+Covering/i);
      if (tile) {
        push("roof_covering", "Concrete/Clay Tile", "Roof Covering", "Concrete/Clay Tile", tile[0]);
      }
    }
  }

  // Roof deck — photo captions
  {
    const c = text.match(
      /8d\s+Nails?\s+or\s+Greater\s+in\s+Size[^\n]{0,80}Spaced\s+6\s*["”']?\s*(?:Along\s+the\s+Edge\s*)?(?:Spaced\s+6\s*["”']?\s*)?in\s+the\s+Field/i,
    );
    const c2 = text.match(
      /8d\s+Nails?\s+or\s+Greater\s+in\s+Size\s+Spaced\s+6\s*["”']?\s*in\s+the\s+Field/i,
    );
    if (c || c2) {
      push(
        "roof_deck_attachment",
        "C",
        "Roof Deck Attachment",
        "C",
        (c ?? c2)![0],
      );
    }
  }

  // Roof-to-wall — upgrade report (unique) + photo caption
  if (
    /do\s+not\s+meet\s+the\s+requirements\s+on\s+the\s+Uniform\s+Mitigation\s+Verification\s+Inspection\s+form\s+for\s+Single\s+Wrap/i.test(
      text,
    )
  ) {
    push(
      "roof_to_wall",
      "clips",
      "Roof to Wall Attachment",
      "B",
      "do not meet ... Single Wrap",
    );
  } else if (/Metal\s+Connector\s+with\s+2\s+Nails/i.test(text)) {
    push(
      "roof_to_wall",
      "clips",
      "Roof to Wall Attachment",
      "B",
      "Metal Connector with 2 Nails",
    );
  }

  // SWR — Roof Mitigation Upgrade Report wording (unique)
  if (
    /Secondary Water Resistant\s*\(\s*"?SWR"?\s*\)\s*Barrier\.\s*Our report indicates that your roof does not/i.test(
      text,
    ) ||
    /Our report indicates that your roof does not\s+currently have[^\n]{0,200}self-adhering/i.test(
      text,
    )
  ) {
    push("swr", "B", "Secondary Water Resistance", "B", "roof does not currently have SWR");
  }

  // Opening protection — deficiency estimate (unique)
  if (
    /level\s+A-?A\.?A?3\s+appears\s+to\s+be\s+achieved/i.test(text) ||
    /\(level\s+A-A\.A3\s+appears\s+to\s+be\s+achieved\)/i.test(text)
  ) {
    push(
      "opening_protection",
      "A",
      "Opening Protection",
      "A",
      "level A-A.3 appears to be achieved",
    );
  }

  return hits;
}

/**
 * Extract checked wind-mitigation options from OCR / PDF text.
 */
export function extractWindMitCheckboxes(text: string): CheckboxHit[] {
  const lines = text.split(/\r?\n/);
  const hits: CheckboxHit[] = [];
  const seen = new Set<string>();

  // DMI caption / deficiency phrases first — they beat noisy chart "X" tokens
  // in OIR pdf_text where every letter option still shows □.
  for (const hit of extractFromReportPhrases(text)) {
    if (seen.has(hit.fieldKey)) continue;
    seen.add(hit.fieldKey);
    hits.push(hit);
  }

  for (const map of WIND_MIT_CHECKBOX_MAPS) {
    if (seen.has(map.fieldKey)) continue;
    const window = findSectionWindow(lines, map.sectionSynonyms);
    if (!window) continue;

    const sectionLines = lines.slice(window.start, window.end);
    const found = pickSelectedInWindow(map, sectionLines, window.start);
    if (found) {
      found.section = window.synonym;
      seen.add(map.fieldKey);
      hits.push(found);
    }
  }

  return hits;
}

/** Resolve a single map option (tests / callers). */
export function resolveCheckboxOption(
  map: CheckboxMap,
  letterOrLabel: string,
): string | null {
  const raw = letterOrLabel.trim();
  const compactRaw = compact(raw);
  for (const option of map.options) {
    if (option.letter && option.letter.toUpperCase() === raw.toUpperCase()) {
      return option.value;
    }
    if (option.labels?.some((label) => compact(label) === compactRaw)) {
      return option.value;
    }
  }
  return null;
}

export function windMitCheckboxFieldKeys(): Set<string> {
  return new Set(WIND_MIT_CHECKBOX_MAPS.map((row) => row.fieldKey));
}
