import { describe, expect, it } from "vitest";
import { inferLineFamily, previewCommission } from "./commission-line";

describe("Zoho commission math", () => {
  it("Life: TAC = GWP × Commission4; initial 9/12; deferred 3/12; monthly 0", () => {
    const row = previewCommission({ family: "life", gwp: 1200, commission4: 80 });
    expect(row.totalAnnualCommission).toBe(960);
    expect(row.initialCommission).toBe(720);
    expect(row.deferredCommission).toBe(240);
    expect(row.monthlyCommission).toBe(0);
    expect(row.commission4).toBe(80);
  });

  it("P&C: TAC = GWP × Commission4; monthly = TAC/12 when frequency monthly", () => {
    const annual = previewCommission({ family: "pc", gwp: 2000, commission4: 10, frequency: "annual" });
    expect(annual.totalAnnualCommission).toBe(200);
    expect(annual.monthlyCommission).toBe(0);
    expect(annual.initialCommission).toBe(0);
    const monthly = previewCommission({ family: "pc", gwp: 2000, commission4: 10, frequency: "monthly" });
    expect(monthly.monthlyCommission).toBe(16.67);
  });

  it("Marketplace: GWP is per-person monthly; Commission4 null", () => {
    const row = previewCommission({ family: "health_marketplace", gwp: 25, insuredCount: 2 });
    expect(row.monthlyCommission).toBe(50);
    expect(row.totalAnnualCommission).toBe(600);
    expect(row.commission4).toBeNull();
  });

  it("Medicare Advantage: TAC = GWP; monthly 0; no new/renewal field", () => {
    const row = previewCommission({ family: "medicare_advantage", gwp: 321 });
    expect(row.totalAnnualCommission).toBe(321);
    expect(row.monthlyCommission).toBe(0);
    expect(row.commission4).toBeNull();
    expect(row.detail).toMatch(/no New vs Renewal field/);
  });

  it("Other health: Monthly = GWP × %; TAC = monthly × 12", () => {
    const row = previewCommission({ family: "other_health", gwp: 100, commission4: 25 });
    expect(row.monthlyCommission).toBe(25);
    expect(row.totalAnnualCommission).toBe(300);
  });

  it("infers marketplace and MA from subtype, not a stored Medicare new/renewal flag", () => {
    expect(inferLineFamily("HEALTH", null, "Marketplace")).toBe("health_marketplace");
    expect(inferLineFamily("HEALTH", null, "Medicare Advantage")).toBe("medicare_advantage");
    expect(inferLineFamily("LIFE")).toBe("life");
    expect(inferLineFamily("HO")).toBe("pc");
  });
});
