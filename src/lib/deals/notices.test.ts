import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DealNoticeChip, DealNotices } from "@/components/deal/deal-notices";
import {
  DEAL_NOTICE_PICKLIST_OPTIONS,
  isActiveNotice,
  mergeNoticeTypeOptions,
  noticeChipLabel,
  noticeCompleteLogBody,
  isNoticeTaskTitle,
  noticeTaskKind,
  noticeTaskTitle,
  noticePicklistForFamily,
  noticeStampPhrase,
  noticeTypesForFamily,
  noticeTypesFromPicklist,
  parseNoticeType,
  SEED_NOTICE_LABELS,
  SEED_NOTICE_TYPE_OPTIONS,
} from "./notices";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("deal notices", () => {
  it("maps leftover inspection slugs and keeps custom types", () => {
    expect(parseNoticeType("before_bind")).toBe("inspection_before_bind");
    expect(parseNoticeType("carrier_post_bind")).toBe("check_mortgagee_payment");
    expect(parseNoticeType("Inspection before bind")).toBe("inspection_before_bind");
    expect(parseNoticeType("Carrier post-bind inspection")).toBe("check_mortgagee_payment");
    expect(parseNoticeType("none")).toBe("none");
    expect(parseNoticeType("")).toBe("none");
    expect(parseNoticeType("roof_photos_needed")).toBe("roof_photos_needed");
    expect(isActiveNotice("none")).toBe(false);
    expect(isActiveNotice("inspection_before_bind")).toBe(true);
    expect(noticeChipLabel("none")).toBeNull();
    expect(noticeChipLabel("inspection_before_bind")).toBe("Notice · Inspection before bind");
    expect(noticeChipLabel("check_mortgagee_payment")).toBe("Notice · Check mortgagee payment");
    expect(noticeStampPhrase("inspection_before_bind")).toBe("Notice · Inspection");
    expect(noticeStampPhrase("check_mortgagee_payment")).toBe("Notice · Check mortgagee");
    expect(noticeStampPhrase("roof_photos_needed")).toBe("Notice · Roof Photos Needed");
    expect(noticeStampPhrase("none")).toBeNull();
    expect(
      noticePicklistForFamily(
        [{ id: "pl-1", name: "Deal notices · P&C", options: ["Inspection before bind"] }],
        "pc",
      )?.id,
    ).toBe("pl-1");
    expect(DEAL_NOTICE_PICKLIST_OPTIONS).toEqual([
      "Inspection before bind",
      "Check mortgagee payment",
    ]);
  });

  it("builds types from the agency picklist and keeps a current leftover value", () => {
    const fromSeed = noticeTypesFromPicklist(null);
    expect(fromSeed.map((row) => row.value)).toEqual([
      "none",
      "inspection_before_bind",
      "check_mortgagee_payment",
    ]);
    const custom = noticeTypesFromPicklist(["Roof photos needed", "Inspection before bind"]);
    expect(custom.map((row) => `${row.value}:${row.label}`)).toEqual([
      "none:None",
      "roof_photos_needed:Roof photos needed",
      "inspection_before_bind:Inspection before bind",
    ]);
    expect(mergeNoticeTypeOptions(custom, "check_mortgagee_payment").map((row) => row.value)).toContain(
      "check_mortgagee_payment",
    );
  });

  it("writes complete-log text and a review-task title", () => {
    expect(
      noticeCompleteLogBody({
        agent: "Javier Garcia",
        noticeType: "inspection_before_bind",
        notes: "4-point cleared.",
      }),
    ).toBe(
      ["Agent: Javier Garcia", "Notice: Inspection before bind (inspection_before_bind)", "Notes: 4-point cleared."].join(
        "\n",
      ),
    );
    expect(
      noticeTaskTitle({
        noticeType: "check_mortgagee_payment",
        productLabel: "Homeowners",
        note: "Call lender",
      }),
    ).toBe("Notice · Check mortgagee payment · Homeowners — Call lender");
    expect(noticeTaskKind("inspection_before_bind")).toBe("inspection_scheduling");
    expect(noticeTaskKind("check_mortgagee_payment")).toBe("work_reminder");
    expect(isNoticeTaskTitle("Notice · Check mortgagee payment")).toBe(true);
    expect(isNoticeTaskTitle("Work reminder — Call lender")).toBe(false);
    expect(SEED_NOTICE_TYPE_OPTIONS[0]).toEqual({ value: "none", label: SEED_NOTICE_LABELS.none });
    expect(
      noticeTypesForFamily(
        [{ name: "Deal notices · Life", options: ["Paramed exam"] }],
        "life",
      ).map((row) => row.value),
    ).toEqual(["none", "paramed_exam"]);
    expect(noticeTypesForFamily([], "health").map((row) => row.value)).toEqual(["none"]);
    expect(noticeTypesForFamily([], "pc").map((row) => row.value)).toEqual([
      "none",
      "inspection_before_bind",
      "check_mortgagee_payment",
    ]);
  });

  it("renders an obvious notice chip and a Notices control, not Inspection", () => {
    const chip = renderToString(
      createElement(DealNoticeChip, { noticeType: "inspection_before_bind" }),
    );
    expect(chip).toMatch(/data-ff-deal-notice-chip/);
    expect(chip).toMatch(/Notice · Inspection/);
    expect(renderToString(createElement(DealNoticeChip, { noticeType: "none" }))).toBe("");

    const header = renderToString(
      createElement(DealNotices, {
        dealId: "deal-1",
        product: "homeowners",
        noticeType: "check_mortgagee_payment",
        placement: "header",
      }),
    );
    expect(header).toMatch(/data-ff-deal-notice-chip/);
    expect(header).toMatch(/data-ff-notice-stamp/);
    expect(header).toMatch(/Notice · Check mortgagee/);
    expect(header).not.toMatch(/data-ff-notice-popover/);
    expect(header).not.toMatch(/data-ff-notice-snooze/);
    expect(header).not.toMatch(/>Inspection</);
    expect(header).not.toMatch(/\/settings\/picklists/);

    const empty = renderToString(
      createElement(DealNotices, {
        dealId: "deal-1",
        product: "homeowners",
        noticeType: "none",
        placement: "header",
      }),
    );
    expect(empty).toMatch(/\+ Notice/);
    expect(empty).toMatch(/data-ff-notice-add/);
    expect(empty).not.toMatch(/data-ff-notice-status/);
    expect(empty).not.toMatch(/Edit types/);
    expect(empty).not.toMatch(/\/settings\/picklists/);
    expect(empty).not.toMatch(/data-ff-notice-set/);
    expect(empty).not.toMatch(/name="dueDate"/);
    expect(empty).not.toMatch(/data-ff-notice-snooze/);
    expect(empty).not.toMatch(/>Inspection</);
    expect(empty).not.toMatch(/data-ff-inspection-status/);

    const overlayActive = renderToString(
      createElement(DealNotices, {
        dealId: "deal-1",
        product: "homeowners",
        noticeType: "inspection_before_bind",
        noticeTaskId: "task-1",
        placement: "overlay",
      }),
    );
    expect(overlayActive).toMatch(/data-ff-notice-stamp/);
    expect(overlayActive).toMatch(/Notice · Inspection/);
    expect(overlayActive).not.toMatch(/data-ff-notice-set/);
    expect(overlayActive).not.toMatch(/name="dueDate"/);
    expect(overlayActive).not.toMatch(/data-ff-notice-snooze/);
    expect(source("src/components/deal/deal-notices.tsx")).toMatch(/data-ff-notice-popover/);
    expect(source("src/components/deal/deal-notices.tsx")).toMatch(/NoticeTypesEditor/);
    expect(source("src/components/deal/notice-note-pad.tsx")).toMatch(/prepareSpeechMicrophone/);
    expect(source("src/components/deal/notice-types-editor.tsx")).toMatch(/saveDealNoticeTypes/);
  });
});
