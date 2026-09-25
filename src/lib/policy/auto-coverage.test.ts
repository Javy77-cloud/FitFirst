import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VehiclesList } from "@/components/desk-ams-panels";
import { LobOverviewSections } from "@/components/policy/lob-overview-sections";
import type { Vehicle } from "@/lib/db/schema";
import { sheetKeysForGeminiKey } from "@/lib/extraction/gemini/map";
import {
  GEMINI_AUTO_EXTRACT_JSON_KEYS,
  buildGeminiSystemPrompt,
  buildGeminiUserPrompt,
} from "@/lib/extraction/gemini/prompt";
import {
  PAP_COVERAGE_FILL_KEYS,
  PAP_COVERAGE_FILL_KEYS_BEFORE,
  autoCoverageExtras,
  autoCoverageSchedule,
} from "./auto-coverage";

describe("personal auto coverage schedule", () => {
  it("shows deductibles and line premiums beside the limits", () => {
    const rows = autoCoverageSchedule({
      coverageLimits: {
        liability_bi: "$100,000/$300,000",
        liability_bi_premium: "$412",
        pip: "$10,000",
        pip_deductible: "1000",
        pip_premium: "$220",
        discounts: "Multi-car",
        um_stacked: "Non-stacked",
      },
      comprehensiveDeductible: "500",
      collisionDeductible: "500",
    });
    const pip = rows.find((row) => row.key === "pip");
    const comp = rows.find((row) => row.key === "comprehensive");
    expect(pip).toMatchObject({ limit: "$10,000", deductible: "1000", premium: "$220" });
    expect(comp).toMatchObject({ deductible: "500", premium: "None" });
    expect(rows.map((row) => row.label)).toEqual(
      expect.arrayContaining(["Bodily injury", "Property damage", "PIP", "Comprehensive", "Collision"]),
    );
    expect(autoCoverageExtras({ coverageLimits: { um_stacked: "Non-stacked", discounts: "Multi-car" } })).toEqual([
      { key: "um_stacked", label: "UM stacked", value: "Non-stacked" },
      { key: "discounts", label: "Discounts", value: "Multi-car" },
    ]);
  });
});

describe("personal auto vehicles section", () => {
  it("uses one policy line and shows bodily injury and property damage instead of miles, garaging, and lienholder", () => {
    const overview = renderToStaticMarkup(
      createElement(LobOverviewSections, {
        input: { policyId: "p1", lineOfBusiness: "AUTO", vehicleCount: 2 },
        readOnly: true,
      }),
    );
    expect(overview).toBe("");

    const html = renderToStaticMarkup(
      createElement(VehiclesList, {
        vehicles: [
          {
            id: "v1",
            year: 2018,
            make: "Honda",
            model: "Civic",
            vin: "2HGFC2F59JH123456",
            usage: "Personal",
            annualMiles: "12,000 – 14,999",
            lienholder: "Honda Financial",
            garagingAddress: "100 Main St",
            premium: "$640",
            comprehensiveDeductible: "500",
            collisionDeductible: "500",
            garagingZip: "32901",
          } as Vehicle,
        ],
        bodilyInjury: "$100,000/$300,000",
        propertyDamage: "$100,000",
      }),
    );
    expect(html).toContain("Vehicles in this policy (1)");
    expect(html).not.toContain("Vehicles on this Auto");
    expect(html).not.toContain("Line template");
    expect(html).not.toContain("auto policy");
    expect(html).toContain("Personal");
    expect(html).toContain("$640");
    expect(html).toContain("Bodily injury");
    expect(html).toContain("Damage to property");
    expect(html).toContain("$100,000/$300,000");
    expect(html).toContain("$100,000");
    expect(html).toContain("Comp deductible");
    expect(html).toContain("Collision deductible");
    expect(html).not.toContain("Annual miles");
    expect(html).not.toContain("Garaging");
    expect(html).not.toContain("Lienholder");
    expect(html).not.toContain("12,000 – 14,999");
    expect(html).not.toContain("Honda Financial");
    expect(html).not.toContain("32901");
    expect(html).not.toContain("100 Main St");

    const overviewSource = readFileSync("src/components/policy/tabs/overview-tab.tsx", "utf8");
    expect(overviewSource).toMatch(/bodilyInjury=\{limits\.liability_bi/);
    expect(overviewSource).toMatch(/propertyDamage=\{limits\.liability_pd/);
    const vehiclesSource = readFileSync("src/components/desk-ams-panels.tsx", "utf8");
    expect(vehiclesSource).not.toMatch(/Annual miles/);
    expect(vehiclesSource).not.toMatch(/annualMiles/);
    expect(vehiclesSource).not.toMatch(/Lienholder/);
    expect(vehiclesSource).not.toMatch(/Garaging/);
  });
});

describe("PAP coverage Gemini keys", () => {
  it("puts every Coverage cell in the extract schema, the field map, and both Fill prompts", () => {
    const system = buildGeminiSystemPrompt("dec", "auto");
    const user = buildGeminiUserPrompt("dec", "auto");
    for (const key of PAP_COVERAGE_FILL_KEYS) {
      expect(GEMINI_AUTO_EXTRACT_JSON_KEYS).toContain(key);
      expect(sheetKeysForGeminiKey(key)).toContain(key);
      expect(system).toContain(key);
      expect(user).toContain(key);
    }
    const before = new Set<string>(PAP_COVERAGE_FILL_KEYS_BEFORE);
    for (const key of before) expect(PAP_COVERAGE_FILL_KEYS).toContain(key);
    const added = PAP_COVERAGE_FILL_KEYS.filter((key) => !before.has(key));
    expect(added).toEqual(
      expect.arrayContaining([
        "liability_bi_premium",
        "liability_pd_premium",
        "pip_deductible",
        "pip_premium",
        "med_pay",
        "med_pay_premium",
        "um_uim_premium",
        "um_pd",
        "um_pd_premium",
        "um_stacked",
        "comp_premium",
        "collision_premium",
        "rental",
        "rental_premium",
        "towing",
        "towing_premium",
        "glass",
        "glass_premium",
        "discounts",
      ]),
    );
    expect(sheetKeysForGeminiKey("comprehensive_deductible")).toContain("comp_deductible");
    expect(sheetKeysForGeminiKey("um_property_damage")).toContain("um_pd");
  });
});
