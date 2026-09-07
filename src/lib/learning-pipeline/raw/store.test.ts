import { describe, expect, it } from "vitest";
import { createRawTenantStore } from "./store";

describe("raw tenant layer", () => {
  it("keeps documents, extractions, and corrections inside one agency", () => {
    const store = createRawTenantStore();
    const tenantId = "tenant-a";
    store.putDocument({
      id: "doc-1",
      tenantId,
      fileName: "dec.pdf",
      mimeType: "application/pdf",
      sourceLabel: "HO3 declarations",
      formVersion: "HO3-2024",
      carrier: "Citizens",
      uploadedAt: new Date(),
    });
    store.putExtraction({
      id: "ext-1",
      tenantId,
      documentId: "doc-1",
      fieldKey: "construction",
      fieldType: "construction",
      extractedValue: "CBS",
      sourceLabel: "HO3 declarations",
      formVersion: "HO3-2024",
      carrier: "Citizens",
      extractedAt: new Date(),
    });
    store.putCorrection({
      id: "fix-1",
      tenantId,
      documentId: "doc-1",
      extractionId: "ext-1",
      fieldKey: "construction",
      fieldType: "construction",
      extractedValue: "CBS",
      correctedValue: "masonry",
      sourceLabel: "HO3 declarations",
      formVersion: "HO3-2024",
      carrier: "Citizens",
      correctedBy: "Agent",
      correctedAt: new Date(),
    });
    expect(store.listDocuments(tenantId)).toHaveLength(1);
    expect(store.listExtractions("tenant-b")).toHaveLength(0);
    expect(store.getCorrection("tenant-b", "fix-1")).toBeNull();
    expect(store.layer).toBe("raw");
    expect(() => store.exportOutsideTenant()).toThrow(/never leave/);
  });
});
