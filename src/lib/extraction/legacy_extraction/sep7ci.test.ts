/** LEGACY — not imported by Fill. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  extractWindMitCheckboxes,
  resolveCheckboxOption,
  WIND_MIT_CHECKBOX_MAPS,
} from "./checkbox-maps";
import { extractFieldsFromText } from "./extract-text";
import { matchSynonymsOnLine } from "./synonyms";

const FIXTURE = readFileSync(
  resolve(__dirname, "../../../../fixtures/don-myler-wind-mit-pdf-text-redacted.txt"),
  "utf8",
);

describe("sep7ci wind mit checkbox maps for pdf_text", () => {
  it("still maps OCR-style checked letters", () => {
    const roofToWall = WIND_MIT_CHECKBOX_MAPS.find((row) => row.fieldKey === "roof_to_wall")!;
    expect(resolveCheckboxOption(roofToWall, "B")).toBe("clips");

    const text = `Building Code:
☐ A. 2001 FBC
☑ B. 1994 SFBC
☐ C. Other

Region:
☑ 1. 140 mph
☐ 2. 130 mph

Roof Covering Type:
☑ Asphalt/Fiberglass Shingle
☐ Metal

Roof Deck Attachment:
☑ C. 8d @ 6"

Roof to Wall Attachment:
☑ B. Clips

Roof Geometry:
☑ A. Hip

Secondary Water Resistance:
☑ A

Opening Protection:
☑ N. None
`;
    const byKey = Object.fromEntries(extractWindMitCheckboxes(text).map((h) => [h.fieldKey, h.value]));
    expect(byKey.building_code).toBe("B");
    expect(byKey.wind_speed).toBe("140");
    expect(byKey.roof_covering).toBe("Asphalt/Fiberglass Shingle");
    expect(byKey.roof_deck_attachment).toBe("C");
    expect(byKey.roof_to_wall).toBe("clips");
    expect(byKey.roof_shape).toBe("hip");
    expect(byKey.swr).toBe("A");
    expect(byKey.opening_protection).toBe("N");
  });

  it("extracts Don Myler pdf_text via captions / deficiency phrases (no ☑)", () => {
    // Real OIR pdf_text keeps □ on every letter option; answers live in DMI captions.
    expect(FIXTURE).toMatch(/Architectural\/Dimensional Shingle Roof Covering/);
    expect(FIXTURE).not.toMatch(/☑/);

    const hits = extractWindMitCheckboxes(FIXTURE);
    const byKey = Object.fromEntries(hits.map((h) => [h.fieldKey, h.value]));

    expect(byKey.roof_covering).toBe("Asphalt/Fiberglass Shingle");
    expect(byKey.roof_deck_attachment).toBe("C");
    expect(byKey.roof_to_wall).toBe("clips");
    expect(byKey.swr).toBe("B");
    expect(byKey.opening_protection).toBe("A");

    const extracted = extractFieldsFromText(FIXTURE, "wind_mit");
    const fields = Object.fromEntries(
      extracted.fields.map((f) => [f.fieldKey, f.normalizedValue]),
    );
    expect(fields.roof_covering).toBe("Asphalt/Fiberglass Shingle");
    expect(fields.roof_deck_attachment).toBe("C");
    expect(fields.roof_to_wall).toBe("clips");
    expect(fields.swr).toBe("B");
    expect(fields.opening_protection).toBe("A");

    const mapped = extracted.fields.filter((f) => f.matchPath === "field_map");
    expect(mapped.length).toBeGreaterThanOrEqual(5);
  });

  it("detects X-prefixed letter options when the extractor emits them", () => {
    const text = `Roof Geometry:
X A. Hip Roof: Hip roof with no other roof shapes
□ B. Flat Roof
□ C. Other Roof
`;
    const hits = extractWindMitCheckboxes(text);
    expect(hits.find((h) => h.fieldKey === "roof_shape")?.value).toBe("hip");
  });
});

describe("sep7ci synonym adjacency tighten", () => {
  it("does not pull Cell Phone into County on blank multi-label rows", () => {
    const hits = matchSynonymsOnLine("County: Cell Phone:", "wind_mit");
    const county = hits.find((h) => h.fieldKey === "county");
    expect(county?.blank).toBe(true);
    expect(county?.value).toBe("");
  });

  it("does not map Approval # residual onto stories via bare #", () => {
    const hits = matchSynonymsOnLine("Approval #: ABC123", "wind_mit");
    expect(hits.some((h) => h.fieldKey === "stories")).toBe(false);
  });

  it("still reads # of Stories when labeled", () => {
    const hits = matchSynonymsOnLine("# of Stories: 2", "wind_mit");
    expect(hits.find((h) => h.fieldKey === "stories")).toMatchObject({
      value: "2",
      blank: false,
    });
  });
});
