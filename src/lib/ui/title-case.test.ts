import { describe, expect, it } from "vitest";
import { titleCaseLabel } from "./title-case";

describe("titleCaseLabel", () => {
  it("title-cases meaningful words", () => {
    expect(titleCaseLabel("Fill Master Sheet")).toBe("Fill Master Sheet");
    expect(titleCaseLabel("Request Quotes")).toBe("Request Quotes");
    expect(titleCaseLabel("Collapse All")).toBe("Collapse All");
    expect(titleCaseLabel("Confirm & Request Quotes")).toBe("Confirm & Request Quotes");
    expect(titleCaseLabel("Save Lead")).toBe("Save Lead");
    expect(titleCaseLabel("New Lead")).toBe("New Lead");
    expect(titleCaseLabel("Show Hidden")).toBe("Show Hidden");
    expect(titleCaseLabel("Add event")).toBe("Add Event");
    expect(titleCaseLabel("Manage tags")).toBe("Manage Tags");
    expect(titleCaseLabel("New task")).toBe("New Task");
    expect(titleCaseLabel("Save color")).toBe("Save Color");
    expect(titleCaseLabel("Mark all as read")).toBe("Mark All as Read");
  });

  it("keeps mid-phrase small connectors lowercase", () => {
    expect(titleCaseLabel("Open In Carrier")).toBe("Open in Carrier");
    expect(titleCaseLabel("Add a holder contact")).toBe("Add a Holder Contact");
  });

  it("keeps short ALLCAPS tokens", () => {
    expect(titleCaseLabel("Queue SMS")).toBe("Queue SMS");
    expect(titleCaseLabel("Log MVR")).toBe("Log MVR");
  });
});
