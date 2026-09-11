import { describe, expect, it } from "vitest";
import {
  businessMatchLabel,
  findExistingBusinessMatch,
} from "./existing-business-match";

const book = [
  {
    id: "a1",
    name: "Ruiz Tile LLC",
    legalName: "Ruiz Tile Limited Liability Company",
    dba: "Ruiz Tile",
    einLast4: "4567",
  },
  {
    id: "a2",
    name: "Harbor Key Marine LLC",
    legalName: "Harbor Key Marine LLC",
    dba: null,
    einLast4: "9999",
  },
];

describe("findExistingBusinessMatch", () => {
  it("warns on EIN last4", () => {
    const hit = findExistingBusinessMatch(book, { name: "Other", ein: "59-1234567" });
    expect(hit?.business.id).toBe("a1");
    expect(hit?.reason).toBe("ein");
  });

  it("warns on normalized legal name", () => {
    const hit = findExistingBusinessMatch(book, {
      name: "Ruiz Tile Limited Liability Company",
      ein: null,
    });
    expect(hit?.business.id).toBe("a1");
    expect(hit?.reason).toBe("name");
    expect(businessMatchLabel(hit!)).toContain("Ruiz Tile");
  });

  it("warns on DBA", () => {
    const hit = findExistingBusinessMatch(book, { name: "Unused", dba: "Ruiz Tile" });
    expect(hit?.business.id).toBe("a1");
  });

  it("returns null when nothing matches", () => {
    expect(findExistingBusinessMatch(book, { name: "Brand New Co", ein: "12-0000001" })).toBeNull();
  });
});
