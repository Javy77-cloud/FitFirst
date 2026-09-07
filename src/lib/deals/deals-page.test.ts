import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEAL_ACTIVITY_TONES, DEAL_MEETING_ACTION_COLOR, DEAL_TASK_ACTION_COLOR } from "./pipeline-desk";
import {
  allColumnIds,
  DEALS_LIST_COLUMNS,
  defaultVisibleIds,
  isListColumnSortable,
  isLiveSearchColumn,
} from "@/lib/list-columns";
import { normalizeDealsVisibleColumns, TABLE_COLUMNS } from "@/lib/desk/columns";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("Deals page sep7h", () => {
  it("titles the page Deals / Pipeline and drops Pipeline from the view switcher", () => {
    const page = source("src/app/deals/page.tsx");
    expect(page).toMatch(/title="Deals \/ Pipeline"/);
    expect(page).not.toMatch(/title="Pipeline"/);
    expect(page).toMatch(/eyebrow=""/);
    expect(page).not.toMatch(/Personal Lines Worksheet/);
    const bar = source("src/components/deals/deal-workspace-bar.tsx");
    expect(bar).toMatch(/aria-label="Table Board Funnel"/);
    expect(bar).not.toMatch(/>\s*Pipeline\s*</);
    expect(bar).toMatch(/\["table", "Table"\]/);
    expect(bar).toMatch(/\["board", "Board"\]/);
    expect(bar).toMatch(/\["funnel", "Funnel"\]/);
    expect(bar).toMatch(/deal-line-filters/);
    expect(bar).toMatch(/deal-closed-filters/);
    expect(bar).toMatch(/gap-x-4/);
    expect(bar).toMatch(/gap-x-5/);
    expect(bar).toMatch(/gap-x-6/);
  });

  it("keeps attach-documents on the left band, ~1.6× card, beside Today's Activity", () => {
    const page = source("src/app/deals/page.tsx");
    expect(page).toMatch(/deal-upload-activity/);
    expect(page).toMatch(/lg:flex-row/);
    expect(page).toMatch(/lg:flex-wrap/);
    expect(page).toMatch(/lg:justify-start/);
    expect(page).toMatch(/lg:min-w-\[29rem\]/);
    expect(page).toMatch(/lg:max-w-\[min\(62%,45rem\)\]/);
    expect(page).not.toMatch(/lg:grid-cols-12/);
    expect(page).not.toMatch(/lg:col-span-7/);
    expect(page).not.toMatch(/lg:col-span-5/);
    expect(page).not.toMatch(/justify-end/);
    expect(page).not.toMatch(/ml-auto/);
    expect(page.indexOf("<DealDocsUpload")).toBeLessThan(page.indexOf("<TodayActivityStrip"));
    expect(page).toMatch(/<TodayActivityStrip/);
    expect(page).toMatch(/<DealDocsUpload/);
    const upload = source("src/components/deal/deal-docs-upload.tsx");
    expect(upload).toMatch(/Attach documents to a deal/);
    expect(upload).not.toMatch(/Upload documents onto a deal/);
    expect(upload).toMatch(/space-y-6 p-8/);
    expect(upload).toMatch(/h-14/);
    expect(upload).toMatch(/w-\[17\.6rem\]/);
    expect(upload).not.toMatch(/space-y-3\.5 p-5/);
    expect(upload).not.toMatch(/space-y-2\.5 p-3/);
    expect(upload).not.toMatch(/h-full space-y-3 p-4/);
    expect(upload).not.toMatch(/sr-only/);
    expect(upload).toMatch(/uploadDealCtaLabel\("select"\)/);
    expect(upload).toMatch(/uploadDealCtaLabel\("create"\)/);
    expect(upload).toMatch(/deal-select-existing/);
    expect(upload).toMatch(/deal-create-from-search/);
    const strip = source("src/components/deals/today-activity-strip.tsx");
    expect(strip).toMatch(/Today/);
    expect(strip).toMatch(/formatTodayActivityDate/);
    expect(strip).toMatch(/todayActivityCalendarHref/);
    expect(strip).toMatch(/deal-today-calendar/);
    expect(strip).toMatch(/bg-transparent/);
    expect(strip).toMatch(/deal-today-heading/);
    expect(strip).toMatch(/inline-grid/);
    expect(strip).toMatch(/justify-items-center/);
    expect(strip).toMatch(/items-center/);
    expect(strip).toMatch(/text-center/);
    expect(strip).toMatch(/justify-center/);
    expect(strip).toMatch(/deal-today-chip/);
    expect(strip).toMatch(/text-base font-semibold/);
    expect(strip).toMatch(/text-\[16px\]/);
    expect(strip).toMatch(/text-\[23px\]/);
    expect(strip).toMatch(/size-6/);
    expect(strip).toMatch(/px-5 py-3/);
    expect(strip).toMatch(/mt-5/);
    expect(strip).toMatch(/py-8/);
    expect(strip).not.toMatch(/border-black/);
    expect(strip).not.toMatch(/bg-card/);
    expect(strip).not.toMatch(/mini-calendar|MiniCalendar/);
    const chrome = source("src/app/globals.css");
    expect(chrome).toMatch(/\.deal-today-chip/);
    expect(chrome).toMatch(/inset 0 2\.5px 0/);
    expect(chrome).toMatch(/translateY\(-7px\) scale\(1\.04\)/);
    expect(chrome).toMatch(/cubic-bezier\(0\.2, 0\.8, 0\.2, 1\)/);
    expect(chrome).toMatch(/linear-gradient/);
    expect(chrome).toMatch(/deal-today-heading/);
    expect(chrome).toMatch(/to bottom/);
    expect(chrome).toMatch(/0 6px 0 color-mix/);
    expect(chrome).toMatch(/0 12px 0 color-mix/);
    expect(chrome).toMatch(/0 8px 8px rgba\(16, 28, 52/);
    expect(chrome).toMatch(/0 20px 30px rgba\(16, 28, 52/);
    expect(chrome).toMatch(/0 36px 48px rgba\(16, 28, 52/);
    expect(chrome).toMatch(/\[data-testid="deal-docs-upload"\] \.ff-file-choose/);
    expect(chrome).toMatch(/height: 3\.5rem/);
    expect(chrome).not.toMatch(/inset 0 1\.5px 0/);
    expect(chrome).not.toMatch(/0 1px 0 rgba\(255, 255, 255/);
    expect(chrome).not.toMatch(/translateY\(-3px\)/);
    const chips = source("src/lib/deals/pipeline-desk.ts");
    expect(chips).toMatch(/label: "Calls"/);
    expect(chips).toMatch(/label: "Emails"/);
    expect(chips).toMatch(/label: "Tasks"/);
    expect(chips).toMatch(/label: "Meetings"/);
    expect(chips).toMatch(/label: "Training"/);
    expect(chips).not.toMatch(/id: "sms"/);
    expect(chips.indexOf('id: "call"')).toBeLessThan(chips.indexOf('id: "email"'));
    expect(chips.indexOf('id: "email"')).toBeLessThan(chips.indexOf('id: "task"'));
    expect(chips.indexOf('id: "task"')).toBeLessThan(chips.indexOf('id: "meeting"'));
    expect(DEAL_ACTIVITY_TONES.call.chipFg).toBe("#7A5C18");
    expect(DEAL_ACTIVITY_TONES.email.chipFg).toBe("#101C34");
    expect(DEAL_ACTIVITY_TONES.task.chipFg).toBe("#1d6fb8");
    expect(DEAL_ACTIVITY_TONES.meeting.chipFg).toBe("#5b21b6");
    expect(DEAL_ACTIVITY_TONES.training.chipFg).toBe("#0f766e");
  });

  it("puts phone and Call SMS Email Task Meeting under the deal name", () => {
    const table = source("src/components/deals/deals-table.tsx");
    expect(table).toMatch(/DealQuickActions/);
    expect(table).toMatch(/phone \|\| "—"/);
    expect(table).not.toMatch(/phone: phone \|\| "—"/);
    const quick = source("src/components/deals/deal-quick-actions.tsx");
    expect(quick).toMatch(/label="Call"/);
    expect(quick).toMatch(/\bSMS\b/);
    expect(quick).toMatch(/\bEmail\b/);
    expect(quick).toMatch(/\bTask\b/);
    expect(quick).toMatch(/MeetingButton/);
    expect(quick).not.toMatch(/label="Text"/);
    expect(quick).toMatch(/DEAL_TASK_ACTION_COLOR/);
    expect(quick).toMatch(/DEAL_MEETING_ACTION_COLOR/);
    expect(DEAL_TASK_ACTION_COLOR).toBe("#1d6fb8");
    expect(DEAL_MEETING_ACTION_COLOR).toBe("#5b21b6");
  });

  it("keeps Send quote, Change owner, and Bind policy on Comms and drops Text", () => {
    const actions = source("src/components/crm/deal-row-actions.tsx");
    expect(actions).toMatch(/Send quote/);
    expect(actions).toMatch(/\/compare/);
    expect(actions).toMatch(/ChangeOwnerDialog/);
    expect(actions).toMatch(/Bind policy/);
    expect(actions).toMatch(/requestBindSignature/);
    expect(actions).not.toMatch(/MeetingButton/);
    expect(actions).not.toMatch(/Add task/);
    expect(actions).not.toMatch(/DealRowComms/);
    expect(actions).not.toMatch(/Text/);
    const comms = source("src/components/deal-row-comms.tsx");
    expect(comms).not.toMatch(/label="Text"/);
  });

  it("places Contact second after Deal and removes the phone column", () => {
    const keys = (TABLE_COLUMNS.deals ?? []).map((column) => column.key);
    expect(keys[0]).toBe("title");
    expect(keys[1]).toBe("contact");
    expect(keys).not.toContain("phone");
    const visible = defaultVisibleIds(DEALS_LIST_COLUMNS);
    expect(visible[0]).toBe("pick");
    expect(visible[1]).toBe("title");
    expect(visible[2]).toBe("contact");
    expect(visible).not.toContain("phone");
    expect(allColumnIds(DEALS_LIST_COLUMNS)).not.toContain("phone");
    expect(normalizeDealsVisibleColumns(["pick", "title", "stage", "contact", "phone"])).toEqual([
      "pick",
      "title",
      "contact",
      "stage",
    ]);
  });

  it("keeps filters, pagination, Value, hydration, and owner transfer", () => {
    const table = source("src/components/deals/deals-table.tsx");
    expect(table).toMatch(/showMacrosLink=\{false\}/);
    expect(table).toMatch(/value: formatMoney\(value\)/);
    expect(table).toMatch(/sheetAttr/);
    expect(table).toMatch(/DealNextActionTimer/);
    expect(table).toMatch(/DealStaleBadge/);
    expect(table).toMatch(/comms: ""/);
    expect(source("src/components/lists/mass-update.tsx")).toMatch(/Mass update/);
    expect(source("src/components/developer-hub/list-selection.tsx")).toMatch(/list-select-matching/);
    expect(source("src/lib/desk/columns.ts")).toMatch(/key: "value", label: "Value"/);
    expect(source("src/lib/desk/columns.ts")).toMatch(/key: "nextAction", label: "Next"/);
    expect(source("src/components/lists/column-table.tsx")).toMatch(/ListPagination/);
    expect(source("src/lib/deals/transfer.ts")).toMatch(/Transfer this deal to \$\{target\}/);
  });

  it("uses live deal-name search on Deal, not an ASC/DESC funnel", () => {
    const deal = DEALS_LIST_COLUMNS.find((column) => column.id === "title");
    expect(deal?.label).toBe("Deal");
    expect(deal?.liveSearch).toBe(true);
    expect(isLiveSearchColumn(deal!)).toBe(true);
    expect(isListColumnSortable(deal!)).toBe(false);
    expect(source("src/components/lists/column-table.tsx")).toMatch(/LiveContainsInput/);
    expect(source("src/components/lists/column-table.tsx")).toMatch(/isLiveSearchColumn/);
  });
});
