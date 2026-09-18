import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MasterSheetCompare } from "@/components/deal/master-sheet-compare";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("contact punch list wiring", () => {
  it("collapses Emails / SMS / Meetings into one Communications nav chip", () => {
    const nav = source("src/components/contact-section-nav.tsx");
    expect(nav).toMatch(/data-ff-contact-nav-item=\{CONTACT_COMMUNICATIONS_CHIP_ID\}/);
    expect(nav).toMatch(/Communications/);
    expect(nav).toMatch(/data-ff-contact-nav-comms/);
    expect(nav).toMatch(/CONTACT_COMMUNICATION_SECTION_IDS\.map/);
    expect(nav).toMatch(/communicationCountSum/);
    expect(nav).not.toMatch(/data-ff-contact-nav-item=\{id\}[\s\S]*emails/);
    expect(source("src/lib/desk/contact-sections.ts")).toMatch(/CONTACT_COMMUNICATIONS_CHIP_ID = "communications"/);
  });

  it("puts Property use on Deal Details and Risk Profile Property groups", () => {
    const html = renderToStaticMarkup(
      createElement(MasterSheetCompare, {
        dealId: "deal-1",
        line: "home",
        fields: [],
        values: {},
        product: "homeowners",
        insuredPropertyKind: "Rental / secondary",
      }),
    );
    expect(html).toMatch(/data-ff-risk-profile-property-use/);
    expect(html).toMatch(/data-ff-insured-property-kind/);
    expect(html).toMatch(/Primary residence/);
    expect(html).toMatch(/Rental \/ secondary/);
    expect(source("src/app/actions/crm.ts")).toMatch(/INSURED_PROPERTY_KIND_KEY/);
    expect(source("src/app/actions/custom-fields.ts")).toMatch(/saveDealInsuredPropertyKind/);
    expect(source("src/app/contacts/[id]/page.tsx")).toMatch(/prepareContactDealHeal/);
    expect(source("src/app/contacts/[id]/page.tsx")).toMatch(/ContactSecondaryAddressCue/);
    expect(source("src/app/contacts/[id]/page.tsx")).not.toMatch(/auto-wipe/);
  });
});
