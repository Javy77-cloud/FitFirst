import { describe, expect, it } from "vitest";
import { bookHealthCounts, filterOwnedBook, missingDocRows, producerBookRows } from "./book-health";

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

  it("lists in-force policies that are missing dec, ID, or AOR", () => {
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
    expect(rows.map((row) => row.policyNumber)).toEqual(["HP-FL-88421", "HO3-ELENA-2026"]);
    expect(rows[0].labels).toEqual(["Dec on file", "ID cards", "AOR packet"]);
    expect(rows[1].labels).toEqual(["AOR packet"]);
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
    expect(producers[0].missingCount).toBe(1);
    expect(producers[1].counts.active).toBe(1);
    expect(producers[1].missingCount).toBe(1);
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
