import { describe, expect, it } from "vitest";
import {
  bookHealthCounts,
  lapseRiskRows,
  missingDecRows,
  missingDocRows,
  monolineGaps,
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
});
