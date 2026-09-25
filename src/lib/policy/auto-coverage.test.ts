import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VehiclesList } from "@/components/desk-ams-panels";
import { LobOverviewSections } from "@/components/policy/lob-overview-sections";
import type { Vehicle } from "@/lib/db/schema";
import { autoCoverageExtras, autoCoverageSchedule } from "./auto-coverage";

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
    expect(comp).toMatchObject({ deductible: "500", premium: "—" });
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
  it("uses one policy line and does not render the line template", () => {
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
            premium: "$640",
            comprehensiveDeductible: "500",
            collisionDeductible: "500",
            garagingZip: "32901",
          } as Vehicle,
        ],
      }),
    );
    expect(html).toContain("Vehicles in this policy (1)");
    expect(html).not.toContain("Vehicles on this Auto");
    expect(html).not.toContain("Line template");
    expect(html).not.toContain("auto policy");
    expect(html).toContain("Personal");
    expect(html).toContain("12,000 – 14,999");
    expect(html).toContain("Honda Financial");
    expect(html).toContain("$640");
  });
});
