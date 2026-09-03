import { describe, expect, it } from "vitest";
import fixture from "@/lib/fixtures/ana-dib-ho3-2026-09-02.json";
import { CONTACT_ID, LEAD_ID, MERGE_IDS } from "@/lib/fixtures/ids";
import { copyMissingFields, CONTACT_COPY_FIELDS } from "./copy-fields";
import { assertMergeAllowed, isAnaLockedId, isAnaName, MergeLockError } from "./lock";
import { findDuplicatePairs, skipFromScan } from "./match";
import {
  matchReasons,
  normalizeAddress,
  normalizeEmail,
  normalizePhone,
  type PersonLike,
} from "./normalize";

const anaContact: PersonLike = {
  id: CONTACT_ID,
  firstName: "Ana",
  lastName: "Dib",
  mailingAddress: "1098 Adige Ct SE",
  city: "Palm Bay",
  state: "FL",
  zip: "32909",
};

const rosaKeeper: PersonLike = {
  id: MERGE_IDS.contactKeeper,
  firstName: "Rosa",
  lastName: "Keene",
  email: "Rosa.Keene@example.com",
  phone: "(321) 555-0148",
  mailingAddress: "412 Harbor Lane",
  city: "Melbourne",
  state: "FL",
  zip: "32901",
};

const rosaDuplicate: PersonLike = {
  id: MERGE_IDS.contactDuplicate,
  firstName: "Rosa",
  lastName: "Keene",
  email: "rosa.keene@example.com",
  phone: null,
  mailingAddress: null,
  city: "Melbourne",
  state: "FL",
  zip: "32901",
  dateOfBirth: "1979-04-12",
};

describe("Ana lock", () => {
  it("keeps the fixture shop at Cov A $321,000 with zero bindable quotes", () => {
    expect(fixture.risk.coverageA).toBe(321000);
    expect(fixture.outcome.bindableAt321k).toBe(0);
    expect(fixture.insured.primary).toBe("Ana Dib");
  });

  it("does not use Ana or Mario / wave-1 Zoho ids for the seed pair", () => {
    const used = Object.values(MERGE_IDS);
    expect(used).not.toContain(CONTACT_ID);
    expect(used).not.toContain(LEAD_ID);
    expect(used.every((id) => id.startsWith("b8e9"))).toBe(true);
    expect(used.some((id) => /mario/i.test(id))).toBe(false);
  });

  it("refuses a merge when either side is Ana Dib", () => {
    expect(isAnaLockedId(CONTACT_ID)).toBe(true);
    expect(isAnaName("ANA", "DIB")).toBe(true);
    expect(() => assertMergeAllowed(anaContact, rosaDuplicate)).toThrow(MergeLockError);
    expect(() => assertMergeAllowed(rosaKeeper, { ...rosaDuplicate, firstName: "Ana", lastName: "Dib" })).toThrow(
      /Ana Dib is locked/,
    );
  });

  it("never proposes Ana as a merge candidate", () => {
    const pairs = findDuplicatePairs("contact", [
      anaContact,
      {
        ...anaContact,
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa99",
        email: "ana.dib@example.com",
      },
      rosaKeeper,
      rosaDuplicate,
    ]);
    expect(pairs.every((p) => p.leftId !== CONTACT_ID && p.rightId !== CONTACT_ID)).toBe(true);
    expect(skipFromScan(anaContact)).toBe(true);
  });
});

describe("rule-based match", () => {
  it("matches the seeded Rosa pair on normalized email, not a score", () => {
    expect(normalizeEmail("Rosa.Keene@example.com")).toBe("rosa.keene@example.com");
    expect(matchReasons(rosaKeeper, rosaDuplicate)).toEqual(["email"]);
    const pairs = findDuplicatePairs("contact", [rosaKeeper, rosaDuplicate]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].matchReasons).toEqual(["email"]);
  });

  it("matches phone after stripping punctuation and a leading 1", () => {
    const a = { ...rosaKeeper, email: null, phone: "+1 (321) 555-0148" };
    const b = { ...rosaDuplicate, email: null, phone: "3215550148" };
    expect(normalizePhone(a.phone)).toBe("3215550148");
    expect(matchReasons(a, b)).toEqual(["phone"]);
  });

  it("matches name + date of birth", () => {
    const a = { ...rosaKeeper, email: null, phone: null, dateOfBirth: new Date("1979-04-12T12:00:00.000Z") };
    const b = { ...rosaDuplicate, email: null, dateOfBirth: "04/12/1979" };
    expect(matchReasons(a, b)).toEqual(["name_dob"]);
  });

  it("matches name + address after street abbreviation", () => {
    const a = { ...rosaKeeper, email: null, phone: null };
    const b = {
      ...rosaDuplicate,
      email: null,
      mailingAddress: "412 Harbor Ln",
      zip: "32901-1234",
    };
    expect(normalizeAddress(a)).toBe(normalizeAddress(b));
    expect(matchReasons(a, b)).toEqual(["name_address"]);
  });

  it("does not invent a match for two different people", () => {
    expect(
      matchReasons(rosaKeeper, {
        id: "other",
        firstName: "Luis",
        lastName: "Pena",
        email: "luis.pena@example.com",
        phone: "4075550100",
      }),
    ).toEqual([]);
  });
});

describe("merge without loss", () => {
  it("copies blank keeper fields and never overwrites filled ones", () => {
    const keeper = {
      email: "Rosa.Keene@example.com",
      phone: "(321) 555-0148",
      mailingAddress: "412 Harbor Lane",
      city: "Melbourne",
      state: "FL",
      zip: "32901",
      dateOfBirth: null,
      tenureStart: new Date("2024-03-01T15:00:00.000Z"),
      lifeNotes: null,
      healthNotes: null,
      notes: "Book HO3 from a prior agency.",
      policyCount: 1,
    };
    const duplicate = {
      email: "rosa.keene@example.com",
      phone: "407-555-9999",
      mailingAddress: "88 Pine Ave",
      city: "Melbourne",
      state: "FL",
      zip: "32901",
      dateOfBirth: "1979-04-12",
      tenureStart: new Date("2025-01-01T00:00:00.000Z"),
      lifeNotes: "Term inquiry 2025 — CRM note only.",
      healthNotes: null,
      notes: "Facebook lead form.",
      policyCount: 0,
    };

    const { next, copiedFields } = copyMissingFields(keeper, duplicate, CONTACT_COPY_FIELDS);

    expect(next.phone).toBe("(321) 555-0148");
    expect(next.mailingAddress).toBe("412 Harbor Lane");
    expect(next.email).toBe("Rosa.Keene@example.com");
    expect(next.dateOfBirth).toBe("1979-04-12");
    expect(next.lifeNotes).toBe("Term inquiry 2025 — CRM note only.");
    expect(next.tenureStart).toEqual(new Date("2024-03-01T15:00:00.000Z"));
    expect(String(next.notes)).toContain("Book HO3 from a prior agency.");
    expect(String(next.notes)).toContain("Facebook lead form.");
    expect(next.policyCount).toBe(1);
    expect(copiedFields).toEqual(expect.arrayContaining(["dateOfBirth", "lifeNotes", "notes"]));
    expect(copiedFields).not.toContain("phone");
    expect(copiedFields).not.toContain("mailingAddress");
  });

  it("sums policy counts so a book policy is not dropped", () => {
    const { next } = copyMissingFields(
      { policyCount: 1, notes: null },
      { policyCount: 2, notes: null },
      CONTACT_COPY_FIELDS,
    );
    expect(next.policyCount).toBe(3);
  });

  it("treats retire as archive, not delete", () => {
    const retired = {
      ...rosaDuplicate,
      status: "archived",
      mergedIntoId: MERGE_IDS.contactKeeper,
      archivedAt: new Date(),
    };
    expect(skipFromScan(retired)).toBe(true);
    expect(findDuplicatePairs("contact", [rosaKeeper, retired])).toHaveLength(0);
  });
});
