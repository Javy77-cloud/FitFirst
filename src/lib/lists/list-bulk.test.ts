import { describe, expect, it } from "vitest";
import {
  applyMassTagMode,
  canMassAssignOwner,
  importEntityForCrmList,
  massAssignBlockedReason,
  tagModuleForCrmList,
} from "./list-bulk";

describe("list bulk helpers", () => {
  it("maps carriers to tag + CSV packs", () => {
    expect(tagModuleForCrmList("carriers")).toBe("carriers");
    expect(importEntityForCrmList("carriers")).toBe("carriers");
    expect(tagModuleForCrmList("businesses")).toBe("accounts");
    expect(importEntityForCrmList("businesses")).toBe("businesses");
  });

  it("blocks assign owner on carriers like Business stub", () => {
    expect(canMassAssignOwner("carriers")).toBe(false);
    expect(massAssignBlockedReason("carriers")).toMatch(/no owner/i);
    expect(canMassAssignOwner("contacts")).toBe(true);
    expect(massAssignBlockedReason("contacts")).toBeNull();
  });

  it("adds or replaces tags without inventing names", () => {
    expect(applyMassTagMode(["preferred"], ["surplus", "preferred"], "add")).toEqual([
      "preferred",
      "surplus",
    ]);
    expect(applyMassTagMode(["preferred"], ["surplus"], "replace")).toEqual(["surplus"]);
    expect(applyMassTagMode(["preferred"], [], "replace")).toEqual([]);
  });
});
