import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEAL_RISK_INSERT_FAILED, requireInsertedRisk, riskTypeForDeal } from "./ensure-risk";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("riskTypeForDeal", () => {
  it("uses auto when line or quoting is Auto", () => {
    expect(riskTypeForDeal({ lineOfBusiness: "AUTO" })).toBe("auto");
    expect(riskTypeForDeal({ quotingLine: "auto" })).toBe("auto");
    expect(riskTypeForDeal({ shopLines: ["auto"] })).toBe("auto");
    expect(riskTypeForDeal({ lineOfBusiness: "auto", quotingLine: "auto" })).toBe("auto");
  });

  it("uses property for Home, Life, Health, and mixed packages", () => {
    expect(riskTypeForDeal({ lineOfBusiness: "HO", quotingLine: "home" })).toBe("property");
    expect(riskTypeForDeal({ lineOfBusiness: "LIFE", quotingLine: "life" })).toBe("property");
    expect(riskTypeForDeal({ lineOfBusiness: "HEALTH", quotingLine: "health" })).toBe("property");
    expect(riskTypeForDeal({ lineOfBusiness: "HO", shopLines: ["home", "auto"] })).toBe("property");
    expect(riskTypeForDeal({})).toBe("property");
  });
});

describe("requireInsertedRisk", () => {
  it("throws instead of returning a missing row", () => {
    expect(requireInsertedRisk({ id: "r1" })).toEqual({ id: "r1" });
    expect(() => requireInsertedRisk(undefined)).toThrow(/could not insert a risk row/);
    expect(DEAL_RISK_INSERT_FAILED).toMatch(/risk row/);
  });
});

describe("create and load paths always attach a risk", () => {
  it("createDeal inserts a risk and fails loudly if that insert is empty", () => {
    const save = source("src/app/actions/crm.ts");
    const createFn = save.slice(
      save.indexOf("export async function createDeal("),
      save.indexOf("export async function createDealFromDecDrop"),
    );
    expect(createFn).toMatch(/\.insert\(risks\)/);
    expect(createFn).toMatch(/requireInsertedRisk/);
    expect(createFn).toMatch(/\.returning\(\)/);

    const convertFn = save.slice(
      save.indexOf("const [deal] = await db"),
      save.indexOf("export async function createDealFromLead"),
    );
    expect(convertFn).toMatch(/\.insert\(risks\)/);
    expect(convertFn).toMatch(/requireInsertedRisk/);

    expect(save).toMatch(/createDealFromDecDrop/);
    const decFn = save.slice(save.indexOf("export async function createDealFromDecDrop"));
    expect(decFn).toMatch(/\.insert\(risks\)/);
    expect(decFn).toMatch(/requireInsertedRisk/);
  });

  it("deal-create copy and contact paths always insert a risk", () => {
    const create = source("src/app/actions/deal-create.ts");
    expect(create).toMatch(/insertRequiredDealRisk|requireInsertedRisk/);
    expect(create).toMatch(/\.insert\(risks\)/);
    const copied = create.slice(
      create.indexOf("async function createCopiedDeal"),
      create.indexOf("export async function createDealFromSourceDeal"),
    );
    expect(copied).toMatch(/requireInsertedRisk|insertRequiredDealRisk/);
    expect(copied).not.toMatch(/if \(risk\) \{[\s\S]*\} else \{[\s\S]*await db\.insert\(risks\)/);
  });

  it("orphan create paths insert a risk after the deal row", () => {
    expect(source("src/app/actions/deals-upload.ts")).toMatch(/insertRequiredDealRisk|ensureDealRisk/);
    expect(source("src/app/actions/list-selection.ts")).toMatch(/insertRequiredDealRisk|ensureDealRisk/);
    expect(source("src/app/actions/pipeline-admin.ts")).toMatch(/insertRequiredDealRisk|ensureDealRisk/);
    expect(source("src/lib/import-export/import.ts")).toMatch(/ensureDealRisk/);
  });

  it("deal page load soft-heals a missing risk instead of dead-ending", () => {
    const queries = source("src/lib/db/queries.ts");
    expect(queries).toMatch(/ensureDealRisk/);
    const workspace = queries.slice(queries.indexOf("export async function getDealWorkspace"));
    expect(workspace).toMatch(/ensureDealRisk/);
    expect(workspace).toMatch(/riskTypeForDeal|lineOfBusiness/);
    const page = source("src/app/deals/[id]/page.tsx");
    expect(page).toMatch(/This deal is missing a risk row/);
  });
});
