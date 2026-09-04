import { describe, expect, it } from "vitest";
import {
  mergeRecent,
  parseRecordPath,
  pushLocalRecent,
  readLocalRecent,
  recentHref,
  type RecentRecord,
} from "./recently-accessed";

const contact: RecentRecord = {
  kind: "contact",
  id: "c1",
  title: "Ruiz, Elena",
  href: "/contacts/c1",
  at: 100,
};

const deal: RecentRecord = {
  kind: "deal",
  id: "d1",
  title: "Ruiz · Melbourne HO3",
  href: "/deals/d1",
  at: 90,
};

describe("recently accessed", () => {
  it("parses contact, deal, and policy record paths", () => {
    expect(parseRecordPath("/contacts/abc")).toEqual({
      kind: "contact",
      id: "abc",
      href: "/contacts/abc",
    });
    expect(parseRecordPath("/deals/xyz/quote-sheet/home")).toEqual({
      kind: "deal",
      id: "xyz",
      href: "/deals/xyz",
    });
    expect(parseRecordPath("/policies/p1")).toEqual({
      kind: "policy",
      id: "p1",
      href: "/policies/p1",
    });
    expect(parseRecordPath("/leads/abc")).toBeNull();
    expect(parseRecordPath("/contacts")).toBeNull();
  });

  it("dedupes local visits and prefers the latest title", () => {
    const next = pushLocalRecent([contact], { ...contact, title: "Elena Ruiz" }, 200);
    expect(next).toHaveLength(1);
    expect(next[0]?.title).toBe("Elena Ruiz");
    expect(next[0]?.at).toBe(200);
  });

  it("merges local visits ahead of the DB stub", () => {
    const stub: RecentRecord[] = [deal, { ...contact, title: "Old name", at: 1 }];
    const merged = mergeRecent([contact], stub);
    expect(merged.map((row) => row.id)).toEqual(["c1", "d1"]);
    expect(merged[0]?.title).toBe("Ruiz, Elena");
  });

  it("ignores broken localStorage JSON", () => {
    expect(readLocalRecent("not-json")).toEqual([]);
    expect(readLocalRecent('{"no":"array"}')).toEqual([]);
  });

  it("builds record hrefs", () => {
    expect(recentHref("contact", "1")).toBe("/contacts/1");
    expect(recentHref("deal", "2")).toBe("/deals/2");
    expect(recentHref("policy", "3")).toBe("/policies/3");
  });
});
