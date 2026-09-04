import { describe, expect, it } from "vitest";
import { parsePage, slicePage } from "./page";

describe("Open API pagination", () => {
  it("clamps limit and offset", () => {
    expect(parsePage(new URLSearchParams("limit=0&offset=-4"))).toEqual({ limit: 1, offset: 0 });
    expect(parsePage(new URLSearchParams("limit=9000"))).toEqual({ limit: 500, offset: 0 });
    expect(parsePage(new URLSearchParams())).toEqual({ limit: 100, offset: 0 });
  });

  it("slices a page and keeps the full count", () => {
    const page = slicePage(["a", "b", "c", "d"], 2, 1);
    expect(page.items).toEqual(["b", "c"]);
    expect(page.count).toBe(4);
  });
});
