import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { capabilitiesFor, isDeveloperOnlyPath } from "@/lib/auth/access";
import { developerRedirectPath, isDeveloperRole, sessionIsDeveloper } from "./profile";

describe("developer profile gates", () => {
  it("treats developer as a third role, not Admin or Agent", () => {
    const caps = capabilitiesFor("developer");
    expect(caps.role).toBe("developer");
    expect(caps.seeDeveloperHub).toBe(true);
    expect(caps.seeAdminSettings).toBe(false);
    expect(caps.askTeammate).toBe(false);
    expect(capabilitiesFor("admin").seeDeveloperHub).toBe(false);
    expect(capabilitiesFor("admin", { isDeveloper: true }).seeDeveloperHub).toBe(true);
    expect(capabilitiesFor("admin", { isDeveloper: true }).seeAdminSettings).toBe(true);
    expect(capabilitiesFor("agent").seeDeveloperHub).toBe(false);
  });

  it("gates the Developer hub and API vault paths", () => {
    expect(isDeveloperOnlyPath("/developer")).toBe(true);
    expect(isDeveloperOnlyPath("/developer/notes")).toBe(true);
    expect(isDeveloperOnlyPath("/settings/developer-hub/api-vault")).toBe(true);
    expect(isDeveloperOnlyPath("/settings")).toBe(false);
    expect(isDeveloperOnlyPath("/admin")).toBe(false);
    expect(developerRedirectPath()).toContain("developer-only");
  });

  it("recognizes the developer role and site-developer flag", () => {
    expect(isDeveloperRole("developer")).toBe(true);
    expect(isDeveloperRole("admin")).toBe(false);
    expect(sessionIsDeveloper({ role: "developer" })).toBe(true);
    expect(sessionIsDeveloper({ role: "admin", isSiteDeveloper: true })).toBe(true);
    expect(sessionIsDeveloper({ role: "admin", isSiteDeveloper: false })).toBe(false);
    expect(sessionIsDeveloper({ role: "agent" })).toBe(false);
  });

  it("wires a third login card and a gated /developer page", () => {
    const login = readFileSync("src/app/login/page.tsx", "utf8");
    const page = readFileSync("src/app/developer/page.tsx", "utf8");
    const session = readFileSync("src/lib/auth/session.ts", "utf8");
    expect(login).toMatch(/who" value="developer"/);
    expect(login).toMatch(/Sign in as Developer/);
    expect(session).toMatch(/drew@fitfirst\.local/);
    expect(page).toMatch(/requireDeveloperPage/);
    expect(page).toMatch(/loadDeveloperUsageTiles/);
    expect(page).toMatch(/DEVELOPER_UPCOMING/);
    expect(page).toMatch(/NOT_COUNTED_YET/);
  });
});
