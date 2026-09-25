import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DealPackageShell } from "@/components/deal/deal-package-shell";
import {
  INSURED_ADDRESS_LABEL,
  MAILING_ADDRESS_LABEL,
  SAME_AS_INSURED_VALUE,
  formatHeaderDob,
  headerAddressesEqual,
  mailingHeaderValue,
  normalizeHeaderAddress,
  resolveDealHeaderAddresses,
  shouldShowMailingAddress,
  uniqueDisplayPhones,
} from "./header-addresses";

function source(file: string) {
  return readFileSync(file, "utf8");
}

const palmBay = {
  address1: "12 Oak St",
  city: "Palm Bay",
  state: "FL",
  zip: "32909",
};

const orlando = {
  address1: "88 Pine Ave",
  city: "Orlando",
  state: "FL",
  zip: "32801",
};

describe("deal header address compare", () => {
  it("treats the same street/city/state/zip as equal after normalize", () => {
    expect(
      headerAddressesEqual(palmBay, {
        address1: "12 Oak Street",
        city: "PALM BAY",
        state: "fl",
        zip: "32909-1234",
      }),
    ).toBe(true);
    expect(shouldShowMailingAddress(palmBay, palmBay)).toBe(false);
    expect(
      normalizeHeaderAddress({
        address1: "12 Oak Street",
        city: "Palm Bay",
        state: "FL",
        zip: "32909-4401",
      }),
    ).toBe(normalizeHeaderAddress(palmBay));
  });

  it("treats empty mailing as same as insured", () => {
    expect(shouldShowMailingAddress(palmBay, { address1: "", city: "", state: "", zip: "" })).toBe(
      false,
    );
    expect(headerAddressesEqual(palmBay, { address1: "  ", city: "", state: "", zip: "" })).toBe(
      true,
    );
    expect(mailingHeaderValue(palmBay, { address1: "", city: "", state: "", zip: "" })).toBe(
      SAME_AS_INSURED_VALUE,
    );
  });

  it("treats a matching street-only mailing as same as insured", () => {
    expect(
      shouldShowMailingAddress(palmBay, { address1: "12 Oak Street", city: "", state: "", zip: "" }),
    ).toBe(false);
    expect(
      mailingHeaderValue(palmBay, { address1: "12 Oak Street", city: "", state: "", zip: "" }),
    ).toBe(SAME_AS_INSURED_VALUE);
  });

  it("prints the full mailing line when street/city/state/zip differ", () => {
    expect(shouldShowMailingAddress(palmBay, orlando)).toBe(true);
    expect(headerAddressesEqual(palmBay, orlando)).toBe(false);
    expect(mailingHeaderValue(palmBay, orlando)).toBe("88 Pine Ave · Orlando, FL · 32801");
    expect(
      shouldShowMailingAddress(palmBay, {
        address1: "12 Oak St",
        city: "Melbourne",
        state: "FL",
        zip: "32935",
      }),
    ).toBe(true);
  });
});

describe("resolveDealHeaderAddresses", () => {
  it("prefers deal insured fields + risk, and explicit contact_mailing_* for mailing", () => {
    const resolved = resolveDealHeaderAddresses({
      stored: {
        mailing_address: "12 Oak St",
        city: "Palm Bay",
        state: "FL",
        zip: "32909",
        contact_mailing_address: "PO Box 12",
        contact_mailing_city: "Naples",
        contact_mailing_state: "FL",
        contact_mailing_zip: "34102",
      },
      risk: { address1: "99 Other Rd", city: "Tampa", state: "FL", zip: "33602" },
    });
    expect(resolved.insured).toEqual(palmBay);
    expect(resolved.mailing).toEqual({
      address1: "PO Box 12",
      city: "Naples",
      state: "FL",
      zip: "34102",
    });
    expect(resolved.showMailing).toBe(true);
  });

  it("falls back to risk / contact for insured and treats unset mailing as same", () => {
    const resolved = resolveDealHeaderAddresses({
      stored: {},
      risk: palmBay,
      contact: { mailingAddress: "12 Oak St", city: "Palm Bay", state: "FL", zip: "32909" },
    });
    expect(resolved.insured).toEqual(palmBay);
    expect(resolved.showMailing).toBe(false);
    expect(mailingHeaderValue(resolved.insured, resolved.mailing)).toBe(SAME_AS_INSURED_VALUE);
  });

  it("does not treat lead/contact mailingAddress as a distinct mailing row", () => {
    const resolved = resolveDealHeaderAddresses({
      stored: { mailing_address: "12 Oak St", city: "Palm Bay", state: "FL", zip: "32909" },
      lead: { mailingAddress: "12 Oak St", city: "Palm Bay", state: "FL", zip: "32909" },
      contact: { mailingAddress: "12 Oak St", city: "Palm Bay", state: "FL", zip: "32909" },
    });
    expect(resolved.showMailing).toBe(false);
    expect(resolved.mailing.address1).toBe("");
  });

  it("uses account primary/mailing for commercial when deal fields are empty", () => {
    const same = resolveDealHeaderAddresses({
      account: {
        primaryAddress1: "100 Business Blvd",
        primaryCity: "Miami",
        primaryState: "FL",
        primaryZip: "33101",
        mailingAddress: "100 Business Blvd",
        city: "Miami",
        state: "FL",
        zip: "33101",
        mailingSameAsPrimary: true,
      },
    });
    expect(same.insured.address1).toBe("100 Business Blvd");
    expect(same.showMailing).toBe(false);

    const different = resolveDealHeaderAddresses({
      account: {
        primaryAddress1: "100 Business Blvd",
        primaryCity: "Miami",
        primaryState: "FL",
        primaryZip: "33101",
        mailingAddress: "PO Box 9",
        city: "Miami",
        state: "FL",
        zip: "33101",
        mailingSameAsPrimary: false,
      },
    });
    expect(different.showMailing).toBe(true);
    expect(different.mailing.address1).toBe("PO Box 9");
  });
});

describe("DealPackageShell address display", () => {
  it("keeps a compact mailing row when mailing is the same or empty", () => {
    const html = renderToString(
      createElement(DealPackageShell, {
        name: "Gloria Martinez",
        phones: ["786-555-0100"],
        dob: "1980-01-02",
        insuredAddress: palmBay,
        mailingAddress: {
          address1: "12 Oak Street",
          city: "Palm Bay",
          state: "FL",
          zip: "32909",
        },
        stage: "quote_sent",
        owner: "Javy",
      }),
    );
    expect(html).toContain(INSURED_ADDRESS_LABEL);
    expect(html).toContain("12 Oak St");
    expect(html).toContain(MAILING_ADDRESS_LABEL);
    expect(html).toContain(SAME_AS_INSURED_VALUE);
    expect(html).not.toContain("88 Pine Ave");
    expect(html).toContain("Gloria Martinez");
    expect(html).toContain("786-555-0100");
    expect(html).toContain(formatHeaderDob("1980-01-02"));
    expect(html).toContain("01/02/1980");
    expect(html).not.toContain("1980-01-02");
    expect(html).toContain("Javy");
    expect(html).toContain("Name");
    expect(html).toContain("Phone");
    expect(html).toContain("DOB");
    expect(html).toContain("Producer");
    expect(html).toMatch(/data-ff-header-address="insured"/);
    expect(html).toMatch(/data-ff-header-address="mailing"/);
    expect(html).toMatch(/data-ff-header-mailing-same="1"/);
    expect(html.indexOf(INSURED_ADDRESS_LABEL)).toBeLessThan(html.indexOf(MAILING_ADDRESS_LABEL));
  });

  it("shows mailing underneath insured when the addresses differ", () => {
    const html = renderToString(
      createElement(DealPackageShell, {
        name: "Gloria Martinez",
        phones: ["786-555-0100"],
        dob: "1980-01-02",
        insuredAddress: palmBay,
        mailingAddress: orlando,
        stage: "quote_sent",
        owner: "Javy",
      }),
    );
    expect(html).toContain(INSURED_ADDRESS_LABEL);
    expect(html).toContain(MAILING_ADDRESS_LABEL);
    expect(html).toContain("12 Oak St");
    expect(html).toContain("88 Pine Ave");
    expect(html.indexOf(INSURED_ADDRESS_LABEL)).toBeLessThan(html.indexOf(MAILING_ADDRESS_LABEL));
    expect(html.indexOf("12 Oak St")).toBeLessThan(html.indexOf("88 Pine Ave"));
    expect(html).toMatch(/data-ff-header-address="mailing"/);
    expect(html).toMatch(/data-ff-header-show-mailing="1"/);
    expect(html).not.toContain(SAME_AS_INSURED_VALUE);
    expect(html).toContain("Gloria Martinez");
    expect(html).toContain("Javy");
  });

  it("formats header DOB as month/day/year via the sitewide helper", () => {
    const html = renderToString(
      createElement(DealPackageShell, {
        name: "Gloria Martinez",
        phones: ["786-555-0100"],
        dob: "1990-05-15",
        insuredAddress: palmBay,
        mailingAddress: palmBay,
        owner: "Javy",
      }),
    );
    expect(formatHeaderDob("1990-05-15")).toBe("05/15/1990");
    expect(html).toContain("05/15/1990");
    expect(html).not.toContain("1990-05-15");
    expect(html).not.toContain("5-15-1990");
    expect(html).toMatch(/data-ff-header-dob/);
    expect(html).toContain(SAME_AS_INSURED_VALUE);
  });

  it("shows Same as insured address when mailing is empty", () => {
    const html = renderToString(
      createElement(DealPackageShell, {
        name: "Gloria Martinez",
        phones: ["786-555-0100"],
        insuredAddress: palmBay,
        mailingAddress: { address1: "", city: "", state: "", zip: "" },
        owner: "Javy",
      }),
    );
    expect(html).toContain(INSURED_ADDRESS_LABEL);
    expect(html).toContain("12 Oak St");
    expect(html).toContain(MAILING_ADDRESS_LABEL);
    expect(html).toContain(SAME_AS_INSURED_VALUE);
    expect(html).toMatch(/data-ff-header-mailing-same="1"/);
  });

  it("keeps name, phones, DOB, and staff in the shared shell source", () => {
    const shell = source("src/components/deal/deal-package-shell.tsx");
    const page = source("src/app/deals/[id]/page.tsx");
    expect(shell).toMatch(/label: "Name"/);
    expect(shell).toMatch(/label: "Phone"/);
    expect(shell).toMatch(/label: "DOB"/);
    expect(shell).toMatch(/formatHeaderDob\(dob\)/);
    expect(shell).toMatch(/uniqueDisplayPhones/);
    expect(shell).toMatch(/label: "Producer"/);
    expect(shell).toContain("INSURED_ADDRESS_LABEL");
    expect(shell).toContain("MAILING_ADDRESS_LABEL");
    expect(shell).toMatch(/mailingHeaderValue/);
    expect(shell).not.toMatch(/label: "Mailing"/);
    expect(source("src/lib/deals/header-addresses.ts")).toContain("Same as insured address");
    expect(page).toMatch(/resolveDealHeaderAddresses/);
    expect(page).toMatch(/insuredAddress=\{headerAddresses\.insured\}/);
    expect(page).toMatch(/mailingAddress=\{headerAddresses\.mailing\}/);
    expect(page).toMatch(/name=\{partyName\}/);
    expect(page).toMatch(/phones=\{/);
    expect(page).toMatch(/dob=\{/);
    expect(page).toMatch(/owner=\{ownerRow\?\.name\}/);
    expect(page).toMatch(/DealHeaderStage/);
    expect(page).toMatch(/stageControl=/);
    expect(page).toMatch(/uniqueDisplayPhones/);
  });

  it("keeps a stable 4-column header: name/stage, phones/owner, dob/activity, addresses", () => {
    const html = renderToString(
      createElement(DealPackageShell, {
        name: "Gloria Martinez",
        phones: ["786-555-0100"],
        dob: "1980-01-02",
        insuredAddress: palmBay,
        mailingAddress: orlando,
        stage: "gather",
        owner: "Javy",
        activity: "Lead converted · Homeowners / HO3",
      }),
    );
    expect(html).toMatch(/data-ff-header-cols="name-stage,phones-owner,dob-activity,insured-mailing"/);
    expect(html.indexOf("Name")).toBeLessThan(html.indexOf("Pipeline"));
    expect(html.indexOf("Pipeline")).toBeLessThan(html.indexOf("Phone"));
    expect(html.indexOf("Phone")).toBeLessThan(html.indexOf("Producer"));
    expect(html.indexOf("Producer")).toBeLessThan(html.indexOf("DOB"));
    expect(html.indexOf("DOB")).toBeLessThan(html.indexOf("Activity"));
    expect(html.indexOf("Activity")).toBeLessThan(html.indexOf(INSURED_ADDRESS_LABEL));
    expect(html.indexOf(INSURED_ADDRESS_LABEL)).toBeLessThan(html.indexOf(MAILING_ADDRESS_LABEL));
    expect(html.indexOf("Gloria Martinez")).toBeLessThan(html.indexOf("Gathering"));
    expect(html.indexOf("Gathering")).toBeLessThan(html.indexOf("786-555-0100"));
    expect(html.indexOf("01/02/1980")).toBeLessThan(html.indexOf(INSURED_ADDRESS_LABEL));
    // Mailing lives in col 4 under insured — never under name.
    expect(html.indexOf("Gloria Martinez")).toBeLessThan(html.indexOf(MAILING_ADDRESS_LABEL));
    expect(html.indexOf("Gathering")).toBeLessThan(html.indexOf(MAILING_ADDRESS_LABEL));
  });

  it("shows one phone when primary and secondary normalize to the same digits", () => {
    expect(
      uniqueDisplayPhones(["(786) 555-0100", "786-555-0100", "+1 786 555 0100", "321-555-0199"]),
    ).toEqual(["(786) 555-0100", "321-555-0199"]);
    const html = renderToString(
      createElement(DealPackageShell, {
        name: "Heather Flood",
        phones: ["(786) 555-0100", "786-555-0100"],
        insuredAddress: palmBay,
        mailingAddress: palmBay,
      }),
    );
    expect(html).toContain("(786) 555-0100");
    expect(html).not.toContain("786-555-0100");
  });
});
