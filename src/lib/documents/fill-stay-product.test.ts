import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveActiveProductInstance, resolveVisibleProductInstances } from "@/lib/deals/product-instances";
import { fillStayHref } from "./deal-docs-save";

const COPY = "homeowners~k7f3a2";

function twoHomeProducts() {
  return resolveVisibleProductInstances({
    shopProducts: ["homeowners", COPY],
    quotingForm: "HO3",
  });
}

describe("fill stays on the product it started on", () => {
  it("keeps a second HO3 instead of opening the first sibling", () => {
    const rows = twoHomeProducts();
    const jumped = resolveActiveProductInstance({
      lineParam: "home",
      instances: rows,
    });
    expect(jumped.key).toBe("homeowners");

    const href = fillStayHref({
      dealId: "gloria",
      line: `home~${COPY}`,
      product: COPY,
    });
    const params = new URLSearchParams(href.slice(href.indexOf("?") + 1));
    expect(params.get("tab")).toBe("documents");
    expect(params.get("line")).toBe(`home~${COPY}`);
    expect(params.get("product")).toBe(COPY);
    const stayed = resolveActiveProductInstance({
      lineParam: params.get("line"),
      productParam: params.get("product"),
      instances: rows,
    });
    expect(stayed.key).toBe(COPY);
  });

  it("does not alias a bare shop line onto the first homeowners product", () => {
    expect(fillStayHref({ dealId: "d1", line: "home" })).toBe("/deals/d1?tab=documents&line=home");
    const landlord = fillStayHref({ dealId: "d1", line: "home~landlord" });
    const params = new URLSearchParams(landlord.slice(landlord.indexOf("?") + 1));
    expect(params.get("line")).toBe("home~landlord");
    expect(params.get("product")).toBe("landlord");
  });

  it("wires Fill Risk Profile, property, and FEMA completion onto that href", () => {
    const button = readFileSync("src/components/deal/master-sheet-fill-button.tsx", "utf8");
    expect(button).toMatch(/fillStayHref\(\{ dealId, line: fillLine, product \}\)/);
    expect(button).not.toMatch(/router\.replace\(`\/deals\/\$\{dealId\}\?tab=documents&line=\$\{line\}`\)/);
    expect(button).toMatch(/line: fillLine/);
    const sheet = readFileSync("src/components/deal/master-sheet-compare.tsx", "utf8");
    expect(sheet).toMatch(/storageLine=\{storageLine\}/);
    expect(sheet).toMatch(/product=\{productId\}/);
    const action = readFileSync("src/app/actions/quote-sheet.ts", "utf8");
    const innerStart = action.indexOf("async function fillMasterSheetStepInner");
    const innerEnd = action.indexOf("/** Fast metadata list");
    const inner = action.slice(innerStart, innerEnd);
    expect(inner).toMatch(/shopLine === "auto"/);
    expect(inner).toMatch(/shopLine !== "auto"/);
    expect(inner).not.toMatch(/lineRaw === "auto"/);
    expect(action).toMatch(/fillStayHref\(\{ dealId, line: lineRaw, product \}\)/);
    expect(readFileSync("src/app/actions/lifecycle.ts", "utf8")).toMatch(
      /fillStayHref\(\{ dealId, line, product, notice: "filled" \}\)/,
    );
    expect(readFileSync("src/app/actions/documents.ts", "utf8")).toMatch(
      /fillStayHref\(\{ dealId: last\.dealId, line, product, tab, notice: "filled" \}\)/,
    );
  });
});
