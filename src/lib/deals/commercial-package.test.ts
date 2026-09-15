import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  defaultFormForPackageLine,
  lobsToBindForDeal,
  normalizeSelectedPackageLines,
  packageCreateDraft,
  resolveActivePackageLine,
  resolveVisiblePackageLines,
} from "./package-lines";
import { newDealCreateHref, packageDraftForNewDealSave } from "./new-deal-href";

describe("commercial multi-line package", () => {
  it("selects GL / Workers' Comp / BOP without mixing personal or Life/Health", () => {
    expect(normalizeSelectedPackageLines(["bop", "workers_comp"])).toEqual([
      "workers_comp",
      "bop",
    ]);
    expect(packageCreateDraft(["general_liability", "bop"]).shopLines).toEqual([
      "general_liability",
      "bop",
    ]);
    expect(packageCreateDraft(["home", "auto"]).shopLines).toEqual(["home", "auto"]);
  });

  it("creates one sheet line per checked commercial product", () => {
    const draft = packageCreateDraft(["general_liability", "workers_comp", "bop"]);
    expect(draft.shopLines.map(defaultFormForPackageLine)).toEqual(["GL", "WC", "BOP"]);
    expect(draft.family).toBe("commercial");
    expect(draft.bindTarget).toBe("account");
  });

  it("routes deal detail on ?line= for commercial chips", () => {
    const lines = resolveVisiblePackageLines({
      shopLines: ["general_liability", "workers_comp", "bop"],
      lineOfBusiness: "GL",
    });
    expect(lines).toEqual(["general_liability", "workers_comp", "bop"]);
    expect(
      resolveActivePackageLine({
        lineParam: "workers_comp",
        packageLines: lines,
        quotingLine: "general_liability",
        lineOfBusiness: "GL",
      }),
    ).toBe("workers_comp");
  });

  it("bind helpers emit one LOB per commercial package line", () => {
    expect(
      lobsToBindForDeal({
        shopLines: ["general_liability", "workers_comp"],
        lineOfBusiness: "GL",
      }),
    ).toEqual(["GL", "WC"]);
  });

  it("Save-only create href keeps commercial shopLines", () => {
    expect(newDealCreateHref({ shopLines: ["workers_comp"] })).toBe(
      "/deals/new?shopLines=workers_comp",
    );
    const form = {
      getAll: (name: string) => (name === "shopLines" ? ["general_liability", "bop"] : []),
      get: () => "",
    };
    expect(packageDraftForNewDealSave(form)?.quotingForm).toBe("GL");
  });

  it("wires create dialog, deal page, and bind to the shared package system", () => {
    const dialog = readFileSync("src/components/deals/add-new-deal-dialog.tsx", "utf8");
    expect(dialog).toMatch(/PackageFamilyToggle/);
    expect(dialog).toMatch(/newDealCreateHref/);
    expect(dialog).not.toMatch(/\.insert\(/);
    const page = readFileSync("src/app/deals/[id]/page.tsx", "utf8");
    expect(page).toMatch(/DealLineSwitcher/);
    expect(page).toMatch(/resolveActivePackageLine/);
    expect(page).toMatch(/packageFamilyOf/);
    const save = readFileSync("src/app/actions/crm.ts", "utf8");
    expect(save).toMatch(/commercialDraft/);
    expect(save).toMatch(/insertSheetsForDeal\(deal\.id, shopLines\)/);
    expect(save).toMatch(/lobsToBindForDeal/);
  });
});
