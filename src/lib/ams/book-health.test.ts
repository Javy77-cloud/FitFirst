import { describe, expect, it } from "vitest";
import { bookHealthCounts, missingDocRows } from "./book-health";

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
});
