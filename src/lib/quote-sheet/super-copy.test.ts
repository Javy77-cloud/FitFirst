import { describe, expect, it } from "vitest";
import fixture from "@/lib/fixtures/ana-dib-ho3-2026-09-02.json";
import { DEAL_ID } from "@/lib/fixtures/ids";
import { anaHomeSheetValues } from "./ana-home";
import {
  COPY_SHEET_PORTAL_NOTE,
  SUPER_COPY_LABEL,
  buildCopySheetText,
  buildSuperCopyPacket,
} from "./super-copy";

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
    expect(packet.instruction).toContain("Fill Quote Sheet is in FitFirst");
    expect(packet.instruction.toLowerCase()).toContain("portal");
  });

  it("builds a clean labeled clipboard pack for Copy sheet", () => {
    const text = buildCopySheetText({
      line: "home",
      dealId: DEAL_ID,
      dealTitle: "Dib · Palm Bay HO3",
      values: anaHomeSheetValues(fixture.risk),
      contactName: "Ana Dib",
      contactDob: null,
    });
    expect(text).toContain("FitFirst Homeowners Quote Sheet");
    expect(text).toContain(SUPER_COPY_LABEL);
    expect(text).toContain("Property address: 1098 Adige Ct SE");
    expect(text).toContain("Coverage A (dwelling): 321000");
    expect(text).toContain("Year built: 1989");
    expect(text).toContain("Contact (people/DOB live here, not on the sheet): Ana Dib");
    expect(text).toContain(COPY_SHEET_PORTAL_NOTE);
    expect(text.toLowerCase()).not.toContain("typtap login");
    const covALine = text.split("\n").find((line) => line.startsWith("Coverage A (dwelling):"));
    expect(covALine).toBe("Coverage A (dwelling): 321000");
  });
});
