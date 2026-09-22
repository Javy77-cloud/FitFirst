import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, replace: () => undefined, push: () => undefined }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/deals/deal-1",
}));

import { MasterSheetCompare } from "@/components/deal/master-sheet-compare";
import type { QuoteSheetFieldValue, RiskSnapshot } from "@/lib/domain";
import { sheetProductForQuotingForm } from "@/lib/deals/deal-line";
import { coerceQuotingFormId } from "@/lib/quoting/forms";
import { snapshotFromRisk } from "@/lib/appetite/gate/snapshot";
import { buildSuperCopyPacket } from "./super-copy";
import { applyExtractedToSheet } from "./apply";
import { emptySheetValues, fieldsForLine, groupFields } from "./catalog";
import { riskFromQuoteSheet } from "./risk-from-sheet";
import {
  COST_SECTION,
  CURRENT_POLICY_SECTION,
  FOUR_POINT_FIELD_KEYS,
  FOUR_POINT_INSPECTION_KEY,
  FOUR_POINT_INSPECTION_LABEL,
  FOUR_POINT_SECTION,
  RESIDENTIAL_HOME_FORM_CODES,
  WIND_MIT_FIELD_KEYS,
  WIND_MIT_INSPECTION_KEY,
  WIND_MIT_INSPECTION_LABEL,
  WIND_MIT_SECTION,
  agentHomeSectionTitle,
  canonicalHomeForm,
  carrierTransferValues,
  inspectionExistenceFromDocType,
  inspectionInHand,
  inspectionSectionDefaultOpen,
  isResidentialHomeForm,
} from "./home-inspections";

const cell = (value: string): QuoteSheetFieldValue => ({
  value,
  status: "confirmed",
  source: "agent",
});

const risk: RiskSnapshot = {
  yearBuilt: 1990,
  roofYear: 2001,
  roofCovering: "shingle",
  construction: "frame",
  openingProtection: "none",
  occupancy: "owner",
  stories: 1,
  pool: false,
  protectionClass: "3",
  milesToCoast: 5,
  city: "Naples",
  county: "Collier",
  coverageA: 300000,
  mobileHome: false,
  replacementCostEstimate: null,
  state: "FL",
};

function sectionOpen(html: string, title: string): string {
  const marker = `data-ff-sheet-group="${title}"`;
  const at = html.indexOf(marker);
  if (at < 0) return "";
  const chunk = html.slice(Math.max(0, at - 80), at + marker.length + 80);
  return chunk.match(/data-ff-section-open="(true|false)"/)?.[1] ?? "";
}

describe("Home inspection sections", () => {
  it("recognizes every residential Home form alias and leaves other lines alone", () => {
    const aliases = [
      ...RESIDENTIAL_HOME_FORM_CODES,
      "Home",
      "Homeowners",
      "Renters",
      "Landlord",
      "condo",
      "HO6 (Condo)",
      "MH",
      "MMHO",
      "Mobile Home",
      "Manufactured Home",
      "Mobile/Manufactured",
      "Mobile Home Dwelling",
    ];
    for (const alias of aliases) {
      expect(isResidentialHomeForm(alias), alias).toBe(true);
    }
    expect(canonicalHomeForm("MMHO")).toBe("MHO");
    expect(canonicalHomeForm("condo")).toBe("HO6");
    expect(canonicalHomeForm("HO4")).toBe("HO4");
    expect(canonicalHomeForm("DP1")).toBe("DP1");
    expect(canonicalHomeForm("DP3")).toBe("DP3");
    expect(sheetProductForQuotingForm("MMHO")).toBe("homeowners");
    expect(sheetProductForQuotingForm("HO6")).toBe("homeowners");
    expect(sheetProductForQuotingForm("HO4")).toBe("renters");
    expect(sheetProductForQuotingForm("DP1")).toBe("landlord");
    expect(coerceQuotingFormId("MMHO")).toBe("MHO");
    for (const other of ["PA", "Auto", "Term Life", "Medicare", "FLOOD", "GL", "BOP"]) {
      expect(isResidentialHomeForm(other), other).toBe(false);
    }
  });

  it("puts inspection sections on HO, DP, condo, manufactured, and HO4 renters", () => {
    for (const product of ["homeowners", "landlord", "renters"] as const) {
      const keys = new Set(fieldsForLine("home", product).map((field) => field.key));
      expect(keys.has("roof_year"), product).toBe(true);
      expect(keys.has("wind_mit_form"), product).toBe(true);
      expect(keys.has("four_point_date"), product).toBe(true);
      expect(keys.has("electrical_circuit_amps"), product).toBe(true);
      expect(keys.has("roof_year") && fieldsForLine("home", product).find((f) => f.key === "roof_year")?.key).toBe(
        "roof_year",
      );
    }
    expect(fieldsForLine("auto").some((field) => field.key === "wind_mit_form")).toBe(false);
    expect(fieldsForLine("life").some((field) => field.key === "four_point_date")).toBe(false);
    expect(fieldsForLine("health").some((field) => field.key === "roof_year")).toBe(false);
  });

  it("renames Roof Wind and orders Cost, Wind Mitigation, and Four-Point Inspection", () => {
    expect(agentHomeSectionTitle("Roof / wind")).toBe(WIND_MIT_SECTION);
    expect(agentHomeSectionTitle("Roof Wind")).toBe(WIND_MIT_SECTION);
    expect(agentHomeSectionTitle("4-point")).toBe(FOUR_POINT_SECTION);
    expect(agentHomeSectionTitle("Current policy")).toBe(CURRENT_POLICY_SECTION);
    expect(agentHomeSectionTitle("Costs")).toBe(COST_SECTION);

    const home = fieldsForLine("home", "homeowners");
    expect(home.find((field) => field.key === "roof_year")?.group).toBe(WIND_MIT_SECTION);
    expect(home.find((field) => field.key === "four_point_date")?.group).toBe(FOUR_POINT_SECTION);
    expect(home.find((field) => field.key === "replacement_cost_estimate")?.group).toBe(COST_SECTION);
    expect(home.find((field) => field.key === "roof_year")?.key).toBe("roof_year");
    expect(home.find((field) => field.key === "wind_mit_form")?.key).toBe("wind_mit_form");

    const titles = groupFields("home", "homeowners").map((group) => group.group);
    const locked = [
      "Property",
      "Protection",
      COST_SECTION,
      WIND_MIT_SECTION,
      FOUR_POINT_SECTION,
      "Hazards",
      "Coverages",
      CURRENT_POLICY_SECTION,
    ];
    const lockedIndexes = locked.map((title) => titles.indexOf(title));
    for (let i = 0; i < lockedIndexes.length; i += 1) {
      expect(lockedIndexes[i], locked[i]).toBeGreaterThanOrEqual(0);
      if (i > 0) expect(lockedIndexes[i]! - lockedIndexes[i - 1]!).toBe(1);
    }
    const dwelling = titles.indexOf("Dwelling");
    const coastal = titles.indexOf("Coastal / flood");
    expect(dwelling).toBe(lockedIndexes[lockedIndexes.length - 1]! + 1);
    expect(coastal).toBe(dwelling + 1);
    expect(groupFields("auto").some((group) => group.group === WIND_MIT_SECTION)).toBe(false);
    expect(groupFields("life").some((group) => group.group === FOUR_POINT_SECTION)).toBe(false);
  });

  it("omits inspection fields from carrier transfer until the checkbox is on, without deleting stored values", () => {
    const stored: Record<string, QuoteSheetFieldValue> = {
      coverage_a: cell("400000"),
      year_built: cell("1998"),
      roof_year: cell("2018"),
      wind_mit_form: cell("OIR-B1-1802"),
      opening_protection: cell("impact"),
      four_point_date: cell("2024-01-02"),
      electrical_circuit_amps: cell("200"),
      plumbing_year: cell("2010"),
    };
    expect(inspectionInHand(stored, "wind")).toBe(false);
    expect(inspectionInHand({ [WIND_MIT_INSPECTION_KEY]: cell("") }, "wind")).toBe(false);
    expect(inspectionInHand({ [WIND_MIT_INSPECTION_KEY]: cell("no") }, "wind")).toBe(false);
    expect(inspectionInHand(undefined, "four")).toBe(false);

    const omitted = carrierTransferValues(stored);
    expect(omitted.coverage_a?.value).toBe("400000");
    expect(omitted.year_built?.value).toBe("1998");
    for (const key of [...WIND_MIT_FIELD_KEYS, ...FOUR_POINT_FIELD_KEYS]) {
      expect(omitted[key], key).toBeUndefined();
    }
    expect(stored.roof_year.value).toBe("2018");
    expect(stored.four_point_date.value).toBe("2024-01-02");
    expect(stored.electrical_circuit_amps.value).toBe("200");

    const inHand = {
      ...stored,
      [WIND_MIT_INSPECTION_KEY]: cell("yes"),
      [FOUR_POINT_INSPECTION_KEY]: cell("yes"),
    };
    const included = carrierTransferValues(inHand);
    expect(included.roof_year?.value).toBe("2018");
    expect(included.wind_mit_form?.value).toBe("OIR-B1-1802");
    expect(included.opening_protection?.value).toBe("impact");
    expect(included.four_point_date?.value).toBe("2024-01-02");
    expect(included.electrical_circuit_amps?.value).toBe("200");
    expect(included.plumbing_year?.value).toBe("2010");
    expect(included[WIND_MIT_INSPECTION_KEY]).toBeUndefined();
    expect(inHand.roof_year.value).toBe("2018");

    const ratedOff = riskFromQuoteSheet(risk, stored);
    expect(ratedOff.roofYear).toBe(2001);
    expect(ratedOff.roofCovering).toBe("shingle");
    expect(ratedOff.openingProtection).toBe("none");
    expect(ratedOff.yearBuilt).toBe(1998);
    const ratedOn = riskFromQuoteSheet(risk, inHand);
    expect(ratedOn.roofYear).toBe(2018);
    expect(ratedOn.openingProtection).toBe("impact");

    const snapOff = snapshotFromRisk({ risk, sheetValues: stored, asOfYear: 2026 });
    expect(snapOff.roofAgeYears).toBe(2026 - 2001);
    expect(snapOff.roofCertified).toBeNull();
    const snapOn = snapshotFromRisk({ risk, sheetValues: inHand, asOfYear: 2026 });
    expect(snapOn.roofAgeYears).toBe(2026 - 2018);
    expect(snapOn.roofCertified).toBe(true);

    const packetOff = buildSuperCopyPacket({
      line: "home",
      dealId: "deal-1",
      dealTitle: "HO3",
      values: stored,
    });
    expect(packetOff.filled.roof_year).toBeUndefined();
    expect(packetOff.filled.four_point_date).toBeUndefined();
    expect(packetOff.filled.coverage_a).toBe("400000");
    expect(packetOff.fields.some((field) => field.key === "roof_year")).toBe(false);
    const packetOn = buildSuperCopyPacket({
      line: "home",
      dealId: "deal-1",
      dealTitle: "HO3",
      values: inHand,
    });
    expect(packetOn.filled.roof_year).toBe("2018");
    expect(packetOn.filled.four_point_date).toBe("2024-01-02");
    expect(packetOn.fields.find((field) => field.key === "roof_year")?.group).toBe(WIND_MIT_SECTION);
  });

  it("lets Gemini set inspection existence only for a classified wind-mit or four-point", () => {
    expect(inspectionExistenceFromDocType("wind_mit")).toEqual({ windMit: true, fourPoint: false });
    expect(inspectionExistenceFromDocType("four_point")).toEqual({ windMit: false, fourPoint: true });
    expect(inspectionExistenceFromDocType("dec")).toEqual({ windMit: false, fourPoint: false });
    expect(inspectionExistenceFromDocType("liability")).toEqual({ windMit: false, fourPoint: false });
    expect(inspectionExistenceFromDocType("gl")).toEqual({ windMit: false, fourPoint: false });
    expect(inspectionExistenceFromDocType("inspection")).toEqual({ windMit: false, fourPoint: false });
    expect(inspectionExistenceFromDocType("photo")).toEqual({ windMit: false, fourPoint: false });

    const blank = emptySheetValues("home", "homeowners");
    const fromDec = applyExtractedToSheet(
      "home",
      blank,
      [{ fieldKey: "roof_year", normalizedValue: "2016" }],
      { docType: "dec" },
    );
    expect(fromDec.values.roof_year?.value).toBe("2016");
    expect(fromDec.values[WIND_MIT_INSPECTION_KEY]).toBeUndefined();
    expect(inspectionInHand(fromDec.values, "wind")).toBe(false);

    const fromLiability = applyExtractedToSheet(
      "home",
      blank,
      [{ fieldKey: "wind_mit_form", normalizedValue: "OIR-B1-1802" }],
      { docType: "liability" },
    );
    expect(fromLiability.values[WIND_MIT_INSPECTION_KEY]).toBeUndefined();

    const fromWind = applyExtractedToSheet(
      "home",
      blank,
      [{ fieldKey: "roof_year", normalizedValue: "2016" }],
      { docType: "wind_mit" },
    );
    expect(fromWind.values[WIND_MIT_INSPECTION_KEY]?.value).toBe("yes");
    expect(fromWind.values[FOUR_POINT_INSPECTION_KEY]).toBeUndefined();
    expect(carrierTransferValues(fromWind.values).roof_year?.value).toBe("2016");

    const fromFour = applyExtractedToSheet(
      "home",
      blank,
      [{ fieldKey: "four_point_date", normalizedValue: "2024-03-01" }],
      { docType: "four_point" },
    );
    expect(fromFour.values[FOUR_POINT_INSPECTION_KEY]?.value).toBe("yes");
    expect(fromFour.values[WIND_MIT_INSPECTION_KEY]).toBeUndefined();

    const life = applyExtractedToSheet("life", emptySheetValues("life"), [], { docType: "wind_mit" });
    expect(life.values[WIND_MIT_INSPECTION_KEY]).toBeUndefined();
    const auto = applyExtractedToSheet("auto", emptySheetValues("auto"), [], { docType: "four_point" });
    expect(auto.values[FOUR_POINT_INSPECTION_KEY]).toBeUndefined();
  });

  it("collapses inspection sections on every Home form until the checkbox is on", () => {
    expect(inspectionSectionDefaultOpen(WIND_MIT_SECTION, {})).toBe(false);
    expect(inspectionSectionDefaultOpen(FOUR_POINT_SECTION, {})).toBe(false);
    expect(inspectionSectionDefaultOpen("Property", {})).toBe(true);
    expect(
      inspectionSectionDefaultOpen(WIND_MIT_SECTION, { [WIND_MIT_INSPECTION_KEY]: cell("yes") }),
    ).toBe(true);

    for (const product of ["homeowners", "landlord", "renters"] as const) {
      const html = renderToString(
        createElement(MasterSheetCompare, {
          dealId: `deal-${product}`,
          line: "home",
          fields: [],
          values: emptySheetValues("home", product),
          product,
        }),
      );
      expect(html, product).toContain(WIND_MIT_INSPECTION_LABEL);
      expect(html, product).toContain(FOUR_POINT_INSPECTION_LABEL);
      expect(html, product).toContain('data-ff-inspection-ribbon=""');
      expect(sectionOpen(html, WIND_MIT_SECTION), product).toBe("false");
      expect(sectionOpen(html, FOUR_POINT_SECTION), product).toBe("false");
      expect(sectionOpen(html, "Property"), product).toBe("true");
      expect(sectionOpen(html, "Protection"), product).toBe("true");
      expect(sectionOpen(html, "Hazards"), product).toBe("true");
      expect(html, product).toContain(`data-ff-section-toggle="${WIND_MIT_SECTION}"`);
      expect(html, product).toContain('data-ff-section-toggle="Property"');
      expect(html, product).toContain("ff-sheet-group-title");
      expect(html.indexOf(WIND_MIT_SECTION)).toBeLessThan(html.indexOf(FOUR_POINT_SECTION));
    }

    const openWind = renderToString(
      createElement(MasterSheetCompare, {
        dealId: "deal-open",
        line: "home",
        fields: [],
        values: {
          ...emptySheetValues("home", "homeowners"),
          [WIND_MIT_INSPECTION_KEY]: cell("yes"),
        },
        product: "homeowners",
      }),
    );
    expect(sectionOpen(openWind, WIND_MIT_SECTION)).toBe("true");
    expect(sectionOpen(openWind, FOUR_POINT_SECTION)).toBe("false");

    for (const [line, product] of [
      ["auto", "auto"],
      ["life", "life"],
      ["health", "health"],
    ] as const) {
      const html = renderToString(
        createElement(MasterSheetCompare, {
          dealId: `deal-${line}`,
          line,
          fields: [],
          values: emptySheetValues(line, product),
          product,
        }),
      );
      expect(html, line).not.toContain(WIND_MIT_INSPECTION_LABEL);
      expect(html, line).not.toContain("data-ff-inspection-ribbon");
      expect(html, line).not.toContain("data-ff-section-toggle");
    }
  });
});
