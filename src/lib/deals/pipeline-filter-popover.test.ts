import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { filterStorageKey } from "@/lib/saved-filters";
import {
  DEAL_PIPELINE_FILTER_KEYS,
  DEAL_PIPELINE_PRESERVE_PARAMS,
  matchesDealPipelineColumnFilters,
} from "@/lib/deals/pipeline-column-filters";
import {
  RENEWAL_PIPELINE_FILTER_KEYS,
  RENEWAL_PIPELINE_PRESERVE_PARAMS,
  matchesRenewalDaysBand,
} from "@/lib/renewal/pipeline-column-filters";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("Pipeline filter popover chrome", () => {
  it("wires PipelineFilterPopover on deals and renewals desks", () => {
    const deals = source("src/app/deals/page.tsx");
    const desk = source("src/components/renewals/renewals-desk.tsx");
    const popover = source("src/components/filters/pipeline-filter-popover.tsx");
    expect(deals).toMatch(/PipelineFilterPopover/);
    expect(deals).toMatch(/moduleId="deals-pipeline"/);
    expect(deals).toMatch(/DEAL_PIPELINE_PRESERVE_PARAMS/);
    expect(desk).toMatch(/PipelineFilterPopover/);
    expect(desk).toMatch(/moduleId="renewals-pipeline"/);
    expect(desk).toMatch(/RENEWAL_PIPELINE_PRESERVE_PARAMS/);
    expect(popover).toMatch(/Filter/);
    expect(popover).toMatch(/Saved/);
    expect(popover).toMatch(/Clear/);
    expect(popover).toMatch(/Save As/);
    expect(popover).toMatch(/FileDeleteIcon/);
    expect(popover).toMatch(/<option value="">None<\/option>/);
    expect(popover).not.toMatch(/PageFiltersBar/);
    expect(popover).toMatch(/configureSlot/);
    expect(popover).toMatch(/onConfigure/);
    expect(popover).toMatch(/Configure filters/);
    expect(deals).toMatch(/canConfigure=\{session\.isAdmin\}/);
    expect(deals).toMatch(/data-ff-pipeline-filter-chrome/);
    expect(deals).toMatch(/data-ff-deals-list-actions/);
    expect(deals).toMatch(/<AddNewDealDialog/);
    expect(deals).toMatch(/prefs: pageFilterPrefs/);
    expect(desk).toMatch(/canConfigure=\{canEditStages\}/);
    expect(desk).toMatch(/buildRenewalPipelineFilterFields\(cards, pageFilterPrefs\)/);
  });

  it("keeps deals and renewals saved-filter storage keys separate", () => {
    expect(filterStorageKey("deals-pipeline")).toBe("ff-saved-filters:v1:deals-pipeline");
    expect(filterStorageKey("renewals-pipeline")).toBe("ff-saved-filters:v1:renewals-pipeline");
    expect(filterStorageKey("deals-pipeline")).not.toBe(filterStorageKey("renewals-pipeline"));
  });

  it("Clear preserve lists keep pipeline/view (and book/queue subs)", () => {
    expect(DEAL_PIPELINE_PRESERVE_PARAMS).toEqual(
      expect.arrayContaining(["pipeline", "view", "book", "queue", "pcSub"]),
    );
    expect(RENEWAL_PIPELINE_PRESERVE_PARAMS).toEqual(
      expect.arrayContaining(["pipeline", "view", "book", "queue", "pcSub"]),
    );
    for (const key of DEAL_PIPELINE_FILTER_KEYS) {
      expect(DEAL_PIPELINE_PRESERVE_PARAMS).not.toContain(key);
    }
    for (const key of RENEWAL_PIPELINE_FILTER_KEYS) {
      expect(RENEWAL_PIPELINE_PRESERVE_PARAMS).not.toContain(key);
    }
    const popover = source("src/components/filters/pipeline-filter-popover.tsx");
    expect(popover).toMatch(/preservedFromUrl/);
    expect(popover).toMatch(/clearFilters/);
    expect(popover).toMatch(/setLiveQuery\(moduleId, ""\)/);
  });

  it("matches deal column filters without inventing values", () => {
    const deal = {
      pipelineStage: "shopping",
      pipelineStageSlug: "gather",
      lineOfBusiness: "HO",
      policySubType: "HO3",
      source: "referral",
      ownerId: "agent-1",
      tags: ["Hot"],
      currentCarrier: "Citizens",
    };
    expect(matchesDealPipelineColumnFilters(deal, { line: "HO" })).toBe(true);
    expect(matchesDealPipelineColumnFilters(deal, { line: "AUTO" })).toBe(false);
    expect(matchesDealPipelineColumnFilters(deal, { source: "referral", tags: "Hot" })).toBe(true);
    expect(matchesDealPipelineColumnFilters(deal, { assigned: "agent-2" })).toBe(false);
    expect(matchesDealPipelineColumnFilters(deal, { stage: "gather" })).toBe(true);
  });


  it("never pulls renewals list / column-prefs into the client filtered-views module", () => {
    const views = source("src/components/renewals/renewals-filtered-views.tsx");
    expect(views).toMatch(/^"use client";/m);
    expect(views).not.toMatch(/renewals-list/);
    expect(views).not.toMatch(/desk-column-table/);
    expect(views).not.toMatch(/column-prefs/);
    expect(views).not.toMatch(/next\/headers/);
    expect(views).not.toMatch(/currentDeskSession/);
  });

  it("matches renewals days bands", () => {
    expect(matchesRenewalDaysBand(-3, "overdue")).toBe(true);
    expect(matchesRenewalDaysBand(10, "0-30")).toBe(true);
    expect(matchesRenewalDaysBand(45, "31-60")).toBe(true);
    expect(matchesRenewalDaysBand(45, "0-30")).toBe(false);
  });
});
