import { describe, expect, it } from "vitest";
import { fieldsForLine } from "./catalog";
import { applyMasterSheetDefaults, MASTER_SHEET_EMPTY_DEFAULTS } from "./sheet-defaults";

describe("Auto permission + driving-record standing (sep7is)", () => {
  it("catalog has MVR/credit permission picklists defaulting Yes on blank sheets", () => {
    const fields = fieldsForLine("auto");
    const mvr = fields.find((f) => f.key === "permission_pull_driving_history");
    const credit = fields.find((f) => f.key === "permission_pull_credit_history");
    expect(mvr?.group).toBe("Authorizations");
    expect(mvr?.options).toEqual(["yes", "no"]);
    expect(credit?.group).toBe("Authorizations");
    expect(credit?.options).toEqual(["yes", "no"]);
    expect(MASTER_SHEET_EMPTY_DEFAULTS.permission_pull_driving_history).toBe("yes");
    expect(MASTER_SHEET_EMPTY_DEFAULTS.permission_pull_credit_history).toBe("yes");
    const applied = applyMasterSheetDefaults({});
    expect(applied.values.permission_pull_driving_history.value).toBe("yes");
    expect(applied.values.permission_pull_credit_history.value).toBe("yes");
  });

  it("driving-record fields exist with picklists; reportable notes MVR pull", () => {
    const fields = fieldsForLine("auto");
    const byKey = Object.fromEntries(fields.map((f) => [f.key, f]));
    expect(byKey.accidents_3yr?.options).toEqual(["None", "1", "2", "3+"]);
    expect(byKey.violations_3yr?.options).toEqual(["None", "1", "2", "3+"]);
    expect(byKey.clean_record?.options).toEqual(["yes", "no"]);
    expect(byKey.reportable_incidents?.options).toEqual(["yes", "no"]);
    expect(byKey.reportable_incidents?.label.toLowerCase()).toMatch(/mvr/);
    expect(byKey.incident_details).toBeTruthy();
  });
});
