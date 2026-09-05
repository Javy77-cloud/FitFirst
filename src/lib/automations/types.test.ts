import { describe, expect, it } from "vitest";
import {
  preferredActionFor,
  validateGuidedAutomation,
  AUTOMATION_ACTION_LABEL,
  AUTOMATION_DEVELOPER_SECTIONS,
  AUTOMATION_DEV_SECTIONS,
  AUTOMATION_HUB_SECTIONS,
  AUTOMATION_TRIGGER_LABEL,
} from "./types";

describe("validateGuidedAutomation", () => {
  it("requires a name and a notify message", () => {
    const missingName = validateGuidedAutomation({
      name: "  ",
      triggerKind: "closed_won",
      triggerValue: "",
      conditionKind: "always",
      conditionValue: "",
      actionKind: "in_app_notify",
      actionValue: "Ping Maya",
    });
    expect(missingName.ok).toBe(false);

    const missingNotify = validateGuidedAutomation({
      name: "Closed Won ping",
      triggerKind: "closed_won",
      triggerValue: "",
      conditionKind: "always",
      conditionValue: "",
      actionKind: "in_app_notify",
      actionValue: "",
    });
    expect(missingNotify.ok).toBe(false);
  });

  it("accepts a Closed Won in-app notify", () => {
    const result = validateGuidedAutomation({
      name: "Closed Won — ping producer",
      triggerKind: "closed_won",
      triggerValue: "",
      conditionKind: "always",
      conditionValue: "",
      actionKind: "in_app_notify",
      actionValue: "Closed Won just landed. Check the bind packet.",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.actionKind).toBe("in_app_notify");
      expect(result.value.triggerKind).toBe("closed_won");
      expect(result.value.visibility).toBe("both");
    }
  });

  it("requires a line when the condition is line of business", () => {
    const result = validateGuidedAutomation({
      name: "HO3 renewal task",
      triggerKind: "policy_renewal_window",
      triggerValue: "60",
      conditionKind: "line_of_business",
      conditionValue: "",
      actionKind: "create_task",
      actionValue: "Shop this renewal",
    });
    expect(result.ok).toBe(false);
  });
});

describe("preferredActionFor", () => {
  it("prefers in-app notify for agent-facing triggers", () => {
    expect(preferredActionFor("closed_won")).toBe("in_app_notify");
    expect(preferredActionFor("birthday")).toBe("in_app_notify");
    expect(preferredActionFor("deal_stage_change")).toBe("in_app_notify");
    expect(preferredActionFor("policy_renewal_window")).toBe("task_and_alert");
  });
});

describe("labels", () => {
  it("keeps Javy-facing copy on the notify action", () => {
    expect(AUTOMATION_ACTION_LABEL.in_app_notify).toBe("In-app alert");
    expect(AUTOMATION_TRIGGER_LABEL.closed_won).toBe("Closed Won");
  });

  it("lists in-desk playbooks first on the automations hub", () => {
    expect(AUTOMATION_HUB_SECTIONS[0]?.id).toBe("playbooks");
    expect(AUTOMATION_HUB_SECTIONS[0]?.href).toBe("/automations/playbooks");
    expect(AUTOMATION_ACTION_LABEL.task_and_alert).toBe("Task + in-app alert");
    expect(AUTOMATION_HUB_SECTIONS.map((section) => section.id)).toEqual(
      expect.arrayContaining(["sequences", "macros", "functions", "webhooks", "api-keys", "buttons"]),
    );
  });

  it("puts Developer Hub tools on Automations, not Settings-only", () => {
    expect(AUTOMATION_DEVELOPER_SECTIONS.every((section) => section.href.startsWith("/automations/"))).toBe(
      true,
    );
    expect(AUTOMATION_DEV_SECTIONS.map((section) => section.id)).toEqual([
      "macros",
      "functions",
      "webhooks",
      "api-keys",
      "buttons",
      "client-scripts",
      "connections",
    ]);
  });

  it("exposes Macros and Custom Buttons from Automations, not only Settings", () => {
    const ids = AUTOMATION_HUB_SECTIONS.map((section) => section.id);
    const hrefs = AUTOMATION_HUB_SECTIONS.map((section) => section.href);
    expect(ids).toContain("macros");
    expect(ids).toContain("custom-buttons");
    expect(hrefs).toContain("/automations/macros");
    expect(hrefs).toContain("/automations/custom-buttons");
  });
});
