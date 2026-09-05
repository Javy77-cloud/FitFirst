import { describe, expect, it } from "vitest";
import { defaultPrivilegesForRole, isModulePath } from "./privileges";

describe("agent privilege defaults", () => {
  it("gives Admin agency widgets and Agents their own book by default", () => {
    expect(defaultPrivilegesForRole("admin")).toEqual({
      canAccessModules: true,
      canSeeAgencyWidgets: true,
    });
    expect(defaultPrivilegesForRole("agent")).toEqual({
      canAccessModules: true,
      canSeeAgencyWidgets: false,
    });
  });

  it("treats CRM and pipeline as modules, not Home or My desk", () => {
    expect(isModulePath("/pipeline")).toBe(true);
    expect(isModulePath("/leads/abc")).toBe(true);
    expect(isModulePath("/inbox")).toBe(true);
    expect(isModulePath("/phone")).toBe(true);
    expect(isModulePath("/")).toBe(false);
    expect(isModulePath("/alerts")).toBe(false);
    expect(isModulePath("/settings/my-desk")).toBe(false);
  });
});
