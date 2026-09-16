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
  noticeTypesForFamily,
  noticeTypesFromPicklist,
  parseNoticeType,
  SEED_NOTICE_LABELS,
  SEED_NOTICE_TYPE_OPTIONS,
} from "./notices";

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
    expect(chip).toMatch(/Notice · Inspection before bind/);
    expect(renderToString(createElement(DealNoticeChip, { noticeType: "none" }))).toBe("");

    const header = renderToString(
      createElement(DealNotices, {
        dealId: "deal-1",
        product: "homeowners",
        noticeType: "check_mortgagee_payment",
        variant: "header",
      }),
    );
    expect(header).toMatch(/data-ff-deal-notice-chip/);
    expect(header).toMatch(/Notice · Check mortgagee payment/);
    expect(header).toMatch(/data-ff-notice-set-reminder/);
    expect(header).toMatch(/data-ff-notice-complete-open/);
    expect(header).not.toMatch(/data-ff-notice-snooze/);
    expect(header).not.toMatch(/>Inspection</);

    const quotes = renderToString(
      createElement(DealNotices, {
        dealId: "deal-1",
        product: "homeowners",
        noticeType: "none",
        variant: "quotes",
      }),
    );
    expect(quotes).toMatch(/>Notices</);
    expect(quotes).toMatch(/data-ff-notice-status/);
    expect(quotes).toMatch(/Edit types/);
    expect(quotes).not.toMatch(/data-ff-notice-set/);
    expect(quotes).not.toMatch(/name="dueDate"/);
    expect(quotes).not.toMatch(/data-ff-notice-create-task/);
    expect(quotes).not.toMatch(/data-ff-notice-snooze/);
    expect(quotes).not.toMatch(/>Inspection</);
    expect(quotes).not.toMatch(/data-ff-inspection-status/);

    const quotesActive = renderToString(
      createElement(DealNotices, {
        dealId: "deal-1",
        product: "homeowners",
        noticeType: "inspection_before_bind",
        noticeTaskId: "task-1",
        variant: "quotes",
      }),
    );
    expect(quotesActive).toMatch(/data-ff-notice-set/);
    expect(quotesActive).toMatch(/data-ff-notice-task-link/);
    expect(quotesActive).toMatch(/data-ff-notice-complete/);
    expect(quotesActive).not.toMatch(/name="dueDate"/);
    expect(quotesActive).not.toMatch(/data-ff-notice-snooze/);
  });
});
