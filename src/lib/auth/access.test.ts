import { describe, expect, it } from "vitest";
import {
  adminRedirectPath,
  capabilitiesFor,
  isAdminOnlyPath,
  isApiSelfAuthPath,
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
    expect(caps.seeDeveloperHub).toBe(false);
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
    expect(caps.seeDeveloperHub).toBe(false);
  });

  it("gives Developer the hub without Admin settings", () => {
    const caps = capabilitiesFor("developer");
    expect(caps.role).toBe("developer");
    expect(caps.seeDeveloperHub).toBe(true);
    expect(caps.seeAdminSettings).toBe(false);
    expect(caps.askTeammate).toBe(false);
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
    expect(isAdminOnlyPath("/settings/export")).toBe(true);
    expect(isAdminOnlyPath("/settings/developer")).toBe(true);
    expect(isAdminOnlyPath("/settings/developer/functions")).toBe(true);
    expect(isAdminOnlyPath("/settings/developer/api-keys")).toBe(true);
    expect(isAdminOnlyPath("/settings/developer-hub")).toBe(true);
    expect(isAdminOnlyPath("/settings/developer-hub/macros")).toBe(true);
    expect(isAdminOnlyPath("/settings/developer-hub/missing-questions")).toBe(true);
    expect(isAdminOnlyPath("/settings/import-export")).toBe(true);
    expect(isAdminOnlyPath("/settings/import")).toBe(true);
    expect(isAdminOnlyPath("/settings/import?pack=contacts")).toBe(true);
    expect(isAdminOnlyPath("/logs/fill-learning")).toBe(true);
    expect(isAdminOnlyPath("/compliance")).toBe(true);
    expect(isAdminOnlyPath("/carriers/logs")).toBe(false);
    expect(isAdminOnlyPath("/settings")).toBe(true);
    expect(isAdminOnlyPath("/admin")).toBe(true);
    expect(isAdminOnlyPath("/settings/billing")).toBe(true);
    expect(isAdminOnlyPath("/settings/integrations")).toBe(true);
    expect(isAdminOnlyPath("/settings/social")).toBe(true);
    expect(isAdminOnlyPath("/settings/my-desk")).toBe(false);
    expect(isAdminOnlyPath("/settings/security")).toBe(false);
    expect(isAdminOnlyPath("/settings/profile")).toBe(false);
    expect(isAdminOnlyPath("/me")).toBe(false);
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
    expect(isPublicPath("/login/mfa")).toBe(true);
    expect(isPublicPath("/recover/password")).toBe(true);
    expect(isPublicPath("/recover/mfa")).toBe(true);
    expect(isPublicPath("/enroll-mfa")).toBe(false);
    expect(isPublicPath("/fill-demo")).toBe(true);
    expect(isPublicPath("/api/v1")).toBe(true);
    expect(isPublicPath("/api/dev/functions/echo_payload/execute")).toBe(true);
    expect(isPublicPath("/api/dev/webhooks/inbound/desk-echo")).toBe(true);
    expect(isPublicPath("/api/v1/contacts")).toBe(true);
    expect(isPublicPath("/api/v1/export/contacts.csv")).toBe(true);
    expect(isPublicPath("/api/dev/functions/echo_payload/execute")).toBe(true);
    expect(isPublicPath("/api/dev/webhooks/inbound/desk-echo")).toBe(true);
    expect(isPublicPath("/api/integrations/healthsherpa/webhook")).toBe(true);
    expect(isPublicPath("/api/integrations/healthsherpa/webhooks")).toBe(true);
    expect(isPublicPath("/api/integrations/oauth/callback")).toBe(true);
    expect(isApiSelfAuthPath("/api/files/abc")).toBe(true);
    expect(isApiSelfAuthPath("/api/documents/abc")).toBe(true);
    expect(isApiSelfAuthPath("/api/v1/contacts")).toBe(false);
    expect(isPublicPath("/api/files/abc")).toBe(false);
    expect(isPublicPath("/portal")).toBe(true);
    expect(isPublicPath("/portal/elena-ruiz-2026/id-cards")).toBe(true);
    expect(isPublicPath("/api/portal/harbor-key-2026/files/x")).toBe(true);
    expect(isPublicPath("/sign/idesk-demo")).toBe(true);
    expect(isPublicPath("/api/sign/idesk-demo/file")).toBe(true);
    expect(isPublicPath("/ff-sheet.js")).toBe(true);
    expect(isPublicPath("/ff-softphone.js")).toBe(true);
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/settings")).toBe(false);
    expect(adminRedirectPath()).toContain("admin-only");
  });
});
