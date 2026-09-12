import { describe, expect, it } from "vitest";
import { isDeskUuid, isInvalidDeskRecordPath } from "./desk-id";

describe("isInvalidDeskRecordPath", () => {
  it("404s non-UUID record ids that used to 500 Developer Hub pages", () => {
    expect(isInvalidDeskRecordPath("/automations/functions/not-a-uuid")).toBe(true);
    expect(isInvalidDeskRecordPath("/automations/webhooks/not-a-uuid")).toBe(true);
    expect(isInvalidDeskRecordPath("/automations/connections/not-a-uuid")).toBe(true);
    expect(isInvalidDeskRecordPath("/settings/developer/functions/not-a-uuid")).toBe(true);
    expect(isInvalidDeskRecordPath("/settings/email-templates/not-a-uuid")).toBe(true);
    expect(isInvalidDeskRecordPath("/contacts/not-a-uuid")).toBe(true);
  });

  it("leaves reserved segments and valid seeded ids alone", () => {
    expect(isInvalidDeskRecordPath("/automations/functions/new")).toBe(false);
    expect(isInvalidDeskRecordPath("/deals/new")).toBe(false);
    expect(isInvalidDeskRecordPath("/certificates/holders")).toBe(false);
    expect(isInvalidDeskRecordPath("/renewals/queue")).toBe(false);
    expect(isInvalidDeskRecordPath("/carriers/logs")).toBe(false);
    expect(isInvalidDeskRecordPath("/carriers/compare")).toBe(false);
    expect(isInvalidDeskRecordPath("/carriers/calculator")).toBe(false);
    expect(isInvalidDeskRecordPath("/deals/22222222-2222-4222-8222-222222222222")).toBe(false);
    expect(isInvalidDeskRecordPath("/automations/functions")).toBe(false);
    expect(isDeskUuid("22222222-2222-4222-8222-222222222222")).toBe(true);
  });
});
