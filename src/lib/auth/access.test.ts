import { describe, expect, it } from "vitest";
import {
  adminRedirectPath,
  capabilitiesFor,
  isAdminOnlyPath,
  isPublicPath,
} from "./access";

describe("Admin vs Agent capabilities", () => {
  it("gives Admin every agency tool and all-book visibility", () => {
    const caps = capabilitiesFor("admin");
    expect(caps.signedIn).toBe(true);
    expect(caps.seeAllBooks).toBe(true);
    expect(caps.seeAdminSettings).toBe(true);
    expect(caps.askTeammate).toBe(true);
    expect(caps.connectAgencyIntegrations).toBe(true);
    expect(caps.editGlobalLists).toBe(true);
    expect(caps.editAppetiteTools).toBe(true);
    expect(caps.ownBookCrm).toBe(true);
    expect(caps.sendClientComms).toBe(true);
    expect(caps.calendarOwnItems).toBe(true);
    expect(caps.pipelineOwnDeals).toBe(true);
  });

  it("lets an Agent work their book but not Admin tools", () => {
    const caps = capabilitiesFor("agent");
    expect(caps.signedIn).toBe(true);
    expect(caps.seeAllBooks).toBe(false);
    expect(caps.seeAdminSettings).toBe(false);
    expect(caps.askTeammate).toBe(false);
    expect(caps.connectAgencyIntegrations).toBe(false);
    expect(caps.editGlobalLists).toBe(false);
    expect(caps.editAppetiteTools).toBe(false);
    expect(caps.ownBookCrm).toBe(true);
    expect(caps.sendClientComms).toBe(true);
    expect(caps.calendarOwnItems).toBe(true);
    expect(caps.pipelineOwnDeals).toBe(true);
  });

  it("treats owner as Admin and unsigned as guest", () => {
    expect(capabilitiesFor("owner").seeAdminSettings).toBe(true);
    expect(capabilitiesFor(null).signedIn).toBe(false);
    expect(capabilitiesFor("guest").askTeammate).toBe(false);
  });

  it("marks Admin settings and integration routes as Admin-only", () => {
    expect(isAdminOnlyPath("/settings/agency")).toBe(true);
    expect(isAdminOnlyPath("/settings/offices")).toBe(true);
    expect(isAdminOnlyPath("/settings/territories")).toBe(true);
    expect(isAdminOnlyPath("/settings/email-templates/new")).toBe(true);
    expect(isAdminOnlyPath("/settings/sms")).toBe(true);
    expect(isAdminOnlyPath("/settings/phone")).toBe(true);
    expect(isAdminOnlyPath("/settings/lines")).toBe(true);
    expect(isAdminOnlyPath("/settings/agents")).toBe(true);
    expect(isAdminOnlyPath("/settings/agents/abc/performance")).toBe(true);
    expect(isAdminOnlyPath("/settings")).toBe(false);
    expect(isAdminOnlyPath("/settings/my-desk")).toBe(false);
    expect(isAdminOnlyPath("/pipeline")).toBe(false);
    expect(isAdminOnlyPath("/calendar")).toBe(false);
  });

  it("keeps login and fill-demo public", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/login/invite")).toBe(true);
    expect(isPublicPath("/login/reset")).toBe(true);
    expect(isPublicPath("/login/mfa")).toBe(true);
    expect(isPublicPath("/login/recover")).toBe(true);
    expect(isPublicPath("/login?error=1")).toBe(true);
    expect(isPublicPath("/fill-demo")).toBe(true);
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/settings")).toBe(false);
    expect(adminRedirectPath()).toContain("admin-only");
  });
});
