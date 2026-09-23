import { describe, expect, it } from "vitest";
import {
  bookHealthCounts,
  filterOwnedBook,
  lapseRiskRows,
  missingDecRows,
  missingDocRows,
  monolineGaps,
  producerBookRows,
  producerRollups,
} from "./book-health";

describe("book health", () => {
  it("counts active vs lapsed and ignores shopping quotes", () => {
    const counts = bookHealthCounts([
      { status: "active" },
      { status: "bound" },
      { status: "pending" },
      { status: "lapse" },
      { status: "cancellation" },
      { status: "non_renewal" },
      { status: "quoted" },
    ]);
    expect(counts).toEqual({ active: 3, lapsed: 3, other: 1, total: 7 });
  });

  it("lists in-force policies missing auto-required packets (dec only; AOR/ID optional)", () => {
    const rows = missingDocRows(
      [
        {
          id: "elena",
          policyNumber: "HO3-ELENA-2026",
          status: "active",
          lineOfBusiness: "HO3",
          expirationDate: "2027-09-01",
          partyName: "Ruiz, Elena",
        },
        {
          id: "hale",
          policyNumber: "HP-FL-88421",
          status: "active",
          lineOfBusiness: "HO3",
          expirationDate: "2026-10-01",
          partyName: "Hale, Jordan",
        },
        {
          id: "gone",
          policyNumber: "XX-LAPSED",
          status: "lapse",
          lineOfBusiness: "HO3",
          expirationDate: "2026-01-01",
          partyName: "Gone",
        },
      ],
      new Map([
        [
          "elena",
          [
            { docType: "policy_dec" },
            { docType: "policy_id" },
          ],
        ],
      ]),
    );
    // Elena has a dec — not missing. Hale has no files — missing dec only.
    // AOR / ID cards are optional and never block book-health missing docs.
    expect(rows.map((row) => row.policyNumber)).toEqual(["HP-FL-88421"]);
    expect(rows[0].labels).toEqual(["Dec on file"]);
    expect(missingDecRows(rows).map((row) => row.policyNumber)).toEqual(["HP-FL-88421"]);
  });

  it("rolls agency vs producer lapse risk, monoline, and missing dec", () => {
    const book = [
      {
        id: "elena",
        policyNumber: "HO3-ELENA-2026",
        status: "active",
        lineOfBusiness: "HO3",
        expirationDate: "2027-09-01",
        partyName: "Ruiz, Elena",
        partyKey: "elena",
        ownerId: "javy",
        ownerName: "Javy Garcia",
      },
      {
        id: "hale",
        policyNumber: "HP-FL-88421",
        status: "active",
        lineOfBusiness: "HO3",
        expirationDate: "2026-10-01",
        partyName: "Hale, Jordan",
        partyKey: "hale",
        ownerId: "javy",
        ownerName: "Javy Garcia",
        premiumChangePct: 0.166,
      },
      {
        id: "harbor",
        policyNumber: "GL-HARBOR-2026",
        status: "active",
        lineOfBusiness: "GL",
        expirationDate: "2027-03-01",
        partyName: "Harbor Key Marine LLC",
        partyKey: "harbor",
        ownerId: "maya",
        ownerName: "Maya Chen",
      },
    ];
    const mono = monolineGaps(book);
    expect(mono.map((row) => row.policyNumber).sort()).toEqual([
      "GL-HARBOR-2026",
      "HO3-ELENA-2026",
      "HP-FL-88421",
    ]);
    const risk = lapseRiskRows(book);
    expect(risk[0]?.policyNumber).toBe("HP-FL-88421");
    expect(risk[0]?.band).toBe("critical");
    const { agency, producers } = producerRollups(
      book,
      new Set(["hale"]),
      new Set(risk.map((row) => row.policyId)),
      new Set(mono.map((row) => row.partyKey)),
    );
    expect(agency.active).toBe(3);
    expect(agency.missingDec).toBe(1);
    expect(agency.monoline).toBe(3);
    expect(producers.map((row) => row.ownerName)).toEqual(["Javy Garcia", "Maya Chen"]);
  });

  it("rolls producer books under the agency total", () => {
    const files = new Map([
      ["elena", [{ docType: "policy_dec" }, { docType: "policy_id" }]],
    ]);
    const { agency, producers } = producerBookRows(
      [
        {
          id: "elena",
          policyNumber: "HO3-ELENA-2026",
          status: "active",
          lineOfBusiness: "HO3",
          expirationDate: "2027-09-01",
          partyName: "Ruiz, Elena",
          ownerId: "maya",
          ownerName: "Maya Chen",
        },
        {
          id: "hale",
          policyNumber: "HP-FL-88421",
          status: "active",
          lineOfBusiness: "HO3",
          expirationDate: "2026-10-01",
          partyName: "Hale, Jordan",
          ownerId: "javy",
          ownerName: "Javy Rivera",
        },
        {
          id: "gone",
          policyNumber: "XX-LAPSED",
          status: "lapse",
          lineOfBusiness: "HO3",
          expirationDate: "2026-01-01",
          partyName: "Gone",
          ownerId: "javy",
          ownerName: "Javy Rivera",
        },
      ],
      files,
    );
    expect(agency).toEqual({ active: 2, lapsed: 1, other: 0, total: 3 });
    expect(producers.map((row) => row.ownerName)).toEqual(["Javy Rivera", "Maya Chen"]);
    expect(producers[0].counts).toEqual({ active: 1, lapsed: 1, other: 0, total: 2 });
    expect(producers[0].missingCount).toBe(1); // Hale missing dec
    expect(producers[1].counts.active).toBe(1);
    expect(producers[1].missingCount).toBe(0); // Elena has dec; AOR optional
  });

  it("filters the book to one producer without dropping agency rollup helpers", () => {
    const book = [
      {
        id: "elena",
        policyNumber: "HO3-ELENA-2026",
        status: "active",
        lineOfBusiness: "HO3",
        expirationDate: "2027-09-01",
        partyName: "Ruiz, Elena",
        ownerId: "maya",
        ownerName: "Maya Chen",
      },
      {
        id: "hale",
        policyNumber: "HP-FL-88421",
        status: "active",
        lineOfBusiness: "HO3",
        expirationDate: "2026-10-01",
        partyName: "Hale, Jordan",
        ownerId: "javy",
        ownerName: "Javy Rivera",
      },
    ];
    expect(filterOwnedBook(book, "maya").map((row) => row.policyNumber)).toEqual(["HO3-ELENA-2026"]);
    expect(filterOwnedBook(book, "javy")).toHaveLength(1);
    expect(filterOwnedBook(book).map((row) => row.id)).toEqual(["elena", "hale"]);
    expect(filterOwnedBook(book, "unassigned")).toHaveLength(0);
  });
});
