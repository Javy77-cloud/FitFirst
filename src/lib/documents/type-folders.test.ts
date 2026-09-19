import { describe, expect, it } from "vitest";
import { groupFoldersByTypeAndCarrier, typeKeyFromFolderName } from "./type-folders";

describe("document type folders", () => {
  it("maps folder names to type keys", () => {
    expect(typeKeyFromFolderName("ACORD")).toBe("acord");
    expect(typeKeyFromFolderName("Cancellation")).toBe("cancellation");
    expect(typeKeyFromFolderName("AOR")).toBe("aor");
    expect(typeKeyFromFolderName("Carrier flyers")).toBe("flyer");
    expect(typeKeyFromFolderName("Citizens")).toBeNull();
  });

  it("nests carrier folders inside type folders", () => {
    const groups = groupFoldersByTypeAndCarrier([
      { id: "acord", name: "ACORD", parentId: null, library: "forms" },
      { id: "citizens", name: "Citizens", parentId: "acord", library: "forms" },
      { id: "tailrow", name: "Tailrow", parentId: "acord", library: "forms" },
      { id: "cancel", name: "Cancellation", parentId: "agency", library: "forms" },
      { id: "agency", name: "Agency forms", parentId: null, library: "forms" },
    ]);
    const acord = groups.find((row) => row.typeKey === "acord");
    expect(acord?.carriers.map((c) => c.carrierName)).toEqual(["Citizens", "Tailrow"]);
    expect(groups.find((row) => row.typeKey === "cancellation")?.folder?.id).toBe("cancel");
    expect(groups.find((row) => row.typeKey === "agency_form")?.folder?.id).toBe("agency");
  });
});
