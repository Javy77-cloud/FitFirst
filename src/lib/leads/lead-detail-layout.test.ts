import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("lead detail layout + per-line documents", () => {
  it("keeps a two-column desk that does not stack at normal widths", () => {
    const page = source("src/app/leads/[id]/page.tsx");
    const desk = source("src/components/leads/lead-detail-workspace.tsx");
    const form = source("src/components/crm/lead-form-fields.tsx");
    expect(page).toMatch(/title="Leads"/);
    expect(page).toMatch(/showBrand=\{false\}/);
    expect(page).not.toMatch(/Personal Lines Worksheet/);
    const header = source("src/components/desk-header.tsx");
    expect(header).not.toMatch(/Personal lines worksheet/);
    expect(header).toMatch(/\{title\}/);
    expect(header).toMatch(/showBrand/);
    expect(page).toMatch(/View related deal/);
    expect(page).toMatch(/LeadDetailWorkspace/);
    expect(page).not.toMatch(/uploadDocument/);
    expect(desk).toMatch(/data-ff-lead-layout="two-col"/);
    expect(desk).toMatch(/grid-cols-\[minmax\(0,2fr\)_minmax\(0,3fr\)\]/);
    expect(desk).not.toMatch(/lg:grid-cols/);
    expect(form).toMatch(/data-ff-lead-contact-row/);
    expect(form).toMatch(/data-ff-lead-address-row/);
    expect(form).toMatch(/grid-cols-\[minmax\(0,2\.2fr\)_minmax\(0,1\.1fr\)_4\.5rem_5\.5rem\]/);
    expect(form).toMatch(/grid-cols-2 gap-3" data-ff-lead-contact-row/);
  });

  it("uses one add-line dropdown that creates cards — not a second control at the bottom", () => {
    const panel = source("src/components/leads/lead-line-documents.tsx");
    const form = source("src/components/crm/lead-form-fields.tsx");
    const page = source("src/app/leads/[id]/page.tsx");
    expect(panel).toMatch(/data-ff-lead-line-docs/);
    expect(panel).toMatch(/data-ff-line-card/);
    expect(panel).toMatch(/data-ff-add-line/);
    expect(panel).toMatch(/aria-label="Add line"/);
    expect(panel).toMatch(/Add a line of interest\./);
    expect(panel).toMatch(/data-ff-add-line-empty/);
    expect(panel).toMatch(/FileDeleteIcon/);
    expect(panel).toMatch(/data-ff-line-card-delete/);
    expect(panel).toMatch(/onRemove/);
    expect(panel).not.toMatch(/Add another line/);
    expect(page).not.toMatch(/<LineSelect/);
    expect(page).not.toMatch(/from "@\/components\/crm\/line-select"/);
    expect(page).toMatch(/hideLineSelect/);
    expect(form).toMatch(/hideLineSelect/);
  });

  it("gives each line its own drop zone, Choose file button, add-file slot, and instant trash", () => {
    const panel = source("src/components/leads/lead-line-documents.tsx");
    const picker = source("src/components/choose-file-button.tsx");
    expect(panel).toMatch(/data-ff-line-dropzone/);
    expect(panel).toMatch(/ChooseFileButton/);
    expect(panel).toMatch(/\+ Add file/);
    expect(panel).toMatch(/FileActionMenu/);
    expect(panel).toMatch(/FileDeleteIcon|FileActionMenu/);
    expect(panel).toMatch(/ff-file-row/);
    expect(panel).toMatch(/title=\{doc\.filename\}/);
    expect(panel).toMatch(/truncate whitespace-nowrap/);
    expect(panel).not.toMatch(/uploadDocument/);
    expect(panel).not.toMatch(/>\s*Upload\s*</);
    expect(picker).toMatch(/Choose file/);
    expect(picker).toMatch(/ff-file-choose/);
    expect(picker).toMatch(/sr-only/);
    expect(picker).toMatch(/fileName \|\| "Choose file"/);
  });

  it("keeps Save lead and Convert on one compact right-aligned row, then toasts and leaves the form", () => {
    const desk = source("src/components/leads/lead-detail-workspace.tsx");
    const save = source("src/app/actions/record-edit.ts");
    expect(desk).toMatch(/data-ff-lead-actions/);
    expect(desk).toMatch(/justify-end/);
    expect(desk).toMatch(/variant="link"/);
    expect(desk).toMatch(/Save lead/);
    expect(desk).toMatch(/data-ff-convert-deal/);
    expect(desk).toMatch(/>\s*Convert\s*</);
    expect(desk).not.toMatch(/FormPrimaryActions/);
    expect(desk).not.toMatch(/ff-convert-action/);
    expect(desk).not.toMatch(/ff-primary-action/);
    expect(save).toMatch(/flashAction\("\/leads", "lead-saved"\)/);
  });

  it("keeps Call SMS Email Task in the global top bar, not as local lead-form pills", () => {
    const page = source("src/app/leads/[id]/page.tsx");
    const desk = source("src/components/leads/lead-detail-workspace.tsx");
    const header = source("src/components/desk-header.tsx");
    const shell = source("src/components/app-shell.tsx");
    const quick = source("src/components/desk/header-record-actions.tsx");
    expect(page).toMatch(/<h1 className="text-xl font-semibold text-navy">\{formatPersonName\(lead\)\}<\/h1>/);
    expect(page).toMatch(/showBrand=\{false\}/);
    expect(page).toMatch(/title="Leads"/);
    expect(page).toMatch(/recordContext=\{\{/);
    expect(page).toMatch(/leadId: lead\.id/);
    expect(page).not.toMatch(/LeadHeaderActions/);
    expect(page).not.toMatch(/RecordQuickActions/);
    expect(page).not.toMatch(/data-ff-lead-header-actions/);
    expect(desk).not.toMatch(/LeadHeaderActions|RecordQuickActions|\bCall\b/);
    expect(header).toMatch(/<HeaderRecordActions record=\{recordContext\} \/>/);
    expect(header).toMatch(/HeaderRecordActions[\s\S]*NotificationBell/);
    expect(shell).toMatch(/recordContext=\{recordContext\}/);
    expect(quick).toMatch(/data-ff-header-record-actions/);
    expect(quick).toMatch(/data-ff-header-action=\{action\.kind\}/);
    expect(quick).toMatch(/openComposer\(action\.kind\)/);
    expect(quick).toMatch(/CallComposer|Log call/);
    expect(quick).toMatch(/SmsComposer|Queue SMS/);
    expect(quick).toMatch(/EmailComposer|Queue email/);
    expect(quick).toMatch(/TaskComposer|Save task/);
    expect(quick).toMatch(/ActivityRecordPicker/);
    expect(quick).not.toMatch(/disabled=\{!/);
  });

  it("groups carried files by line on the deal and links back to the source lead", () => {
    const deal = source("src/app/deals/[id]/page.tsx");
    const docs = source("src/components/deal/documents-panel.tsx");
    const convert = source("src/app/actions/crm.ts");
    expect(deal).toMatch(/DealDetailsPanel/);
    expect(docs).toMatch(/data-ff-deal-docs-by-line/);
    expect(docs).toMatch(/groupDocsByLine/);
    expect(convert).toMatch(/shopLinesForConvertWithDocs/);
    expect(convert).toMatch(/parseSelectedShopLines/);
    expect(convert).toMatch(/leadDocs/);
    expect(convert).toMatch(/set\(\{ dealId: deal\.id, riskId: risk\.id \}\)/);
  });
});
