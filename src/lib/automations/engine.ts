/** Pure playbook planner. DB writes live in fire.ts — this file stays testable. */

import {
  isAutomationAction,
  type AutomationAction,
  type PlaybookVisibility,
} from "./types";

export const PLAYBOOK_ALERT_KINDS = ["playbook", "automation", "automation_preview"] as const;

export type PlaybookOutcomes = {
  createTask: boolean;
  createAlert: boolean;
  /** Draft hold only. Engine never inserts a sent mail job. */
  queueDraftEmail: boolean;
};

export function outcomesForAction(action: string): PlaybookOutcomes {
  if (action === "create_task") {
    return { createTask: true, createAlert: false, queueDraftEmail: false };
  }
  if (action === "in_app_notify") {
    return { createTask: false, createAlert: true, queueDraftEmail: false };
  }
  if (action === "task_and_alert") {
    return { createTask: true, createAlert: true, queueDraftEmail: false };
  }
  if (action === "send_template_email") {
    return { createTask: false, createAlert: true, queueDraftEmail: true };
  }
  return { createTask: false, createAlert: true, queueDraftEmail: false };
}

export function playbookVisibleTo(
  visibility: string | null | undefined,
  isAdmin: boolean,
): boolean {
  if (isAdmin) return true;
  const next = visibility === "admin" || visibility === "agent" ? visibility : "both";
  return next === "agent" || next === "both";
}

export function isPlaybookAlertKind(kind: string): boolean {
  return (PLAYBOOK_ALERT_KINDS as readonly string[]).includes(kind);
}

export function normalizeVisibility(value: string | null | undefined): PlaybookVisibility {
  if (value === "admin" || value === "agent") return value;
  return "both";
}

export function outcomeBadges(action: string): string[] {
  const outcomes = outcomesForAction(action);
  const badges: string[] = [];
  if (outcomes.createTask) badges.push("Task");
  if (outcomes.createAlert) badges.push("Alert");
  if (outcomes.queueDraftEmail) badges.push("Draft hold");
  return badges.length ? badges : ["Alert"];
}

export type PlannedPlaybookFire = {
  createTask: boolean;
  createAlert: boolean;
  emailed: false;
  taskTitle: string;
  alertTitle: string;
  alertBody: string;
  alertKind: "playbook";
  visibility: PlaybookVisibility;
};

export function planPlaybookFire(input: {
  name: string;
  actionKind: string;
  actionValue: string;
  visibility?: string | null;
}): PlannedPlaybookFire {
  const action: AutomationAction = isAutomationAction(input.actionKind)
    ? input.actionKind
    : "in_app_notify";
  const outcomes = outcomesForAction(action);
  const copy = input.actionValue.trim() || input.name.trim() || "Playbook";
  const draftHold = outcomes.queueDraftEmail
    ? `${copy} — template stays draft. Nothing emailed Javy or the client.`
    : copy;
  return {
    createTask: outcomes.createTask,
    createAlert: outcomes.createAlert || outcomes.queueDraftEmail,
    emailed: false,
    taskTitle: copy,
    alertTitle: `${input.name.trim() || "Playbook"} · in-desk`,
    alertBody: draftHold,
    alertKind: "playbook",
    visibility: normalizeVisibility(input.visibility),
  };
}

export function alertTargetUserId(input: {
  visibility: PlaybookVisibility;
  adminUserId: string;
  agentUserId: string;
}): string | null {
  if (input.visibility === "admin") return input.adminUserId;
  if (input.visibility === "agent") return input.agentUserId;
  return null;
}
