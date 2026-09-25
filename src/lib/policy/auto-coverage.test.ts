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
import { PolicyCoverageTab } from "@/components/policy/tabs/coverage-tab";
import {
  PAP_COVERAGE_FILL_KEYS,
  PAP_COVERAGE_FILL_KEYS_BEFORE,
  autoCoverageExtras,
  autoCoverageSchedule,
  autoVehicleCoverageBlocks,
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
    expect(pip).toMatchObject({ limit: "$10,000", deductible: "$1,000", premium: "$220" });
    expect(rows.map((row) => row.label)).toEqual([
      "Bodily injury",
      "Property damage",
      "PIP",
      "Medical payments",
      "UM / UIM",
      "UM property damage",
    ]);
    expect(rows.map((row) => row.label)).not.toContain("Comprehensive");
    const [vehicle] = autoVehicleCoverageBlocks({
      coverageLimits: {
        liability_bi: "$100,000/$300,000",
        comp_premium: "",
      },
      comprehensiveDeductible: "500",
      collisionDeductible: "500",
    });
    const comp = vehicle?.rows.find((row) => row.label === "Comprehensive");
    const collision = vehicle?.rows.find((row) => row.label === "Collision");
    expect(comp).toMatchObject({ limit: "✓", deductible: "$500", premium: "None" });
    expect(collision).toMatchObject({ limit: "✓", deductible: "$500", premium: "None" });
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
    expect(html).toContain("Comprehensive");
    expect(html).toContain("Collision");
    expect(html).not.toContain("Comp deductible");
    expect(html).not.toContain("Collision deductible");
    expect(html).toContain("✓");
    expect(html).not.toContain(">500<");
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
    expect(system).toMatch(/\$1,000/);
    expect(system).toContain("✓");
    expect(user).toMatch(/\$500/);
    expect(user).toContain("✓");
    expect(system).toMatch(/no dollar deductible/i);
    expect(user).toMatch(/no dollar deductible/i);
    expect(system).toMatch(/policy-wide/i);
    expect(system).toContain("vehicle_N_glass");
    expect(user).toContain("vehicle_N_rental");
    expect(GEMINI_AUTO_EXTRACT_JSON_KEYS).toContain("vehicle_2_glass");
  });
});

describe("Veronica Boyle multi-vehicle coverage", () => {
  const vehicles = [
    {
      id: "v1",
      year: 2018,
      make: "Honda",
      model: "Civic",
      vin: "2HGFC2F59JH123456",
      comprehensiveDeductible: "500",
      collisionDeductible: "500",
    },
    {
      id: "v2",
      year: 2016,
      make: "Honda",
      model: "CR-V",
      vin: "2HKRM4H75GH123456",
      comprehensiveDeductible: "None",
      collisionDeductible: "None",
    },
  ] as Vehicle[];

  it("gives each vehicle its own block and does not flatten vehicle 2 into dash rows", () => {
    const html = renderToStaticMarkup(
      createElement(PolicyCoverageTab, {
        policy: {
          id: "p1",
          coverageA: null,
          coverageLimits: {
            liability_bi: "$100,000/$300,000",
            liability_pd: "$100,000",
            pip: "$10,000",
            um_uim: "$100,000/$300,000",
            um_stacked: "Non-stacked",
            rental: "$30/$900",
            rental_premium: "$12",
            towing: "$100",
            glass: "50",
            vehicle_2_rental: "$40/$1,200",
            vehicle_2_towing: "None",
            vehicle_2_glass: "None",
            vehicle_2_comprehensive: "None",
            vehicle_2_collision: "None",
          },
          faceAmount: null,
          lineOfBusiness: "AUTO",
          formType: null,
          policyType: null,
        },
        terms: [],
        currentTerm: {
          id: "t1",
          role: "current",
          premium: "2109",
          aopDeductible: null,
          hurricaneDeductible: null,
          comprehensiveDeductible: "500",
          collisionDeductible: "500",
          coverages: null,
          termEffective: new Date("2026-09-21"),
          termExpiration: new Date("2027-03-21"),
          source: "manual",
        },
        vehicles,
      }),
    );
    expect(html).toContain("Vehicle: 2018 Honda Civic — VIN 2HGFC2F59JH123456");
    expect(html).toContain("Vehicle: 2016 Honda CR-V — VIN 2HKRM4H75GH123456");
    expect(html).not.toContain("Vehicle 2 comprehensive");
    expect(html).not.toContain("Vehicle 2 collision");
    const vehicleTwo = html.split('data-ff-coverage-vehicle="v2"')[1]?.split("data-ff-auto-coverage-extras")[0] ?? "";
    expect(vehicleTwo).toContain("None");
    expect(vehicleTwo).not.toContain(">—<");
    expect(vehicleTwo).toContain("$40/$1,200");
    expect(vehicleTwo).not.toContain("$30/$900");
    const vehicleOne = html.split('data-ff-coverage-vehicle="v1"')[1]?.split('data-ff-coverage-vehicle="v2"')[0] ?? "";
    expect(vehicleOne).toContain("$30/$900");
    expect(vehicleOne).toContain("✓");
    expect(vehicleOne).toContain("$500");
    expect(html).toContain("Bodily injury");
  });
});
