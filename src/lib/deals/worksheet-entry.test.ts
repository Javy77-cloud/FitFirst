import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("lead + deal worksheet entry checklist", () => {
  it("removes Ask a teammate and Activity timeline from the lead page", () => {
    const src = readFileSync("src/app/leads/[id]/page.tsx", "utf8");
    const desk = readFileSync("src/components/leads/lead-detail-workspace.tsx", "utf8");
    expect(src).not.toMatch(/RecordAskPanel|AskOnRecord|ActivityTimeline/);
    expect(src).not.toMatch(/Ask a teammate/);
    expect(src).not.toMatch(/Activity timeline/);
    expect(src).toMatch(/utilityChrome/);
    const convertAt = desk.indexOf("data-ff-convert-deal");
    expect(convertAt).toBeGreaterThan(0);
    expect(desk.slice(convertAt, convertAt + 280)).toMatch(/>\s*Convert\s*</);
    expect(src).not.toMatch(/Start shop/);
    expect(src).not.toMatch(/Convert to deal/);
    expect(desk.slice(Math.max(0, convertAt - 180), convertAt)).not.toMatch(/variant="outline"/);
    expect(desk).toMatch(/data-ff-lead-layout="two-col"/);
    expect(src).toMatch(/View related deal/);
    expect(desk).toMatch(/LeadLineDocuments/);
    expect(src).not.toMatch(/source docs wait for the deal/i);
  });

  it("strips bind chrome from the deal worksheet top strip", () => {
    const src = readFileSync("src/app/deals/[id]/page.tsx", "utf8");
    expect(src).toMatch(/data-ff-deal-topband/);
    expect(src).toMatch(/data-ff-deal-top-left/);
    expect(src).toMatch(/data-ff-deal-right-rail/);
    expect(src).not.toMatch(/data-ff-deal-top-right/);
    expect(src).not.toMatch(/RecordDetailLayout/);
    expect(src).not.toMatch(/data-ff-deal-identity/);
    expect(src).not.toMatch(/RelatedRecordNav/);
    expect(src).not.toMatch(/View source lead/);
    expect(src).toMatch(/utilityChrome/);
    expect(src).toMatch(/QuickCommsBoard/);
    expect(src).not.toMatch(/bindDeal/);
    expect(src).not.toMatch(/Create personal contact|create Contact/);
    expect(src).not.toMatch(/Create commercial business|create Business/);
    expect(src).not.toMatch(/Business name|EIN \/ FEIN|Policy # at bind/);
    expect(src).not.toMatch(/Bind \(creates/);
  });

  it("keeps Open activities on the rail and off the documents main column", () => {
    const desk = readFileSync("src/components/deal/deal-upload-desk.tsx", "utf8");
    const rail = readFileSync("src/components/record-context/record-context-rail.tsx", "utf8");
    const deal = readFileSync("src/app/deals/[id]/page.tsx", "utf8");
    expect(desk).not.toMatch(/RailOpenActivities/);
    expect(desk).not.toMatch(/Open activities/);
    expect(rail).toMatch(/Open activities/);
    expect(deal).toMatch(/RecordContextRail/);
    expect(deal).toMatch(/QuickCommsBoard/);
  });

  it("uses a utility header flag instead of stripping chrome app-wide", () => {
    const shell = readFileSync("src/components/app-shell.tsx", "utf8");
    const header = readFileSync("src/components/desk-header.tsx", "utf8");
    const contacts = readFileSync("src/app/contacts/[id]/page.tsx", "utf8");
    expect(shell).toMatch(/utilityChrome/);
    expect(header).toMatch(/utilityChrome/);
    expect(header).toMatch(/data-ff-utility-chrome/);
    expect(header).not.toMatch(/Personal lines worksheet/);
    expect(contacts).not.toMatch(/utilityChrome/);
  });
});
