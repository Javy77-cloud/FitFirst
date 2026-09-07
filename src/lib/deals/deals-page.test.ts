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
  });

  it("shrinks attach-documents and adds a transparent centered Today's Activity strip", () => {
    const page = source("src/app/deals/page.tsx");
    expect(page).toMatch(/lg:grid-cols-3/);
    expect(page).toMatch(/lg:col-span-2/);
    expect(page).toMatch(/<TodayActivityStrip/);
    expect(page).toMatch(/<DealDocsUpload/);
    const upload = source("src/components/deal/deal-docs-upload.tsx");
    expect(upload).toMatch(/Attach documents to a deal/);
    expect(upload).not.toMatch(/Upload documents onto a deal/);
    expect(upload).toMatch(/uploadDealCtaLabel\("select"\)/);
    expect(upload).toMatch(/uploadDealCtaLabel\("create"\)/);
    expect(upload).toMatch(/deal-select-existing/);
    expect(upload).toMatch(/deal-create-from-search/);
    const strip = source("src/components/deals/today-activity-strip.tsx");
    expect(strip).toMatch(/Today/);
    expect(strip).toMatch(/bg-transparent/);
    expect(strip).toMatch(/items-center/);
    expect(strip).toMatch(/justify-center/);
    expect(strip).toMatch(/hover:-translate-y/);
    expect(strip).toMatch(/text-\[16px\]/);
    expect(strip).not.toMatch(/bg-card/);
    expect(strip).not.toMatch(/mini-calendar|MiniCalendar/);
    const chips = source("src/lib/deals/pipeline-desk.ts");
    expect(chips).toMatch(/label: "Tasks"/);
    expect(chips).toMatch(/label: "Calls"/);
    expect(chips).toMatch(/label: "Emails"/);
    expect(chips).toMatch(/label: "Meetings"/);
    expect(chips).toMatch(/label: "Training"/);
    expect(chips).toMatch(/tone: "blue"/);
    expect(chips).toMatch(/tone: "green"/);
    expect(chips).toMatch(/tone: "amber"/);
    expect(chips).toMatch(/tone: "purple"/);
    expect(chips).toMatch(/tone: "teal"/);
    expect(DEAL_ACTIVITY_TONES.task.chipFg).toBe("#1d4e89");
    expect(DEAL_ACTIVITY_TONES.call.chipFg).toBe("#1f7a4d");
    expect(DEAL_ACTIVITY_TONES.email.chipFg).toBe("#8a6500");
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
    expect(actions).toMatch(/#bind/);
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
