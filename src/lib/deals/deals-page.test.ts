import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("Deals page sep7c", () => {
  it("titles the page Pipeline and drops Pipeline from the view switcher", () => {
    const page = source("src/app/deals/page.tsx");
    expect(page).toMatch(/title="Pipeline"/);
    expect(page).not.toMatch(/title="Deals"/);
    expect(page).toMatch(/eyebrow=""/);
    expect(page).not.toMatch(/Personal Lines Worksheet/);
    const bar = source("src/components/deals/deal-workspace-bar.tsx");
    expect(bar).toMatch(/aria-label="Table Board Funnel"/);
    expect(bar).not.toMatch(/>\s*Pipeline\s*</);
    expect(bar).toMatch(/\["table", "Table"\]/);
    expect(bar).toMatch(/\["board", "Board"\]/);
    expect(bar).toMatch(/\["funnel", "Funnel"\]/);
  });

  it("shrinks attach-documents and adds a one-row Today's activity strip", () => {
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
    expect(strip).toMatch(/DEAL_TODAY_ACTIVITY_CHIPS/);
    expect(strip).not.toMatch(/mini-calendar|MiniCalendar/);
    const chips = source("src/lib/deals/pipeline-desk.ts");
    expect(chips).toMatch(/label: "Tasks"/);
    expect(chips).toMatch(/label: "Calls"/);
    expect(chips).toMatch(/label: "Emails"/);
    expect(chips).toMatch(/label: "Meetings"/);
    expect(chips).toMatch(/label: "Training"/);
  });

  it("puts phone and Call SMS Email Task under the deal name", () => {
    const table = source("src/components/deals/deals-table.tsx");
    expect(table).toMatch(/DealQuickActions/);
    expect(table).toMatch(/deal-quick-actions|phone \|\| "—"/);
    const quick = source("src/components/desk/record-quick-actions.tsx");
    expect(source("src/components/deals/deal-quick-actions.tsx")).toMatch(/RecordQuickActions/);
    expect(quick).toMatch(/label="Call"/);
    expect(quick).toMatch(/\bSMS\b/);
    expect(quick).toMatch(/\bEmail\b/);
    expect(quick).toMatch(/\bTask\b/);
    expect(quick).not.toMatch(/label="Text"/);
  });

  it("keeps Send quote, Change owner, and Meeting on Comms and drops Text", () => {
    const actions = source("src/components/crm/deal-row-actions.tsx");
    expect(actions).toMatch(/Send quote/);
    expect(actions).toMatch(/\/compare/);
    expect(actions).toMatch(/ChangeOwnerDialog/);
    expect(actions).toMatch(/MeetingButton/);
    expect(actions).not.toMatch(/Add task/);
    expect(actions).not.toMatch(/DealRowComms/);
    expect(actions).not.toMatch(/Text/);
    const comms = source("src/components/deal-row-comms.tsx");
    expect(comms).not.toMatch(/label="Text"/);
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
});
