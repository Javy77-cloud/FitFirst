import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, replace: () => undefined, push: () => undefined }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/deals/deal-1",
}));

import { MasterSheetCompare } from "@/components/deal/master-sheet-compare";
import { emptySheetValues, fieldsForLine, groupFields } from "./catalog";
import {
  MANUFACTURED_HOME_SECTION,
  MHO_SECTION_KEYS,
} from "./mho-risk-profile";

describe("MHO Risk Profile questions", () => {
  it("hides manufactured-home-only keys on HO3", () => {
    const home = fieldsForLine("home", "homeowners", "HO3");
    const keys = new Set(home.map((field) => field.key));
    expect(keys.has("tie_downs")).toBe(true);
    expect(keys.has("hud_label")).toBe(true);
    expect(keys.has("mh_make")).toBe(true);
    expect(home.find((field) => field.key === "tie_downs")?.group).toBe("Dwelling");
    expect(home.find((field) => field.key === "mh_make")?.showWhen).toEqual({
      key: "mobile_home",
      values: ["yes"],
    });
    expect(keys.has("fire_alarm")).toBe(true);
    expect(keys.has("garage_spaces")).toBe(true);
    expect(keys.has("prior_residence_address")).toBe(true);
    expect(home.find((field) => field.key === "structure_type")?.group).toBe("Dwelling");
    expect(home.find((field) => field.key === "garage_type")?.options).toEqual([
      "Attached",
      "Detached",
      "Carport",
    ]);
    expect(groupFields("home", "homeowners", undefined, "HO3").some((group) => group.group === MANUFACTURED_HOME_SECTION)).toBe(
      false,
    );
  });

  it("shows the Manufactured home group for MHO, MMHO, and Manufactured Home", () => {
    for (const form of ["MHO", "MMHO", "Manufactured Home", "MH"]) {
      const fields = fieldsForLine("home", "homeowners", form);
      const byKey = new Map(fields.map((field) => [field.key, field]));
      for (const key of MHO_SECTION_KEYS) {
        expect(byKey.get(key)?.group, `${form} ${key}`).toBe(MANUFACTURED_HOME_SECTION);
      }
      expect(byKey.get("structure_type")?.options).toContain("Manufactured Home");
      expect(byKey.get("prior_residence_address")?.showWhen).toEqual({
        key: "resided_under_2_years",
        values: ["yes"],
      });
      expect(byKey.get("garage_type")?.options).toEqual(["Attached", "Detached", "Carport"]);
      expect(byKey.get("fire_alarm")?.label).toBe("Fire alarm");
      expect(byKey.get("tie_downs")?.showWhen).toBeUndefined();
      expect(byKey.get("mh_make")?.label).toBe("Make (unit)");
      const titles = groupFields("home", "homeowners", undefined, form).map((group) => group.group);
      expect(titles[0], form).toBe(MANUFACTURED_HOME_SECTION);
      expect(titles.join(" ")).not.toMatch(/\bHMO\b/);
    }
  });

  it("renders editable Manufactured home inputs on an MHO Risk Profile", () => {
    const html = renderToString(
      createElement(MasterSheetCompare, {
        dealId: "deal-mho",
        line: "home",
        fields: [],
        values: emptySheetValues("home", "homeowners"),
        product: "homeowners",
        quotingForm: "MMHO",
      }),
    );
    expect(html).toContain("Manufactured home");
    expect(html).toContain('name="tie_downs"');
    expect(html).toContain('name="hud_label"');
    expect(html).toContain('name="mh_make"');
    expect(html).toContain('name="mh_model"');
    expect(html).toContain('name="mh_year"');
    expect(html).toContain('name="garage_spaces"');
    expect(html).toContain('name="fire_alarm"');
    expect(html).toContain("HUD label");
    expect(html).not.toMatch(/\bHMO\b/);
  });
});
