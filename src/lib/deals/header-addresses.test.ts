import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DealPackageShell } from "@/components/deal/deal-package-shell";
import { formatDob } from "@/lib/domain";
import {
  INSURED_ADDRESS_LABEL,
  MAILING_ADDRESS_LABEL,
  headerAddressesEqual,
  normalizeHeaderAddress,
  resolveDealHeaderAddresses,
  shouldShowMailingAddress,
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

  it("hides mailing when it is empty", () => {
    expect(shouldShowMailingAddress(palmBay, { address1: "", city: "", state: "", zip: "" })).toBe(
      false,
    );
    expect(headerAddressesEqual(palmBay, { address1: "  ", city: "", state: "", zip: "" })).toBe(
      true,
    );
  });

  it("hides mailing when only the street is filled and it matches insured", () => {
    expect(
      shouldShowMailingAddress(palmBay, { address1: "12 Oak Street", city: "", state: "", zip: "" }),
    ).toBe(false);
  });

  it("shows mailing when street/city/state/zip differ", () => {
    expect(shouldShowMailingAddress(palmBay, orlando)).toBe(true);
    expect(headerAddressesEqual(palmBay, orlando)).toBe(false);
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

  it("falls back to risk / contact for insured and hides mailing when unset", () => {
    const resolved = resolveDealHeaderAddresses({
      stored: {},
      risk: palmBay,
      contact: { mailingAddress: "12 Oak St", city: "Palm Bay", state: "FL", zip: "32909" },
    });
    expect(resolved.insured).toEqual(palmBay);
    expect(resolved.showMailing).toBe(false);
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
  it("shows insured only when mailing is the same or empty", () => {
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
    expect(html).not.toContain(MAILING_ADDRESS_LABEL);
    expect(html).toContain("Gloria Martinez");
    expect(html).toContain("786-555-0100");
    expect(html).toContain(formatDob("1980-01-02"));
    expect(html).not.toContain("1980-01-02");
    expect(html).toContain("Javy");
    expect(html).toContain("Name");
    expect(html).toContain("Phones");
    expect(html).toContain("DOB");
    expect(html).toContain("Owner");
    expect(html).toMatch(/data-ff-header-address="insured"/);
    expect(html).not.toMatch(/data-ff-header-address="mailing"/);
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
    expect(formatDob("1990-05-15")).toBe("5-15-1990");
    expect(html).toContain("5-15-1990");
    expect(html).not.toContain("1990-05-15");
    expect(html).toMatch(/data-ff-header-dob/);
  });

  it("keeps name, phones, DOB, and staff in the shared shell source", () => {
    const shell = source("src/components/deal/deal-package-shell.tsx");
    const page = source("src/app/deals/[id]/page.tsx");
    expect(shell).toMatch(/label: "Name"/);
    expect(shell).toMatch(/label: "Phones"/);
    expect(shell).toMatch(/label: "DOB"/);
    expect(shell).toMatch(/formatDob\(dob\)/);
    expect(shell).toMatch(/from "@\/lib\/domain"/);
    expect(shell).toMatch(/label: "Owner"/);
    expect(shell).toContain("INSURED_ADDRESS_LABEL");
    expect(shell).toContain("MAILING_ADDRESS_LABEL");
    expect(shell).toMatch(/shouldShowMailingAddress/);
    expect(shell).not.toMatch(/label: "Mailing"/);
    expect(shell).not.toMatch(/Mailing same as insured/);
    expect(page).toMatch(/resolveDealHeaderAddresses/);
    expect(page).toMatch(/insuredAddress=\{headerAddresses\.insured\}/);
    expect(page).toMatch(/mailingAddress=\{headerAddresses\.mailing\}/);
    expect(page).toMatch(/name=\{partyName\}/);
    expect(page).toMatch(/phones=\{/);
    expect(page).toMatch(/dob=\{/);
    expect(page).toMatch(/owner=\{ownerRow\?\.name\}/);
  });
});
