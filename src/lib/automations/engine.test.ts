import { describe, expect, it } from "vitest";
import {
  alertTargetUserId,
  isPlaybookAlertKind,
  outcomeBadges,
  outcomesForAction,
  planPlaybookFire,
  playbookVisibleTo,
} from "./engine";
import { preferredActionFor } from "./types";

describe("outcomesForAction", () => {
  it("fires a task and an alert together for renewal playbooks", () => {
    expect(outcomesForAction("task_and_alert")).toEqual({
      createTask: true,
      createAlert: true,
      queueDraftEmail: false,
    });
    expect(outcomeBadges("task_and_alert")).toEqual(["Task", "Alert"]);
  });

  it("never marks a template action as a send", () => {
    const planned = planPlaybookFire({
      name: "Review ask",
      actionKind: "send_template_email",
      actionValue: "Google review request",
      visibility: "admin",
    });
    expect(planned.emailed).toBe(false);
    expect(planned.createTask).toBe(false);
    expect(planned.createAlert).toBe(true);
    expect(planned.alertBody).toContain("Nothing emailed Javy");
  });
});

describe("playbookVisibleTo", () => {
  it("lets Admin see every playbook and hides admin-only from agents", () => {
    expect(playbookVisibleTo("admin", true)).toBe(true);
    expect(playbookVisibleTo("agent", true)).toBe(true);
    expect(playbookVisibleTo("both", true)).toBe(true);
    expect(playbookVisibleTo("admin", false)).toBe(false);
    expect(playbookVisibleTo("agent", false)).toBe(true);
    expect(playbookVisibleTo("both", false)).toBe(true);
  });
});

describe("planPlaybookFire", () => {
  it("plans a Hale-style 30-day renewal as Task + Alert", () => {
    const planned = planPlaybookFire({
      name: "Renewal 30 — shop nudge",
      actionKind: "task_and_alert",
      actionValue: "Shop Hale HO 30 days out",
      visibility: "admin",
    });
    expect(planned.createTask).toBe(true);
    expect(planned.createAlert).toBe(true);
    expect(planned.emailed).toBe(false);
    expect(planned.taskTitle).toBe("Shop Hale HO 30 days out");
    expect(alertTargetUserId({
      visibility: planned.visibility,
      adminUserId: "admin",
      agentUserId: "agent",
    })).toBe("admin");
  });
});

describe("preferredActionFor", () => {
  it("prefers Task + Alert on the renewal window", () => {
    expect(preferredActionFor("policy_renewal_window")).toBe("task_and_alert");
    expect(preferredActionFor("birthday")).toBe("in_app_notify");
  });
});

describe("isPlaybookAlertKind", () => {
  it("treats playbook and preview kinds as in-app only", () => {
    expect(isPlaybookAlertKind("playbook")).toBe(true);
    expect(isPlaybookAlertKind("automation_preview")).toBe(true);
    expect(isPlaybookAlertKind("record_ask")).toBe(false);
  });
});
