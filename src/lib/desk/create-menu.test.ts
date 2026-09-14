import { describe, expect, it } from "vitest";
import { CREATE_MENU } from "./create-menu";

describe("home create menu", () => {
  it("groups people, deals, activities, and FNOL — not a flat list", () => {
    expect(CREATE_MENU.map((group) => group.id)).toEqual([
      "people",
      "deals",
      "activities",
      "records",
    ]);
    expect(CREATE_MENU.find((g) => g.id === "people")?.items.map((i) => i.id)).toEqual([
      "lead",
      "contact",
      "business",
    ]);
    expect(CREATE_MENU.find((g) => g.id === "deals")?.items.map((i) => i.href)).toEqual([
      "/deals/new",
    ]);
  });

  it("does not offer policy invent or a fake quote create", () => {
    const hrefs = CREATE_MENU.flatMap((group) => group.items.map((item) => item.href));
    expect(hrefs).not.toContain("/policies/new");
    expect(hrefs).not.toContain("/quotes/new");
    expect(hrefs).toContain("/claims/new");
    expect(hrefs).toContain("/calls/new");
    expect(hrefs).toContain("/tasks?newTask=1");
    expect(hrefs).not.toContain("/tasks/new");
  });
});
