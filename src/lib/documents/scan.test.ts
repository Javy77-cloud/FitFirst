import { describe, expect, it } from "vitest";
import { FORM_TEMPLATE_SEEDS } from "@/lib/forms/catalog";
import {
  applyScanToForm,
  defaultFieldMap,
  parsePastedFields,
  SCAN_DEMO_FIELDS,
  suggestScanFields,
} from "./scan";

describe("scan-to-fill stub", () => {
  it("parses pasted key:value lines onto form keys", () => {
    const parsed = parsePastedFields("Named insured: Harbor Key Marine\ncoverage_a = 0\n");
    expect(parsed.named_insured).toBe("Harbor Key Marine");
    expect(parsed.coverage_a).toBe("0");
  });

  it("Scan & suggest overlays demo fields and keeps pasted values", () => {
    const suggested = suggestScanFields({
      pasted: "named_insured: Harbor Key Marine LLC",
      filename: "dec.png",
    });
    expect(suggested.named_insured).toBe("Harbor Key Marine LLC");
    expect(suggested.city).toBe(SCAN_DEMO_FIELDS.city);
    expect(suggested.named_insured).not.toMatch(/ana dib/i);
  });

  it("maps suggested source keys onto the stub form schema", () => {
    const template = FORM_TEMPLATE_SEEDS[0];
    const filled = applyScanToForm(template.fields, SCAN_DEMO_FIELDS, defaultFieldMap(template.fields));
    expect(filled.named_insured).toBe("Elena Ruiz");
    expect(filled.coverage_a).toBe("385000");
    expect(filled.address1).toBe("412 Harbor Isle Dr");
  });
});
