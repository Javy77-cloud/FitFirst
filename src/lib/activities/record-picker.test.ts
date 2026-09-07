import { describe, expect, it } from "vitest";
import { matchesActivityRecordQuery, rankActivityRecordHits, type ActivityRecordHit } from "./record-picker";

describe("activity record picker", () => {
  it("matches name, email, or phone digits", () => {
    expect(matchesActivityRecordQuery("gonz", { name: "Gonzalez HO3", phone: "(321) 555-0100" })).toBe(true);
    expect(matchesActivityRecordQuery("5550100", { name: "Maya", phone: "321-555-0100" })).toBe(true);
    expect(matchesActivityRecordQuery("maya@", { name: "Maya", email: "maya@fitfirst.local" })).toBe(true);
    expect(matchesActivityRecordQuery("zzz", { name: "Maya", phone: "321" })).toBe(false);
  });

  it("ranks exact name hits first and contacts before deals", () => {
    const hits: ActivityRecordHit[] = [
      { kind: "deal", id: "d", name: "Maya shop", phone: null, email: null, leadId: null, dealId: "d", contactId: null, accountId: null },
      { kind: "contact", id: "c", name: "Maya", phone: "1", email: null, leadId: null, dealId: null, contactId: "c", accountId: null },
      { kind: "lead", id: "l", name: "Maya Lead", phone: null, email: null, leadId: "l", dealId: null, contactId: null, accountId: null },
    ];
    expect(rankActivityRecordHits(hits, "Maya").map((row) => row.kind)).toEqual(["contact", "lead", "deal"]);
  });
});
