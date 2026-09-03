import { describe, expect, it } from "vitest";
import type { QuoteSheetFieldValue } from "@/lib/domain";
import {
  buildFillSheetFromQuoteSheet,
  buildSuperCopyPacket,
  sheetPacketFingerprint,
} from "./sheet-packet";

const values: Record<string, QuoteSheetFieldValue> = {
  address1: { value: "412 Harbor Isle Dr", status: "confirmed", source: "seed" },
  coverage_a: { value: "385000", status: "confirmed", source: "seed" },
  current_carrier: { value: "Citizens", status: "check", source: "extracted" },
};

describe("sheet packet", () => {
  it("builds Super-Copy and Send to Fill from the same quote_sheets values, never PDFs", () => {
    const superCopy = buildSuperCopyPacket({
      line: "home",
      tenantId: "t",
      dealId: "deal-1",
      dealTitle: "Ruiz · Melbourne HO3",
      values,
      contactName: "Elena Ruiz",
    });
    const fill = buildFillSheetFromQuoteSheet({
      tenantId: "t",
      dealId: "deal-1",
      line: "home",
      values,
      insured: "Elena Ruiz",
    });
    expect(superCopy.kind).toBe("fitfirst.sheet");
    expect(fill.kind).toBe("fitfirst.sheet");
    expect(fill.source).toBe("quote_sheets");
    expect(superCopy.filled.coverage_a).toBe("385000");
    expect(fill.filled.coverage_a).toBe("385000");
    expect(sheetPacketFingerprint(superCopy.quoteSheet)).toBe(sheetPacketFingerprint(fill.quoteSheet));
    expect(superCopy.fields.find((f) => f.key === "current_carrier")?.status).toBe("check");
  });
});
