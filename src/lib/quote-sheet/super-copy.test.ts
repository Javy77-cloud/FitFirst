import { describe, expect, it } from "vitest";
import fixture from "@/lib/fixtures/ana-dib-ho3-2026-09-02.json";
import { DEAL_ID } from "@/lib/fixtures/ids";
import { anaHomeSheetValues } from "./ana-home";
import { SUPER_COPY_LABEL, buildSuperCopyPacket } from "./super-copy";

describe("super-copy packet", () => {
  it("builds a rater packet labeled copy-from-the-sheet, not the PDFs", () => {
    const packet = buildSuperCopyPacket({
      line: "home",
      dealId: DEAL_ID,
      dealTitle: "Dib · Palm Bay HO3",
      values: anaHomeSheetValues(fixture.risk),
      contactName: "Ana Dib",
      contactDob: null,
    });
    expect(packet.label).toBe(SUPER_COPY_LABEL);
    expect(packet.instruction.toLowerCase()).toContain("not the pdfs");
    expect(packet.filled.coverage_a).toBe("321000");
    expect(packet.filled.address1).toContain("1098 Adige");
    expect(packet.contact.note.toLowerCase()).toContain("contact");
    const covA = packet.fields.find((f) => f.key === "coverage_a");
    expect(covA?.status).toBe("confirmed");
    expect(covA?.source).toBe("javy");
  });
});
