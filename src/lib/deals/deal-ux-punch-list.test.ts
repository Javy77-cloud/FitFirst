import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DealPackageShell } from "@/components/deal/deal-package-shell";
import {
  convertActivityLineLabel,
  convertActivityTitle,
  pipelineSlugForLine,
  relabelConvertActivityTitle,
} from "@/lib/crm/convert";
import { dealStageView } from "@/lib/deals/deal-columns";
import {
  formatHeaderDob,
  uniqueDisplayPhones,
} from "@/lib/deals/header-addresses";
import { humanizeDealStage } from "@/lib/deals/package-lines";
import { defaultStageColor } from "@/lib/desk/status-colors";
import { pipelineSlugForLine as shopPipelineSlugForLine } from "@/lib/lifecycle/shop";
import { LIFE_HEALTH_STAGES, PC_SHOPPING_STAGES, SEEDED_PIPELINES } from "@/lib/wire/pipeline";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("deal UX punch list", () => {
  it("defers Add New Deal insert until Save Deal on /deals/new", () => {
    const dialog = source("src/components/deals/add-new-deal-dialog.tsx");
    const page = source("src/app/deals/new/page.tsx");
    const seed = source("src/lib/deals/new-deal-seed.ts");
    const scratch = source("src/app/actions/deal-create.ts");
    const save = source("src/app/actions/crm.ts");
    expect(dialog).toMatch(/newDealCreateHref/);
    expect(dialog).not.toMatch(/createDealFromScratch/);
    expect(dialog).not.toMatch(/createDealFromExistingPick/);
    expect(page).toMatch(/createDeal/);
    expect(page).toMatch(/Save Deal/);
    expect(page).not.toMatch(/\.insert\(/);
    expect(seed).not.toMatch(/\.insert\(/);
    expect(source("src/lib/desk/quick-actions.ts")).toMatch(/\/deals\/new/);
    expect(source("src/components/contacts/contact-deal-rows.tsx")).toMatch(/\/deals\/new\?contactId=/);
    const scratchFn = scratch.slice(
      scratch.indexOf("export async function createDealFromScratch"),
      scratch.indexOf("export async function createDealFromScratchAction"),
    );
    expect(scratchFn).toMatch(/newDealCreateHref/);
    expect(scratchFn).not.toMatch(/\.insert\(/);
    expect(save).toMatch(/export async function createDeal/);
    expect(save).toMatch(/\.insert\(deals\)/);
  });

  it("keeps header columns name/stage · phones/owner · dob/activity · insured/mailing", () => {
    const html = renderToString(
      createElement(DealPackageShell, {
        name: "Gloria Martinez",
        phones: ["786-555-0100"],
        dob: "1980-01-02",
        insuredAddress: { address1: "12 Oak St", city: "Palm Bay", state: "FL", zip: "32909" },
        mailingAddress: { address1: "88 Pine Ave", city: "Orlando", state: "FL", zip: "32801" },
        stage: "gather",
        owner: "Javy",
        activity: "Quote sent",
      }),
    );
    expect(html).toMatch(/data-ff-header-col="1"/);
    expect(html).toMatch(/data-ff-header-col="4"/);
    expect(html.indexOf("Gloria Martinez")).toBeLessThan(html.indexOf("Gathering"));
    expect(html.indexOf("Gathering")).toBeLessThan(html.indexOf("786-555-0100"));
    expect(html.indexOf("Insured address")).toBeLessThan(html.indexOf("Mailing address"));
    expect(html.indexOf("Gathering")).toBeLessThan(html.indexOf("Mailing address"));
    expect(formatHeaderDob("1980-01-02")).toBe("01/02/1980");
    expect(html).toContain("01/02/1980");
  });

  it("dedupes header phones by normalized digits", () => {
    expect(uniqueDisplayPhones(["(321) 555-0100", "321-555-0100"])).toEqual(["(321) 555-0100"]);
    expect(uniqueDisplayPhones(["321-555-0100", "407-555-0199"])).toEqual([
      "321-555-0100",
      "407-555-0199",
    ]);
  });

  it("labels Life convert activity as Life / Term Life, not Homeowners", () => {
    expect(
      convertActivityTitle({
        lineOfBusiness: "LIFE",
        quotingForm: "Term Life",
        policySubType: "Term Life",
      }),
    ).toBe("Lead converted · Life / Term Life");
    expect(
      relabelConvertActivityTitle("Lead converted · Tyler Bathel / Homeowners", {
        lineOfBusiness: "LIFE",
        quotingForm: "Term Life",
        policySubType: "Term Life",
      }),
    ).toBe("Lead converted · Life / Term Life");
    expect(convertActivityLineLabel({ lineOfBusiness: "FLOOD", quotingForm: "FLOOD" })).toBe(
      "Flood",
    );
    expect(source("src/app/actions/crm.ts")).toMatch(/convertActivityTitle/);
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/relabelConvertActivityTitle/);
  });

  it("shows Gathering and a header stage chip + strip, not a bare select", () => {
    expect(humanizeDealStage("gather")).toBe("Gathering");
    expect(PC_SHOPPING_STAGES[0]).toEqual({ slug: "gathering", name: "Gathering" });
    const page = source("src/app/deals/[id]/page.tsx");
    expect(page).toMatch(/DealHeaderStage/);
    expect(page).toMatch(/stageControl=/);
    expect(page).not.toMatch(/DealStageSelect/);
    expect(source("src/components/deal/deal-package-shell.tsx")).toMatch(/stageControl/);
    expect(source("src/components/deals/deal-header-stage.tsx")).not.toMatch(/<select/);
    expect(source("src/components/deals/deal-header-stage.tsx")).toMatch(/data-ff-header-stage-chip/);
    expect(source("src/components/deals/deal-header-stage.tsx")).toMatch(/Advance to/);
  });

  it("gives Flood the same PC stages as Home; Life uses the locked shopping list", () => {
    expect(pipelineSlugForLine("FLOOD")).toBe("p-c");
    expect(shopPipelineSlugForLine("FLOOD")).toBe("p-c");
    expect(SEEDED_PIPELINES.find((board) => board.slug === "flood")?.stages).toEqual(
      PC_SHOPPING_STAGES,
    );
    expect(SEEDED_PIPELINES.find((board) => board.slug === "p-c")?.stages).toEqual(
      PC_SHOPPING_STAGES,
    );
    expect(LIFE_HEALTH_STAGES.map((stage) => stage.slug)).toEqual(
      expect.arrayContaining(["gathering", "markets", "quote_review", "quote_sent", "policy_issued"]),
    );
    const boards = [
      {
        id: "pc",
        slug: "p-c",
        stages: PC_SHOPPING_STAGES.map((stage, index) => ({
          ...stage,
          color: defaultStageColor(index, stage.slug),
        })),
      },
      {
        id: "flood",
        slug: "flood",
        stages: [{ slug: "gathering", name: "Gathering", color: "blue" }],
      },
    ];
    const flood = dealStageView(
      {
        title: "Heather / Flood",
        pipelineStage: "gather",
        pipelineStageSlug: "gather",
        pipelineId: "flood",
        lineOfBusiness: "FLOOD",
      },
      boards,
    );
    const home = dealStageView(
      {
        title: "Gloria / HO3",
        pipelineStage: "gather",
        pipelineStageSlug: "gather",
        pipelineId: "pc",
        lineOfBusiness: "HO",
      },
      boards,
    );
    expect(flood.stages.map((stage) => stage.slug)).toEqual(home.stages.map((stage) => stage.slug));
    expect(flood.pipelineSlug).toBe("p-c");
  });
});
