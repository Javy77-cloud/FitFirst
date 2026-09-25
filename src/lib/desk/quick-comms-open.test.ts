import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  RECORD_ACTIVITY_ACTIONS,
  RECORD_ACTIVITY_ACTION_WIDTH_CLASS,
  RECORD_ACTIVITY_WIDTH_LABEL,
  boardMatchesTarget,
  isQuickCommsKind,
  leadsListQuickCommsHref,
  parseQuickCommsKind,
  recordQuickCommsHref,
} from "./quick-comms-open";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("quick comms row actions", () => {
  it("lists Call / SMS / Email / Task / Meeting and sizes every button to Meeting", () => {
    expect(RECORD_ACTIVITY_ACTIONS.map((item) => [item.kind, item.label])).toEqual([
      ["call", "Call"],
      ["sms", "SMS"],
      ["email", "Email"],
      ["task", "Task"],
      ["meeting", "Meeting"],
    ]);
    expect(RECORD_ACTIVITY_WIDTH_LABEL).toBe("Meeting");
    expect(RECORD_ACTIVITY_ACTION_WIDTH_CLASS).toBe("ff-record-activity-action");
    const css = source("src/app/globals.css");
    expect(css).toMatch(/\.ff-record-activity-action \{/);
    expect(css).toMatch(/width: 4\.65rem;/);
    expect(css).toMatch(/sized to the longest label, "Meeting"/);
  });

  it("parses ?qc= kinds and builds record hrefs — never /logs or activity hashes", () => {
    expect(isQuickCommsKind("call")).toBe(true);
    expect(isQuickCommsKind("logs")).toBe(false);
    expect(parseQuickCommsKind("sms")).toBe("sms");
    expect(parseQuickCommsKind(["meeting"])).toBe("meeting");
    expect(parseQuickCommsKind("nope")).toBeNull();
    expect(recordQuickCommsHref({ kind: "call", dealId: "deal-1" })).toBe("/deals/deal-1?qc=call");
    expect(recordQuickCommsHref({ kind: "email", leadId: "lead-1" })).toBe("/leads/lead-1?qc=email");
    expect(leadsListQuickCommsHref("lead-1", "task", "?status=new")).toBe(
      "/leads?status=new&rail=lead-1&qc=task",
    );
    expect(recordQuickCommsHref({ kind: "call", dealId: "deal-1" })).not.toMatch(/\/logs/);
    expect(recordQuickCommsHref({ kind: "task", leadId: "lead-1" })).not.toMatch(/#/);
  });

  it("matches a Quick Comms board only when record ids agree", () => {
    const board = {
      attrs: {
        "data-ff-quick-comms-deal": "deal-1",
        "data-ff-quick-comms-lead": "lead-1",
      },
      getAttribute(name: string) {
        return this.attrs[name as keyof typeof this.attrs] ?? null;
      },
    };
    expect(boardMatchesTarget(board, { kind: "call", dealId: "deal-1" })).toBe(true);
    expect(boardMatchesTarget(board, { kind: "call", dealId: "deal-2" })).toBe(false);
    expect(boardMatchesTarget(board, { kind: "sms", leadId: "lead-1" })).toBe(true);
    expect(boardMatchesTarget(board, { kind: "sms", leadId: "lead-9" })).toBe(false);
  });

  it("deal / lead / policy / contact menus open the panel instead of logs or device hrefs", () => {
    const menu = source("src/components/desk/record-activity-menu.tsx");
    expect(menu).toMatch(/launchQuickCommsAction/);
    expect(menu).toMatch(/RECORD_ACTIVITY_ACTIONS\.map/);
    expect(menu).toMatch(/RECORD_ACTIVITY_ACTION_WIDTH_CLASS/);
    expect(menu).toMatch(/data-ff-record-activity-strip/);
    expect(menu).not.toMatch(/telHref|smsHref|mailtoHref/);
    expect(menu).not.toMatch(/window\.location\.href/);
    expect(menu).not.toMatch(/\/logs/);
    expect(menu).not.toMatch(/#\$\{action\.kind\}/);
    expect(menu).not.toMatch(/createDealOutreach|MeetingButton|logDeskActivity/);

    const deal = source("src/components/deals/deal-quick-actions.tsx");
    expect(deal).toMatch(/RecordActivityMenu/);
    expect(deal).toMatch(/deal-activity-menu/);
    expect(deal).not.toMatch(/MeetingButton|createDealOutreach|telHref/);

    const lead = source("src/components/desk/contact-action-buttons.tsx");
    expect(lead).toMatch(/RecordActivityMenu/);
    expect(lead).toMatch(/lead-activity-menu/);
    expect(lead).toMatch(/data-ff-lead-activity-option/);
    expect(lead).not.toMatch(/\/leads\/\$\{leadId\}#/);
    expect(lead).not.toMatch(/contactActionHref|telHref/);

    const policy = source("src/components/policy/policy-quick-actions.tsx");
    expect(policy).toMatch(/RecordActivityMenu/);
    expect(policy).not.toMatch(/logDeskActivity|telHref/);

    const pills = source("src/components/desk/record-quick-actions.tsx");
    expect(pills).toMatch(/launchQuickCommsAction/);
    expect(pills).toMatch(/RECORD_ACTIVITY_ACTION_WIDTH_CLASS/);
    expect(pills).not.toMatch(/window\.location\.href/);
    expect(pills).not.toMatch(/createDealOutreach|logDeskActivity/);
  });

  it("Quick Comms board listens for the open event and shares the Meeting-width chips", () => {
    const board = source("src/components/comms/quick-comms-board.tsx");
    expect(board).toMatch(/QUICK_COMMS_EVENT/);
    expect(board).toMatch(/initialKind/);
    expect(board).toMatch(/RECORD_ACTIVITY_ACTION_WIDTH_CLASS/);
    expect(board).toMatch(/data-ff-quick-comms-deal/);
    expect(board).toMatch(/data-ff-quick-comms-lead/);
    expect(board).not.toMatch(/px-2\.5/);
    expect(board).toMatch(/contextLine\(\[contactPhone, contactEmail\]\)/);
    expect(board).not.toMatch(/contextLine\(\[contactName, contactPhone, contactEmail\]\)/);
  });
});
