import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { MintGeminiRow } from "@/lib/policy/mint-gate";
import { sheetKeysForGeminiKey } from "@/lib/extraction/gemini/map";
import { autoCoverageExtras, autoCoverageSchedule } from "@/lib/policy/auto-coverage";
import {
  buildPolicyFillAuditInsert,
  classifyFillFields,
  countFillOverwrites,
  fillOverwriteWarning,
  formatDecDeductible,
  groupAppliedFill,
  manualFillReasonError,
  parseDecTermDate,
  pickPolicyDecDocument,
  proposeFillFromDec,
  snapshotFillTargets,
} from "@/lib/policy/fill-from-dec";

function source(file: string) {
  return readFileSync(file, "utf8");
}

function rows(entries: Record<string, string>): MintGeminiRow[] {
  return Object.entries(entries).map(([fieldKey, normalizedValue]) => ({
    fieldKey,
    normalizedValue,
    rawValue: normalizedValue,
    confidence: 0.95,
    flagged: false,
  }));
}

const gloria = rows({
  property_address: "8944 ADRIATICO LN KISSIMMEE, FL 34747 OSCEOLA COUNTY",
  mailing_address: "10358 NW 30 TER Doral, FL 33172",
  construction: "Masonry",
  year_built: "2017",
  dwelling_type: "Y",
  number_of_families: "1",
  occupancy: "Y",
  protection_class: "3",
  bceg_grade: "4",
  county: "OSCEOLA",
  dwelling_replacement_cost: "Y",
  personal_property_replacement_cost: "N",
  burglar_alarm: "Y",
  fire_alarm: "Y",
  sprinkler: "N",
  mortgagee: "WELLS FARGO BANK, NA",
  loan_number: "0509210662",
  form: "HO3",
  coverage_a: "433613",
  coverage_b: "43368",
  coverage_c: "108404",
  coverage_d: "86723",
  coverage_e: "300000",
  coverage_f: "1000",
  aop_deductible: "$2,500",
  hurricane_deductible: "2.0% of Coverage A - $8,672",
  ordinance_or_law: "25%",
  premium: "6567.76",
  effective_date: "06/28/2026",
  expiration_date: "06/28/2027",
});

describe("fillPolicyFromDec field map", () => {
  it("maps a stick-built HO3 dec onto overview and coverage fields", () => {
    const proposed = proposeFillFromDec({ family: "homeowners", rows: gloria });
    expect(proposed.premisesAddress).toMatch(/ADRIATICO/i);
    expect(proposed.premisesCity).toMatch(/KISSIMMEE/i);
    expect(proposed.premisesState).toBe("FL");
    expect(proposed.premisesZip).toBe("34747");
    expect(proposed.mailingAddress).toMatch(/10358 NW 30 TER/i);
    expect(proposed.mailingCity).toMatch(/Doral/i);
    expect(proposed.yearBuilt).toBe("2017");
    expect(proposed.construction).toBe("Masonry");
    expect(proposed.dwellingType).toBe("Townhouse/Rowhouse");
    expect(proposed.families).toBe("1");
    expect(proposed.occupancy).toBe("Yes");
    expect(proposed.protectionClass).toBe("3");
    expect(proposed.bceg).toBe("4");
    expect(proposed.county).toBe("OSCEOLA");
    expect(proposed.dwellingReplacementCost).toBe("Yes");
    expect(proposed.personalPropertyReplacementCost).toBe("No");
    expect(proposed.burglarAlarm).toBe("Yes");
    expect(proposed.fireAlarm).toBe("Yes");
    expect(proposed.sprinkler).toBe("No");
    expect(proposed.mortgageeName).toMatch(/WELLS FARGO/i);
    expect(proposed.mortgageeLoanNumber).toBe("0509210662");
    expect(proposed.formType).toBe("HO3");
    expect(proposed.coverageA).toBe("433613");
    expect(proposed.coverageB).toBe("$43,368");
    expect(proposed.coverageE).toBe("$300,000");
    expect(proposed.aopDeductible).toBe("2500");
    expect(proposed.hurricaneDeductible).toBe("2% ($8,672)");
    expect(proposed.ordinanceOrLaw).toBe("25%");
    expect(proposed.premium).toBe("6567.76");
    expect(proposed.effectiveDate).toBe("2026-06-28");
    expect(proposed.expirationDate).toBe("2027-06-28");
    expect(proposed.termMonths).toBe("12");
    expect(formatDecDeductible("2.0% of Coverage A - $8,672")).toBe("2% ($8,672)");
    expect(parseDecTermDate("Sept 29, 2026")).toBe("2026-09-29");
    expect(sheetKeysForGeminiKey("effective_date")).toContain("effective_date");
    expect(sheetKeysForGeminiKey("expiration_date")).toContain("expiration_date");
    expect(sheetKeysForGeminiKey("term_length")).toContain("term_months");
  });

  it("maps mobile-home unit, roof, and scheduled structures when printed", () => {
    const proposed = proposeFillFromDec({
      family: "homeowners",
      rows: rows({
        year_built: "2006",
        unit_year: "2006",
        unit_make: "General MFG",
        unit_serial: "GMHGA40533527a/b",
        unit_length: "52",
        unit_width: "24",
        roof_material: "Composition Shingle",
        date_of_roof_installation: "2024",
        scheduled_carport: "9000",
        scheduled_screen_room: "10000",
        scheduled_shed: "2000",
        coverage_a: "130000",
      }),
    });
    expect(proposed.yearBuilt).toBe("2006");
    expect(proposed.unitYear).toBe("2006");
    expect(proposed.unitMake).toBe("General MFG");
    expect(proposed.unitSerial).toBe("GMHGA40533527a/b");
    expect(proposed.roofCovering).toBe("Composition Shingle");
    expect(proposed.roofYear).toBe("2024");
    expect(proposed.scheduledCarport).toBe("$9,000");
    expect(proposed.scheduledScreenRoom).toBe("$10,000");
    expect(proposed.scheduledShed).toBe("$2,000");
  });

  it("maps an auto dec onto vehicles, drivers, and coverage", () => {
    const proposed = proposeFillFromDec({
      family: "auto",
      rows: rows({
        vin: "4T1BF1FK5FU485898",
        vehicle_year: "2015",
        vehicle_make: "Toyota",
        vehicle_model: "Camry",
        liability_bi: "10000/20000",
        liability_pd: "10000",
        um_uim: "Insured Rejects",
        pip: "$1,000 Ded/Insd&Rel",
        comp_deductible: "$500 Ded",
        collision_deductible: "500",
        ers: "ERS FULL",
        rental: "$50 Per Day",
        driver_1_name: "Andres Felipe Laguna Gaviria",
        driver_1_license: "D123-456-78-9012",
        driver_2_name: "Claudia Patricia Gaviria",
        premium: "2074",
        effective_date: "09/21/2026",
        expiration_date: "03/21/2027",
        term_length: "6 month",
      }),
    });
    expect(proposed["vehicle:vin:4T1BF1FK5FU485898.vin"]).toBe("4T1BF1FK5FU485898");
    expect(proposed["vehicle:vin:4T1BF1FK5FU485898.year"]).toBe("2015");
    expect(proposed["vehicle:vin:4T1BF1FK5FU485898.make"]).toBe("Toyota");
    expect(proposed["vehicle:vin:4T1BF1FK5FU485898.model"]).toBe("Camry");
    expect(proposed.liabilityBi).toBe("$10,000/$20,000");
    expect(proposed.liabilityPd).toBe("$10,000");
    expect(proposed.umUim).toBe("Insured Rejects");
    expect(proposed.comprehensiveDeductible).toBe("500");
    expect(proposed.collisionDeductible).toBe("500");
    expect(proposed.towing).toBe("ERS FULL");
    expect(proposed["driver:andres felipe laguna gaviria.name"]).toMatch(/Andres Felipe/);
    expect(proposed["driver:claudia patricia gaviria.name"]).toMatch(/Claudia/);
    expect(proposed.coverageA).toBeUndefined();
    expect(proposed.effectiveDate).toBe("2026-09-21");
    expect(proposed.expirationDate).toBe("2027-03-21");
    expect(proposed.termMonths).toBe("6");
    expect(proposed.pipDeductible).toBe("1000");
  });

  it("maps PAP deductibles, line premiums, vehicle use, and per-car facts", () => {
    const proposed = proposeFillFromDec({
      family: "auto",
      rows: rows({
        vin: "4T1BF1FK5FU485898",
        vehicle_year: "2015",
        vehicle_make: "Toyota",
        vehicle_model: "Camry",
        vehicle_usage: "Pleasure",
        annual_miles: "12000",
        vehicle_lienholder_other: "Toyota Financial",
        vehicle_1_premium: "900.00",
        vehicle_2_vin: "2HKRM4H75GH123456",
        vehicle_2_year: "2016",
        vehicle_2_make: "Honda",
        vehicle_2_model: "CR-V",
        vehicle_2_usage: "Commute",
        fill_gap_vehicle_2_comp_deductible: "1000",
        fill_gap_vehicle_2_premium: "700",
        liability_bi: "100/300",
        liability_bi_premium: "412",
        liability_pd: "100000",
        liability_pd_premium: "188",
        pip: "10000",
        pip_deductible: "1000",
        pip_premium: "220",
        um_uim: "100/300 Non-stacked",
        med_pay: "5000",
        fill_gap_rental: "30/day",
        comp_deductible: "500",
        comp_premium: "140",
        collision_deductible: "500",
        collision_premium: "310",
        discounts: "Multi-car; Paperless",
        driver_1_name: "Veronica Boyle",
        driver_1_license_state: "FL",
      }),
    });
    expect(proposed["vehicle:vin:4T1BF1FK5FU485898.usage"]).toBe("Pleasure");
    expect(proposed["vehicle:vin:4T1BF1FK5FU485898.annualMiles"]).toBe("12000");
    expect(proposed["vehicle:vin:4T1BF1FK5FU485898.lienholder"]).toBe("Toyota Financial");
    expect(proposed["vehicle:vin:4T1BF1FK5FU485898.premium"]).toBe("$900");
    expect(proposed["vehicle:vin:4T1BF1FK5FU485898.comprehensiveDeductible"]).toBe("500");
    expect(proposed["vehicle:vin:2HKRM4H75GH123456.usage"]).toBe("Commute");
    expect(proposed["vehicle:vin:2HKRM4H75GH123456.comprehensiveDeductible"]).toBe("1000");
    expect(proposed["vehicle:vin:2HKRM4H75GH123456.premium"]).toBe("$700");
    expect(proposed.liabilityBiPremium).toBe("$412");
    expect(proposed.liabilityPdPremium).toBe("$188");
    expect(proposed.pipDeductible).toBe("1000");
    expect(proposed.pipPremium).toBe("$220");
    expect(proposed.umStacked).toBe("Non-stacked");
    expect(proposed.medPay).toBe("$5,000");
    expect(proposed.rental).toBe("30/day");
    expect(proposed.compPremium).toBe("$140");
    expect(proposed.collisionPremium).toBe("$310");
    expect(proposed.discounts).toBe("Multi-car; Paperless");
    expect(proposed["driver:veronica boyle.licenseState"]).toBe("FL");

    const patch = groupAppliedFill(proposed, Object.keys(proposed));
    expect(patch.coverageLimits.liability_bi_premium).toBe("$412");
    expect(patch.coverageLimits.pip_deductible).toBe("1000");
    expect(patch.coverageLimits.comp_premium).toBe("$140");
    expect(patch.coverageLimits.discounts).toBe("Multi-car; Paperless");
    expect(patch.coverageLimits.um_stacked).toBe("Non-stacked");
    expect(patch.term.comprehensiveDeductible).toBe("500");
    expect(patch.term.collisionDeductible).toBe("500");
    const camry = patch.vehicles.find((row) => row.vin === "4T1BF1FK5FU485898");
    expect(camry?.usage).toBe("Pleasure");
    expect(camry?.annualMiles).toBe("12000");
    expect(camry?.lienholder).toBe("Toyota Financial");
    expect(camry?.write).toEqual(expect.arrayContaining(["usage", "annualMiles", "lienholder", "premium"]));
    expect(patch.drivers[0]?.licenseState).toBe("FL");
  });

  it("writes every PAP coverage cell that the dec printed and leaves the rest empty", () => {
    const proposed = proposeFillFromDec({
      family: "auto",
      rows: rows({
        liability_bi: "100/300",
        liability_bi_premium: "412",
        liability_pd: "100000",
        liability_pd_premium: "188",
        pip: "10000",
        pip_deductible: "1000",
        pip_premium: "220",
        med_pay: "5000",
        med_pay_premium: "18",
        um_uim: "100/300",
        um_uim_premium: "64",
        um_pd: "100000",
        um_pd_premium: "22",
        um_stacked: "No",
        comp_deductible: "500",
        comp_premium: "90",
        collision_deductible: "500",
        collision_premium: "310",
        rental: "30/900",
        rental_premium: "12",
        towing: "100",
        towing_premium: "6",
        glass: "50",
        glass_premium: "4",
        discounts: "Multi-car",
      }),
    });
    expect(proposed.umStacked).toBe("Non-stacked");
    const patch = groupAppliedFill(proposed, Object.keys(proposed));
    const schedule = autoCoverageSchedule({
      coverageLimits: patch.coverageLimits,
      comprehensiveDeductible: patch.term.comprehensiveDeductible,
      collisionDeductible: patch.term.collisionDeductible,
    });
    const byKey = Object.fromEntries(schedule.map((row) => [row.key, row]));
    expect(byKey.liability_bi).toMatchObject({ limit: "$100/$300", premium: "$412" });
    expect(byKey.liability_pd).toMatchObject({ limit: "$100,000", premium: "$188" });
    expect(byKey.pip).toMatchObject({ limit: "$10,000", deductible: "1000", premium: "$220" });
    expect(byKey.med_pay).toMatchObject({ limit: "$5,000", premium: "$18" });
    expect(byKey.um_uim).toMatchObject({ limit: "$100/$300", premium: "$64" });
    expect(byKey.um_pd).toMatchObject({ limit: "$100,000", premium: "$22" });
    expect(byKey.comprehensive).toMatchObject({ deductible: "500", premium: "$90" });
    expect(byKey.collision).toMatchObject({ deductible: "500", premium: "$310" });
    expect(byKey.rental).toMatchObject({ limit: "$30/$900", premium: "$12" });
    expect(byKey.towing).toMatchObject({ limit: "$100", premium: "$6" });
    expect(byKey.glass?.deductible).toMatch(/50/);
    expect(byKey.glass?.premium).toMatch(/4/);
    expect(autoCoverageExtras({ coverageLimits: patch.coverageLimits })).toEqual([
      { key: "um_stacked", label: "UM stacked", value: "Non-stacked" },
      { key: "discounts", label: "Discounts", value: "Multi-car" },
    ]);

    const stackedPhrase = proposeFillFromDec({
      family: "auto",
      rows: rows({ um_stacked: "Stacked: No", um_uim: "100/300" }),
    });
    expect(stackedPhrase.umStacked).toBe("Non-stacked");
    const embedded = proposeFillFromDec({
      family: "auto",
      rows: rows({ um_uim: "100/300 Non-stacked" }),
    });
    expect(embedded.umStacked).toBe("Non-stacked");
    const limitOnly = proposeFillFromDec({
      family: "auto",
      rows: rows({ liability_bi: "100/300", um_uim: "100/300" }),
    });
    expect(limitOnly.liabilityBiPremium).toBeUndefined();
    expect(limitOnly.umPd).toBeUndefined();
    expect(limitOnly.umStacked).toBeUndefined();
    expect(limitOnly.glass).toBeUndefined();
    expect(limitOnly.discounts).toBeUndefined();
    expect(limitOnly.pipDeductible).toBeUndefined();
  });
});

describe("fill overwrite count", () => {
  const proposed = proposeFillFromDec({ family: "homeowners", rows: gloria });

  it("counts non-blank fields the DEC would replace", () => {
    const existing = snapshotFillTargets({
      policy: { coverageA: 100000, formType: "HO3" },
      risk: { construction: "Frame", yearBuilt: 2017 },
    });
    const classified = classifyFillFields(existing, proposed);
    expect(classified.overwritten.sort()).toEqual(["construction", "coverageA"]);
    expect(classified.skipped).toEqual(expect.arrayContaining(["formType", "yearBuilt"]));
    expect(classified.filled).toEqual(expect.arrayContaining(["coverageB", "mortgageeName", "county"]));
    expect(countFillOverwrites(classified)).toBe(2);
    expect(fillOverwriteWarning(countFillOverwrites(classified))).toBe("replaces 2 fields");
    expect(fillOverwriteWarning(1)).toBe("replaces 1 field");
  });

  it("counts a non-blank policy term the DEC would replace", () => {
    const existing = snapshotFillTargets({
      policy: {
        effectiveDate: new Date("2025-06-28T12:00:00.000Z"),
        expirationDate: new Date("2026-06-28T12:00:00.000Z"),
        termMonths: 6,
        formType: "HO3",
      },
    });
    const classified = classifyFillFields(existing, proposed);
    expect(classified.overwritten).toEqual(
      expect.arrayContaining(["effectiveDate", "expirationDate", "termMonths"]),
    );
    expect(classified.skipped).toContain("formType");
    const same = snapshotFillTargets({
      policy: {
        effectiveDate: "2026-06-28",
        expirationDate: "2027-06-28T12:00:00.000Z",
        termMonths: 12,
      },
    });
    const unchanged = classifyFillFields(same, proposed);
    expect(unchanged.skipped).toEqual(
      expect.arrayContaining(["effectiveDate", "expirationDate", "termMonths"]),
    );
    expect(unchanged.overwritten).not.toContain("effectiveDate");
    expect(unchanged.overwritten).not.toContain("expirationDate");
    expect(unchanged.overwritten).not.toContain("termMonths");
  });

  it("does not count an identical value as an overwrite", () => {
    const existing = snapshotFillTargets({
      policy: { coverageA: 433613 },
      risk: { construction: "Masonry" },
    });
    const classified = classifyFillFields(existing, proposed);
    expect(classified.overwritten).not.toContain("coverageA");
    expect(classified.overwritten).not.toContain("construction");
    expect(classified.skipped).toEqual(expect.arrayContaining(["coverageA", "construction"]));
  });

  it("treats a matching license last4 as unchanged", () => {
    const auto = proposeFillFromDec({
      family: "auto",
      rows: rows({
        vin: "4T1BF1FK5FU485898",
        vehicle_year: "2015",
        vehicle_make: "Toyota",
        vehicle_model: "Camry",
        driver_1_name: "Andres Felipe Laguna Gaviria",
        driver_1_license: "D123-456-78-9012",
      }),
    });
    const existing = snapshotFillTargets({
      vehicles: [{ vin: "4T1BF1FK5FU485898", year: 2014, make: "Toyota", model: "Camry" }],
      drivers: [
        {
          firstName: "Andres",
          lastName: "Felipe Laguna Gaviria",
          licenseLast4: "9012",
        },
      ],
    });
    const classified = classifyFillFields(existing, auto);
    expect(classified.overwritten).toContain("vehicle:vin:4T1BF1FK5FU485898.year");
    expect(classified.skipped).toContain("driver:andres felipe laguna gaviria.license");
    expect(countFillOverwrites(classified)).toBe(1);
  });
});

describe("policy fill audit insert", () => {
  it("builds an immutable audit row with agent, reason, policy, dec, and field lists", () => {
    const row = buildPolicyFillAuditInsert({
      tenantId: "tenant",
      policyId: "policy",
      policyNumber: "1501-1703-2475",
      source: "manual",
      agentId: "agent-1",
      agentName: "Ada Agent",
      reason: "  mid-term DEC reissue  ",
      documentId: "doc-1",
      documentFilename: "gloria-dec.pdf",
      fieldsWritten: ["yearBuilt", "county"],
      fieldsOverwritten: ["construction"],
    });
    expect(row).toEqual({
      tenantId: "tenant",
      policyId: "policy",
      policyNumber: "1501-1703-2475",
      source: "manual",
      agentId: "agent-1",
      agentName: "Ada Agent",
      reason: "mid-term DEC reissue",
      documentId: "doc-1",
      documentFilename: "gloria-dec.pdf",
      fieldsWritten: ["yearBuilt", "county"],
      fieldsOverwritten: ["construction"],
    });
    expect(row).not.toHaveProperty("updatedAt");
  });

  it("records issue runs without a reason and names a missing agent System", () => {
    const row = buildPolicyFillAuditInsert({
      tenantId: "tenant",
      policyId: "policy",
      policyNumber: "ATM205086",
      source: "issue",
      agentId: null,
      agentName: " ",
      reason: "should not stick",
      documentId: "doc-2",
      documentFilename: "george.pdf",
      fieldsWritten: ["coverageA"],
      fieldsOverwritten: [],
    });
    expect(row.source).toBe("issue");
    expect(row.reason).toBeNull();
    expect(row.agentName).toBe("System");
    expect(row.fieldsWritten).toEqual(["coverageA"]);
  });

  it("requires a non-blank reason only on the manual path", () => {
    expect(manualFillReasonError("manual", "  ")).toBe("Reason is required.");
    expect(manualFillReasonError("manual", "lender corrected the DEC")).toBeNull();
    expect(manualFillReasonError("issue", "")).toBeNull();
  });

  it("groups allowed keys into coverage, mortgagee, and vehicle writes", () => {
    const proposed = proposeFillFromDec({ family: "homeowners", rows: gloria });
    const patch = groupAppliedFill(proposed, ["coverageB", "mortgageeName", "mortgageeLoanNumber", "burglarAlarm"]);
    expect(patch.coverageLimits.coverage_b).toBe("$43,368");
    expect(patch.mortgagee).toEqual({
      name: "WELLS FARGO BANK, NA",
      loanNumber: "0509210662",
    });
    expect(patch.protection.burglar_alarm).toBe("Yes");
    expect(patch.policy.coverageA).toBeUndefined();
    const dates = groupAppliedFill(proposed, ["effectiveDate", "expirationDate", "termMonths"]);
    expect(dates.policy.effectiveDate?.toISOString()).toBe("2026-06-28T12:00:00.000Z");
    expect(dates.policy.expirationDate?.toISOString()).toBe("2027-06-28T12:00:00.000Z");
    expect(dates.policy.termMonths).toBe(12);
    expect(dates.term.termEffective?.toISOString()).toBe("2026-06-28T12:00:00.000Z");
    expect(dates.term.termExpiration?.toISOString()).toBe("2027-06-28T12:00:00.000Z");
  });
});

describe("fillPolicyFromDec wiring", () => {
  it("inserts the audit table and does not write quote sheets", () => {
    const action = source("src/app/actions/policy-fill-from-dec.ts");
    expect(action).toMatch(/export async function fillPolicyFromDec/);
    expect(action).toMatch(/export async function previewFillPolicyFromDec/);
    expect(action).toMatch(/export async function fillPolicyFromDecOnIssue/);
    expect(action.indexOf("manualFillReasonError")).toBeLessThan(action.indexOf("prepareFill"));
    expect(action).toMatch(/insert\(policyFillAudit\)/);
    expect(action).toMatch(/policySet\.effectiveDate = patch\.policy\.effectiveDate/);
    expect(action).toMatch(/policySet\.expirationDate = patch\.policy\.expirationDate/);
    expect(action).toMatch(/policySet\.termMonths = patch\.policy\.termMonths/);
    expect(action).toMatch(/source: input\.source/);
    expect(action).toMatch(/forceExtract: input\.source === "manual"/);
    expect(action).not.toMatch(/quoteSheets|quote_sheets|fillQuoteSheet/);
    const mint = source("src/app/actions/policy-mint.ts");
    expect(mint).toMatch(/fillPolicyFromDecOnIssue/);
    const docs = source("src/components/policy/tabs/documents-tab.tsx");
    expect(docs).toMatch(/FillPolicyFromDecButton/);
    const button = source("src/components/policy/fill-policy-from-dec-button.tsx");
    expect(button).toMatch(/Fill from declaration page/);
    expect(button).toMatch(/fillOverwriteWarning/);
    expect(button).toMatch(/Reason/);
    const migration = source("drizzle/0160_policy_fill_audit.sql");
    expect(migration).toMatch(/policy_fill_audit/);
    expect(migration).toMatch(/fields_written/);
    expect(migration).toMatch(/fields_overwritten/);
    expect(migration).not.toMatch(/"updated_at"/);
  });

  it("picks an explicit declaration, else the newest dec", () => {
    const older = {
      id: "old",
      filename: "prior-dec.pdf",
      docType: "dec",
      mimeType: "application/pdf",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const newer = {
      id: "new",
      filename: "current-dec.pdf",
      docType: "policy_dec",
      mimeType: "application/pdf",
      createdAt: "2026-06-01T00:00:00.000Z",
    };
    expect(pickPolicyDecDocument([older, newer])?.id).toBe("new");
    expect(pickPolicyDecDocument([older, newer], { documentId: "old" })?.id).toBe("old");
    expect(pickPolicyDecDocument([older, newer], { sourceDocumentId: "old" })?.id).toBe("old");
  });
});
