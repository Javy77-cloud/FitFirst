import { describe, expect, it } from "vitest";
import { defaultLayoutForModule } from "./modules";
import { defaultLayoutForLine } from "./defaults";
import { needsAddressSectionSplit, splitInsuredMailingAddressSections } from "./split-address-sections";

describe("sep7js Insured Address + Mailing Address sections", () => {
  it("Lead default layout has separate Insured Address and Mailing Address sections", () => {
    const layout = defaultLayoutForModule("leads");
    const sections = layout.columns.flatMap((c) => c.sections);
    const insured = sections.find((s) => s.id === "insured_address");
    const mailing = sections.find((s) => s.id === "mailing_address");
    expect(insured?.label).toBe("Insured Address");
    expect(insured?.fieldKeys).toEqual(expect.arrayContaining(["mailing_address"]));
    expect(insured?.fieldKeys).not.toContain("contact_mailing_address");
    expect(mailing?.label).toBe("Mailing Address");
    expect(mailing?.fieldKeys).toEqual(["contact_mailing_address"]);
    expect(needsAddressSectionSplit(layout)).toBe(false);
  });

  it("Deal default layout splits the same way", () => {
    const layout = defaultLayoutForLine("HO");
    const sections = layout.columns.flatMap((c) => c.sections);
    expect(sections.find((s) => s.id === "insured_address")?.fieldKeys).toEqual(
      expect.arrayContaining(["mailing_address"]),
    );
    expect(sections.find((s) => s.id === "mailing_address")?.fieldKeys).toEqual(["contact_mailing_address"]);
  });

  it("splits a legacy combined Address section", () => {
    const legacy = {
      columns: [
        {
          id: "left",
          sections: [
            {
              id: "address",
              label: "Address",
              fieldKeys: ["mailing_address", "contact_mailing_address", "city", "state", "zip"],
            },
          ],
        },
      ],
    };
    expect(needsAddressSectionSplit(legacy)).toBe(true);
    const split = splitInsuredMailingAddressSections(legacy);
    const sections = split.columns[0].sections;
    expect(sections).toHaveLength(2);
    expect(sections[0]).toMatchObject({
      id: "insured_address",
      label: "Insured Address",
      fieldKeys: ["mailing_address", "city", "state", "zip"],
    });
    expect(sections[1]).toMatchObject({
      id: "mailing_address",
      label: "Mailing Address",
      fieldKeys: ["contact_mailing_address"],
    });
  });
});
