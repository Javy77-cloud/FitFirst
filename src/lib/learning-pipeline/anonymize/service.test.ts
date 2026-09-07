import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { RawCorrection } from "../types";
import { HIPAA_GLBA_IDENTIFIERS, collectPiiHits, looksLikePii, redactIfPii } from "./identifiers";
import { anonymizeCorrection, assertTrainingRecordClean, trainingFieldsOf } from "./service";

function raw(overrides: Partial<RawCorrection> = {}): RawCorrection {
  return {
    id: "raw-1",
    tenantId: "11111111-1111-4111-8111-111111111111",
    documentId: "doc-1",
    extractionId: "ext-1",
    fieldKey: "construction",
    fieldType: "construction",
    extractedValue: "CBS",
    correctedValue: "masonry",
    sourceLabel: "HO3 declarations",
    formVersion: "HO3-2024",
    carrier: "Citizens",
    correctedBy: "Javy Rivera",
    correctedAt: new Date("2026-09-07T12:00:00.000Z"),
    ...overrides,
  };
}

describe("anonymization service", () => {
  it("keeps mapping fields and non-PII correction tokens", () => {
    const record = anonymizeCorrection(raw());
    expect(record.sourceLabel).toBe("HO3 declarations");
    expect(record.fieldType).toBe("construction");
    expect(record.formVersion).toBe("HO3-2024");
    expect(record.carrier).toBe("Citizens");
    expect(record.correction.fromField).toBe("construction");
    expect(record.correction.toField).toBe("construction");
    expect(record.correction.extractedValue).toBe("CBS");
    expect(record.correction.correctedValue).toBe("masonry");
    assertTrainingRecordClean(record);
    expect(trainingFieldsOf(record)).toMatchObject({
      sourceLabel: "HO3 declarations",
      fieldType: "construction",
      formVersion: "HO3-2024",
      carrier: "Citizens",
    });
  });

  it("strips names, addresses, policy numbers, FEINs, phones, and emails", () => {
    const cases: Array<[Partial<RawCorrection>, string]> = [
      [{ fieldType: "named_insured", fieldKey: "named_insured", extractedValue: "Ana Dib", correctedValue: "Elena Ruiz" }, "name"],
      [
        {
          fieldType: "address",
          fieldKey: "address",
          extractedValue: "1842 Harbor Oak Drive",
          correctedValue: "22 Pine Court",
        },
        "address",
      ],
      [
        {
          fieldType: "policy_number",
          fieldKey: "policy_number",
          extractedValue: "HO3-99887766",
          correctedValue: "POL-11223344",
        },
        "policy",
      ],
      [
        { fieldType: "fein", fieldKey: "fein", extractedValue: "59-1234567", correctedValue: "12-3456789" },
        "fein",
      ],
      [
        {
          fieldType: "phone",
          fieldKey: "phone",
          extractedValue: "(321) 555-0101",
          correctedValue: "407-555-0199",
        },
        "phone",
      ],
      [
        {
          fieldType: "email",
          fieldKey: "email",
          extractedValue: "ana.dib@example.com",
          correctedValue: "elena@fitfirst.example",
        },
        "email",
      ],
    ];

    for (const [override] of cases) {
      const record = anonymizeCorrection(raw(override));
      expect(record.correction.extractedValue).toBeNull();
      expect(record.correction.correctedValue).toBeNull();
      expect(collectPiiHits(record)).toEqual([]);
      expect(record).not.toHaveProperty("tenantId");
      expect(record).not.toHaveProperty("correctedBy");
      expect(JSON.stringify(record)).not.toContain("Ana");
      expect(JSON.stringify(record)).not.toContain("Harbor");
      expect(JSON.stringify(record)).not.toContain("@");
    }
  });

  it("redacts PII that leaks into an otherwise safe field", () => {
    const record = anonymizeCorrection(
      raw({
        fieldType: "construction",
        extractedValue: "masonry — call 321-555-0144",
        correctedValue: "CBS",
      }),
    );
    expect(record.correction.extractedValue).toBeNull();
    expect(record.correction.correctedValue).toBe("CBS");
    expect(looksLikePii("321-555-0144")).toBe(true);
    expect(redactIfPii("construction", "2019")).toBe("2019");
  });

  it("never copies tenant, document, or agent identity onto the training record", () => {
    const record = anonymizeCorrection(raw());
    const json = JSON.stringify(record);
    expect(json).not.toContain("11111111-1111-4111-8111-111111111111");
    expect(json).not.toContain("doc-1");
    expect(json).not.toContain("Javy");
    expect(json).not.toContain("Rivera");
  });

  it("lists all 18 HIPAA/GLBA identifiers and carries the LEGAL todo", () => {
    expect(HIPAA_GLBA_IDENTIFIERS).toHaveLength(18);
    const src = readFileSync(new URL("./service.ts", import.meta.url), "utf8");
    expect(src).toContain(
      "// TODO(LEGAL): verify anonymization strips all 18 HIPAA/GLBA identifiers before pool write.",
    );
  });
});
