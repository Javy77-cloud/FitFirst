/**
 * Wind mitigation OIR checkbox maps — checked letter / option → sheet value.
 * Deterministic only. Unchecked sections stay blank.
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
};

const CHECKED =
  /(?:☑|☒|■|▣|\[[\sxX]\]|\([\sxX]\)|✓|✔|\bx\b|\bchecked\b)/i;

export const WIND_MIT_CHECKBOX_MAPS: CheckboxMap[] = [
  {
    fieldKey: "building_code",
    sectionSynonyms: ["Building Code", "Building code"],
    options: [
      { letter: "A", value: "A" },
      { letter: "B", value: "B" },
      { letter: "C", value: "C" },
    ],
  },
  {
    fieldKey: "wind_speed",
    sectionSynonyms: ["Region", "Design Wind Speed", "Design wind speed", "Wind Speed"],
    options: [
      { letter: "1", value: "140" },
      { letter: "2", value: "130" },
      { letter: "3", value: "130" },
    ],
  },
  {
    fieldKey: "roof_covering",
    sectionSynonyms: ["Roof Covering", "Roof covering", "Roof Material", "Roof material"],
    options: [
      {
        letter: "A",
        labels: ["Asphalt/Fiberglass Shingle", "Asphalt Shingle", "Fiberglass Shingle"],
        value: "Asphalt/Fiberglass Shingle",
      },
      {
        letter: "B",
        labels: ["Concrete/Clay Tile", "Concrete Tile", "Clay Tile"],
        value: "Concrete/Clay Tile",
      },
      { letter: "C", labels: ["Metal"], value: "Metal" },
      { letter: "D", labels: ["Built Up", "Built-Up"], value: "Built Up" },
      {
        letter: "E",
        labels: ["Synthetic/Composite Tile", "Synthetic Tile", "Composite Tile"],
        value: "Synthetic/Composite Tile",
      },
      { labels: ["Asphalt/Fiberglass Shingle"], value: "Asphalt/Fiberglass Shingle" },
      { labels: ["Concrete/Clay Tile"], value: "Concrete/Clay Tile" },
      { labels: ["Metal"], value: "Metal" },
      { labels: ["Built Up", "Built-Up"], value: "Built Up" },
      { labels: ["Synthetic/Composite Tile"], value: "Synthetic/Composite Tile" },
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
      { letter: "F", value: "F" },
    ],
  },
  {
    fieldKey: "roof_to_wall",
    sectionSynonyms: [
      "Roof to Wall Connection",
      "Roof-to-Wall Connection",
      "Roof to Wall Attachment",
      "Roof to wall",
    ],
    options: [
      { letter: "A", value: "toenails" },
      { letter: "B", value: "clips" },
      { letter: "C", value: "single wraps" },
      { letter: "D", value: "double wraps" },
      { letter: "F", value: "other" },
      { letter: "H", value: "no attic access" },
    ],
  },
  {
    fieldKey: "roof_shape",
    sectionSynonyms: ["Roof Geometry", "Roof geometry", "Roof Shape", "Roof Shape:"],
    options: [
      { letter: "A", value: "hip" },
      { letter: "B", value: "flat" },
      { letter: "C", value: "other" },
      { labels: ["Other Roof", "Other roof"], value: "other" },
    ],
  },
  {
    fieldKey: "swr",
    sectionSynonyms: [
      "Secondary Water Resistance",
      "Secondary water resistance",
      "SWR",
    ],
    options: [
      { letter: "A", value: "A" },
      { letter: "B", value: "B" },
      { letter: "C", value: "C" },
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

function lineHasCheckedMarker(line: string): boolean {
  return CHECKED.test(line);
}

function optionMatchesLine(option: CheckboxOption, line: string): boolean {
  const lower = line.toLowerCase();
  if (option.letter) {
    const letterRe = new RegExp(
      `(?:^|[^a-z0-9])${option.letter}(?:\\s*[.)\\-:]|\\b)`,
      "i",
    );
    if (letterRe.test(line) && lineHasCheckedMarker(line)) return true;
    // "Building Code: B" / "Region: 1" style after a checked section header line
    if (
      new RegExp(`[:#]\\s*${option.letter}\\b`, "i").test(line) ||
      new RegExp(`\\bchecked\\s*${option.letter}\\b`, "i").test(lower)
    ) {
      return true;
    }
  }
  for (const label of option.labels ?? []) {
    if (lower.includes(label.toLowerCase()) && lineHasCheckedMarker(line)) return true;
    if (lower.includes(label.toLowerCase()) && /[:#]\s*\S/.test(line) === false) {
      // bare option line under a section — require a check marker nearby
      if (lineHasCheckedMarker(line)) return true;
    }
  }
  return false;
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
      let end = Math.min(lines.length, i + 12);
      for (let j = i + 1; j < end; j++) {
        const next = compact(lines[j] ?? "");
        const hitsOtherSection = WIND_MIT_CHECKBOX_MAPS.some((map) => {
          if (map.sectionSynonyms.some((s) => compact(s) === needle.compact)) return false;
          return map.sectionSynonyms.some((s) => {
            const c = compact(s);
            return c.length >= 6 && next.startsWith(c);
          });
        });
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

/**
 * Extract checked wind-mitigation options from OCR / PDF text.
 */
export function extractWindMitCheckboxes(text: string): CheckboxHit[] {
  const lines = text.split(/\r?\n/);
  const hits: CheckboxHit[] = [];
  const seen = new Set<string>();

  for (const map of WIND_MIT_CHECKBOX_MAPS) {
    if (seen.has(map.fieldKey)) continue;
    const window = findSectionWindow(lines, map.sectionSynonyms);
    if (!window) continue;

    const sectionLines = lines.slice(window.start, window.end);
    let found: CheckboxHit | null = null;

    for (let i = 0; i < sectionLines.length; i++) {
      const line = sectionLines[i] ?? "";
      for (const option of map.options) {
        if (!optionMatchesLine(option, line)) continue;
        found = {
          fieldKey: map.fieldKey,
          value: option.value,
          section: window.synonym,
          matchedOption: option.letter ?? option.labels?.[0] ?? option.value,
          sourceLine: line.replace(/\s+/g, " ").trim(),
          sourceLineNo: window.start + i + 1,
        };
        break;
      }
      if (found) break;
    }

    // Header line like "Building Code: B" or "Region ☑ 1"
    if (!found) {
      const header = sectionLines[0] ?? "";
      for (const option of map.options) {
        if (!optionMatchesLine(option, header) && !(option.letter && new RegExp(`[:#]\\s*${option.letter}\\b`, "i").test(header))) {
          continue;
        }
        if (
          option.letter &&
          (new RegExp(`[:#]\\s*${option.letter}\\b`, "i").test(header) ||
            optionMatchesLine(option, header))
        ) {
          found = {
            fieldKey: map.fieldKey,
            value: option.value,
            section: window.synonym,
            matchedOption: option.letter,
            sourceLine: header.replace(/\s+/g, " ").trim(),
            sourceLineNo: window.start + 1,
          };
          break;
        }
      }
    }

    if (found) {
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
