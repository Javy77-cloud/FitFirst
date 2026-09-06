import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("lead detail layout + per-line documents", () => {
  it("keeps person fields on the left and line files on the right", () => {
    const page = readFileSync("src/app/leads/[id]/page.tsx", "utf8");
    const form = readFileSync("src/components/crm/lead-form-fields.tsx", "utf8");
    const panel = readFileSync("src/components/leads/lead-line-documents.tsx", "utf8");
    expect(page).toMatch(/data-ff-lead-layout="two-col"/);
    expect(page).toMatch(/LeadLineDocuments/);
    expect(page).toMatch(/View related deal/);
    expect(page).not.toMatch(/uploadDocument/);
    expect(form).toMatch(/data-ff-lead-contact-row/);
    expect(form).toMatch(/data-ff-lead-address-row/);
    expect(form).toMatch(/grid-cols-\[minmax\(0,2\.2fr\)_minmax\(0,1\.1fr\)_4\.5rem_5\.5rem\]/);
    expect(panel).toMatch(/data-ff-lead-line-docs/);
    expect(panel).toMatch(/data-ff-line-dropzone/);
    expect(panel).toMatch(/\+ Add file/);
    expect(panel).toMatch(/icon/);
    expect(panel).toMatch(/lineTag|line:\$\{line\}|`line:\$\{line\}`/);
    expect(panel).not.toMatch(/uploadDocument/);
  });

  it("groups carried files by line on the deal and links back to the source lead", () => {
    const deal = readFileSync("src/app/deals/[id]/page.tsx", "utf8");
    const docs = readFileSync("src/components/deal/documents-panel.tsx", "utf8");
    const convert = readFileSync("src/app/actions/crm.ts", "utf8");
    expect(deal).toMatch(/View source lead/);
    expect(docs).toMatch(/data-ff-deal-docs-by-line/);
    expect(docs).toMatch(/groupDocsByLine/);
    expect(convert).toMatch(/shopLinesForConvertWithDocs/);
    expect(convert).toMatch(/leadDocs/);
    expect(convert).toMatch(/set\(\{ dealId: deal\.id, riskId: risk\.id \}\)/);
  });
});
