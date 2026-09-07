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

  it("keeps attach-documents on the left band, taller, with Activity centered in leftover space", () => {
    const page = source("src/app/deals/page.tsx");
    expect(page).toMatch(/deal-upload-activity/);
    expect(page).toMatch(/deal-attach-slot/);
    expect(page).toMatch(/deal-today-slot/);
    expect(page).toMatch(/w-\[min\(819px,44\.8%\)\]/);
    expect(page).not.toMatch(/w-\[min\(797px,43\.6%\)\]/);
    expect(page).not.toMatch(/justify-between/);
    expect(page).not.toMatch(/w-\[66%\]/);
    expect(page).not.toMatch(/max-w-\[66%\]/);
    expect(page).not.toMatch(/max-w-\[34%\]/);
    expect(page).not.toMatch(/flex-col/);
    expect(page).not.toMatch(/lg:flex-wrap/);
    expect(page).not.toMatch(/lg:grid-cols-12/);
    expect(page).not.toMatch(/lg:col-span-7/);
    expect(page).not.toMatch(/lg:col-span-5/);
    expect(page).not.toMatch(/lg:justify-start/);
    expect(page).not.toMatch(/justify-end/);
    expect(page).not.toMatch(/ml-auto/);
    expect(page).not.toMatch(/PipelineCreateDealForm/);
    expect(page).not.toMatch(/deal-name-typeahead/);
    expect(page).not.toMatch(/Deal name — Contact or Business/);
    expect(page.indexOf("<DealDocsUpload")).toBeLessThan(page.indexOf("<TodayActivityStrip"));
    expect(page).toMatch(/<TodayActivityStrip/);
    expect(page).toMatch(/<DealDocsUpload/);
    const upload = source("src/components/deal/deal-docs-upload.tsx");
    expect(upload).toMatch(/Attach documents to a deal/);
    expect(upload).not.toMatch(/Upload documents onto a deal/);
    expect(upload).toMatch(/h-\[168px\]/);
    expect(upload).not.toMatch(/h-\[120px\]/);
    expect(upload).toMatch(/flex-nowrap/);
    expect(upload).toMatch(/Store on this deal/);
    expect(upload).toMatch(/\+ Add another document/);
    expect(upload).toMatch(/deal-add-document/);
    expect(upload).toMatch(/deal-doc-filename/);
    expect(upload).toMatch(/deal-doc-row/);
    expect(upload).toMatch(/keepLabel/);
    expect(upload).toMatch(/FileDeleteIcon/);
    expect(upload).toMatch(/row\.fileName \|\| rows\.length > 1/);
    expect(upload).not.toMatch(/\+ Add file/);
    expect(upload).not.toMatch(/deal-add-file/);
    expect(upload).not.toMatch(/space-y-6 p-8/);
    expect(upload).not.toMatch(/h-14/);
    expect(upload).toMatch(/uploadDealCtaLabel\("select"\)/);
    expect(upload).toMatch(/uploadDealCtaLabel\("create"\)/);
    expect(upload).toMatch(/deal-select-existing/);
    expect(upload).toMatch(/deal-create-from-search/);
    const strip = source("src/components/deals/today-activity-strip.tsx");
    expect(strip).toMatch(/Today/);
    expect(strip).toMatch(/formatTodayActivityDate/);
    expect(strip).toMatch(/todayActivityCalendarHref/);
    expect(strip).toMatch(/deal-today-calendar/);
    expect(strip).toMatch(/deal-today-heading/);
    expect(strip).toMatch(/deal-today-chips/);
    expect(strip).toMatch(/inline-grid/);
    expect(strip).toMatch(/justify-items-center/);
    expect(strip).toMatch(/items-center/);
    expect(strip).toMatch(/text-center/);
    expect(strip).toMatch(/justify-center/);
    expect(strip).toMatch(/deal-today-item inline-flex shrink-0/);
    expect(strip).toMatch(/deal-today-chip/);
    expect(strip).toMatch(/deal-today-chip-count/);
    expect(strip).toMatch(/deal-today-chip-word/);
    expect(strip).not.toMatch(/deal-today-chip-label/);
    expect(strip).toMatch(/bg-transparent/);
    expect(strip).toMatch(/--chip-mid/);
    expect(strip).toMatch(/--chip-bottom/);
    expect(strip).toMatch(/text-base font-semibold/);
    expect(strip).toMatch(/text-\[16px\]/);
    expect(strip).toMatch(/size-6/);
    expect(strip).not.toMatch(/ff-card/);
    expect(strip).not.toMatch(/rounded-lg/);
    expect(strip).not.toMatch(/border-black/);
    expect(strip).not.toMatch(/mini-calendar|MiniCalendar/);
    const chrome = source("src/app/globals.css");
    expect(chrome).toMatch(/\.deal-upload-activity/);
    expect(chrome).toMatch(/flex-wrap: nowrap/);
    expect(chrome).toMatch(/align-items: center/);
    expect(chrome).toMatch(/\.deal-attach-slot/);
    expect(chrome).toMatch(/width: min\(819px, 44\.8%\)/);
    expect(chrome).not.toMatch(/width: min\(797px, 43\.6%\)/);
    expect(chrome).toMatch(/\.deal-today-slot \{[\s\S]*flex: 1;/);
    expect(chrome).toMatch(/justify-content: center/);
    expect(chrome).toMatch(/gap: 4px/);
    expect(chrome).toMatch(/\.deal-today-chip/);
    expect(chrome).toMatch(/overflow: visible/);
    expect(chrome).toMatch(/min-width: 100px/);
    expect(chrome).toMatch(/min-height: 100px/);
    expect(chrome).not.toMatch(/width: 60px/);
    expect(chrome).not.toMatch(/height: 60px/);
    expect(chrome).not.toMatch(/max-height: 60px/);
    expect(chrome).not.toMatch(/aspect-ratio: 1 \/ 1/);
    expect(chrome).not.toMatch(/width: 72px/);
    expect(chrome).not.toMatch(/height: 72px/);
    expect(chrome).toMatch(/border-radius: 12px/);
    expect(chrome).not.toMatch(/border-radius: 4px/);
    expect(chrome).toMatch(/background: none/);
    expect(chrome).toMatch(/translateY\(-6px\)/);
    expect(chrome).toMatch(/height: 168px/);
    expect(chrome).not.toMatch(/height: 120px/);
    expect(chrome).toMatch(/deal-today-heading/);
    expect(chrome).toMatch(/deal-today-chip-word/);
    expect(chrome).toMatch(/\.deal-today-chip-count \{[\s\S]*font-size: 24px;/);
    expect(chrome).toMatch(/\.deal-today-chip-count \{[\s\S]*font-weight: 500;/);
    expect(chrome).toMatch(/\.deal-today-chip-count \{[\s\S]*color: color-mix\(in srgb, var\(--chip-fg, currentColor\) 78%, #ffffff\);/);
    expect(chrome).not.toMatch(/\.deal-today-chip-count \{[\s\S]*font-size: 28px;/);
    expect(chrome).not.toMatch(/\.deal-today-chip-count \{[\s\S]*font-weight: 800;/);
    expect(chrome).not.toMatch(/\.deal-today-chip-count \{[^}]*#101c34/);
    expect(chrome).toMatch(/\[data-testid="deal-docs-upload"\]/);
    expect(chrome).toMatch(/border-radius: var\(--radius\)/);
    expect(chrome).toMatch(/linear-gradient/);
    expect(chrome).toMatch(/\[data-testid="deal-docs-upload"\] \.ff-file-delete/);
    expect(chrome).toMatch(/margin-left: 0/);
    expect(chrome).not.toMatch(/margin-left: 24px/);
    expect(chrome).not.toMatch(/height: 36px/);
    expect(chrome).not.toMatch(/translateY\(-2px\)/);
    expect(chrome).not.toMatch(/translateY\(-4px\)/);
    expect(chrome).not.toMatch(/translateY\(-7px\)/);
    expect(chrome).not.toMatch(/scale\(1\.04\)/);
    const chips = source("src/lib/deals/pipeline-desk.ts");
    expect(chips).toMatch(/label: "Phone"/);
    expect(chips).toMatch(/label: "SMS"/);
    expect(chips).toMatch(/label: "Task"/);
    expect(chips).toMatch(/label: "Meeting"/);
    expect(chips).toMatch(/label: "Training"/);
    expect(chips).not.toMatch(/label: "Calls"/);
    expect(chips).not.toMatch(/label: "Emails"/);
    expect(chips).not.toMatch(/id: "sms"/);
    expect(chips.indexOf('id: "call"')).toBeLessThan(chips.indexOf('id: "email"'));
    expect(chips.indexOf('id: "email"')).toBeLessThan(chips.indexOf('id: "task"'));
    expect(chips.indexOf('id: "task"')).toBeLessThan(chips.indexOf('id: "meeting"'));
    expect(DEAL_ACTIVITY_TONES.call.chipFg).toBe("#7A5C18");
    expect(DEAL_ACTIVITY_TONES.email.chipFg).toBe("#101C34");
    expect(DEAL_ACTIVITY_TONES.task.chipFg).toBe("#1d6fb8");
    expect(DEAL_ACTIVITY_TONES.meeting.chipFg).toBe("#5b21b6");
    expect(DEAL_ACTIVITY_TONES.training.chipFg).toBe("#0f766e");
    expect(DEAL_ACTIVITY_TONES.call.chipBgDark).toBe("#eadfb8");
    expect(DEAL_ACTIVITY_TONES.email.chipBgDark).toBe("#c8cdd6");
    expect(DEAL_ACTIVITY_TONES.task.chipBgDark).toBe("#b6d4f5");
    expect(DEAL_ACTIVITY_TONES.meeting.chipBgDark).toBe("#d4c6f5");
    expect(DEAL_ACTIVITY_TONES.training.chipBgDark).toBe("#9ee0d4");
    expect(DEAL_ACTIVITY_TONES.call.chipBgDark).not.toBe("#c9b36a");
    expect(DEAL_ACTIVITY_TONES.training.chipBgDark).not.toBe("#4db8a4");
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

  it("does not render an idle next-action / call-duration timer on pipeline list rows", () => {
    const dealsTable = source("src/components/deals/deals-table.tsx");
    const pipelineTable = source("src/components/pipeline/table-view.tsx");
    expect(dealsTable).not.toMatch(/DealNextActionTimer/);
    expect(dealsTable).not.toMatch(/deal-next-action/);
    expect(dealsTable).not.toMatch(/setInterval/);
    expect(pipelineTable).not.toMatch(/DealNextActionTimer/);
    expect(pipelineTable).not.toMatch(/deal-next-action/);
    expect(pipelineTable).not.toMatch(/nextDealActionAt/);
    expect(pipelineTable).not.toMatch(/setInterval/);
    expect(dealsTable).toMatch(/DealQuickActions/);
    expect(pipelineTable).toMatch(/DealQuickActions/);
    const quick = source("src/components/deals/deal-quick-actions.tsx");
    expect(quick).toMatch(/label="Call"/);
    expect(quick).not.toMatch(/DealNextActionTimer/);
    const timer = source("src/components/deals/deal-next-action.tsx");
    expect(timer).toMatch(/if \(!dueAt\)/);
    expect(timer).toMatch(/setInterval/);
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

  it("removes the Contact column and keeps Phone as a deal field", () => {
    const keys = (TABLE_COLUMNS.deals ?? []).map((column) => column.key);
    expect(keys[0]).toBe("title");
    expect(keys[1]).toBe("stage");
    expect(keys).not.toContain("contact");
    expect(keys).toContain("phone");
    expect(keys).not.toContain("esign");
    expect(keys).not.toContain("comms");
    const visible = defaultVisibleIds(DEALS_LIST_COLUMNS);
    expect(visible[0]).toBe("pick");
    expect(visible[1]).toBe("title");
    expect(visible[2]).toBe("stage");
    expect(visible).not.toContain("contact");
    expect(visible).toContain("phone");
    expect(allColumnIds(DEALS_LIST_COLUMNS)).toContain("phone");
    expect(allColumnIds(DEALS_LIST_COLUMNS)).not.toContain("contact");
    expect(normalizeDealsVisibleColumns(["pick", "title", "stage", "contact", "phone", "esign"])).toEqual([
      "pick",
      "title",
      "stage",
      "phone",
    ]);
  });

  it("keeps filters, pagination, Value, hydration, and owner transfer", () => {
    const table = source("src/components/deals/deals-table.tsx");
    expect(table).toMatch(/showMacrosLink=\{false\}/);
    expect(table).toMatch(/dealNativeColumnText\("value"/);
    expect(table).toMatch(/sheetAttr/);
    expect(table).not.toMatch(/DealNextActionTimer/);
    expect(table).toMatch(/DealStaleBadge/);
    expect(table).toMatch(/DealStageSelect/);
    expect(source("src/components/deals/deal-stage-select.tsx")).toMatch(/statusColorClass/);
    expect(source("src/components/deals/deal-stage-select.tsx")).toMatch(/stageColorFromNameOrSlug/);
    expect(table).toMatch(/tags: tagSortText\(deal\.tags\)/);
    expect(table).toMatch(/dealRecordPhone/);
    expect(table).not.toMatch(/comms: ""/);
    expect(table).not.toMatch(/formatInDeskEsignList/);
    expect(source("src/components/lists/mass-update.tsx")).toMatch(/Mass update/);
    expect(source("src/components/developer-hub/list-selection.tsx")).toMatch(/list-select-matching/);
    expect(source("src/lib/desk/columns.ts")).toMatch(/key: "value", label: "Value"/);
    expect(source("src/lib/desk/columns.ts")).not.toMatch(/key: "nextAction", label: "Next"/);
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
