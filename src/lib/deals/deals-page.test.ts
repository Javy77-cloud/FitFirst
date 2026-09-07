import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("Deals page sep6z", () => {
  it("titles the page Deals and drops the worksheet eyebrow", () => {
    const page = source("src/app/deals/page.tsx");
    expect(page).toMatch(/title="Deals"/);
    expect(page).toMatch(/eyebrow=""/);
    expect(page).not.toMatch(/Personal Lines Worksheet/);
    expect(page).not.toMatch(/DealStageChips/);
    expect(page).toMatch(/<DealDocsUpload/);
  });

  it("keeps one upload block and a Pipeline view switcher", () => {
    const page = source("src/app/deals/page.tsx");
    expect(page).toMatch(/<div className="mb-4">[\s\S]*<DealDocsUpload/);
    expect(page).toMatch(/<DealDocsUpload[\s\S]*\{view === "table"/);
    const bar = source("src/components/deals/deal-workspace-bar.tsx");
    expect(bar).toMatch(/aria-label="Pipeline"/);
    expect(bar).toMatch(/>\s*Pipeline\s*</);
    expect(bar).toMatch(/\["table", "Table"\]/);
    expect(bar).toMatch(/\["board", "Board"\]/);
    expect(bar).toMatch(/\["funnel", "Funnel"\]/);
    const table = source("src/components/deals/deals-table.tsx");
    expect(table).toMatch(/showMacrosLink=\{false\}/);
    expect(table).not.toMatch(/Settings · Macros/);
  });

  it("uses a Choose file button, trash delete, and + Add file", () => {
    const upload = source("src/components/deal/deal-docs-upload.tsx");
    expect(upload).toMatch(/Search deals/);
    expect(upload).toMatch(/Choose file|ChooseFileButton/);
    expect(upload).not.toMatch(/Choose Files/);
    expect(upload).toMatch(/\+ Add file/);
    expect(upload).toMatch(/FileDeleteIcon|Trash2/);
    expect(upload).toMatch(/setLiveQuery\("deals"/);
  });

  it("hides Settings · Macros on the deals table and adds Value", () => {
    const table = source("src/components/deals/deals-table.tsx");
    expect(table).toMatch(/showMacrosLink=\{false\}/);
    expect(table).toMatch(/value: formatMoney\(value\)/);
    expect(table).toMatch(/sheetAttr/);
    expect(table).toMatch(/Change owner|users=\{agents\}/);
    expect(source("src/lib/desk/columns.ts")).toMatch(/key: "value", label: "Value"/);
  });

  it("lights Call SMS Text only with a phone, Email with an email", () => {
    const comms = source("src/components/deal-row-comms.tsx");
    expect(comms).toMatch(/enabled=\{hasPhone\}/);
    expect(comms).toMatch(/enabled=\{hasEmail\}/);
    expect(comms).toMatch(/label="Call"/);
    expect(comms).toMatch(/label="SMS"/);
    expect(comms).toMatch(/label="Text"/);
    const actions = source("src/components/crm/deal-row-actions.tsx");
    expect(actions).toMatch(/Send quote/);
    expect(actions).toMatch(/Add task/);
    expect(actions).toMatch(/ChangeOwnerDialog/);
  });
});
