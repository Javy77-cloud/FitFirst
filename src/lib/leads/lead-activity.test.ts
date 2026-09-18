import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ACTIVITY_KINDS } from "@/lib/domain";
import {
  LEAD_ACTIVITY_MENU_ITEMS,
  LEAD_ACTIVITY_SECTION_EMPTY,
  LEAD_ACTIVITY_SECTION_TITLE,
  leadActivityByKind,
  timelineItemsForKind,
} from "./lead-activity";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("lead activity set + Quick Comms surfaces", () => {
  it("exposes all five kinds with the labels Javy expects", () => {
    expect(ACTIVITY_KINDS).toEqual(["task", "meeting", "call", "email", "sms"]);
    expect(LEAD_ACTIVITY_MENU_ITEMS.map((item) => [item.kind, item.label])).toEqual([
      ["task", "Tasks"],
      ["meeting", "Meetings"],
      ["call", "Calls"],
      ["email", "Emails"],
      ["sms", "SMS"],
    ]);
    expect(Object.keys(LEAD_ACTIVITY_SECTION_TITLE)).toEqual([...ACTIVITY_KINDS]);
    expect(Object.keys(LEAD_ACTIVITY_SECTION_EMPTY)).toEqual([...ACTIVITY_KINDS]);
  });

  it("groups timeline rows by kind without throwing on a blank kind", () => {
    const grouped = leadActivityByKind([
      {
        id: "1",
        kind: "CALL",
        subject: "Dial Katherine",
        occurredAt: "2026-09-17T12:00:00.000Z",
        direction: "outbound",
      },
      {
        id: "2",
        kind: "",
        body: "orphan",
        occurredAt: "2026-09-17T12:01:00.000Z",
      },
    ]);
    expect(grouped.call).toEqual([
      {
        id: "1",
        title: "Dial Katherine",
        when: "2026-09-17T12:00:00.000Z",
        meta: "outbound",
      },
    ]);
    expect(grouped.task).toEqual([]);
    expect(grouped.meeting).toEqual([]);
    expect(grouped.email).toEqual([]);
    expect(grouped.sms).toEqual([]);
    expect(timelineItemsForKind([], "sms")).toEqual([]);
  });

  it("keeps Quick Comms on lead detail AND the queue rail (the surface #109 missed)", () => {
    const detail = source("src/app/leads/[id]/page.tsx");
    const queue = source("src/app/leads/page.tsx");
    const workspace = source("src/components/leads/lead-detail-workspace.tsx");
    const menu = source("src/components/desk/contact-action-buttons.tsx");

    expect(detail).toMatch(/LeadQuickComms/);
    expect(detail).toMatch(/LeadActivityPanels/);
    expect(detail).toMatch(/id="activity"/);
    expect(detail).toMatch(/leadActivityByKind\(timeline\)/);
    expect(detail).not.toMatch(/<RecordSection[\s\S]*LeadDetailWorkspace/);
    expect(detail).not.toMatch(/RecordComms/);

    expect(workspace).toMatch(/afterFields/);
    expect(workspace).toMatch(/data-ff-lead-layout="layout-rail"/);

    expect(queue).toMatch(/LeadQuickComms/);
    expect(queue).toMatch(/data-ff-leads-list-rail/);
    expect(queue).toMatch(/listRecordActivities\(\{ leadId: railLead\.id \}/);

    expect(menu).toMatch(/LEAD_ACTIVITY_MENU_ITEMS/);
    expect(menu).toMatch(/data-testid="lead-activity-menu"/);
    expect(menu).toMatch(/data-ff-lead-activity-option/);
    expect(menu).toMatch(/\/leads\/\$\{leadId\}#\$\{action\.kind\}/);
  });
});
