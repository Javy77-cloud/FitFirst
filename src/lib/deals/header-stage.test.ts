import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PC_SHOPPING_STAGES } from "@/lib/wire/pipeline";
import { nextAdvanceStage, stageChipLabel, STAGE_ADVANCE_ORDER } from "./header-stage";
import { humanizeDealStage } from "./package-lines";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("header stage chip + strip", () => {
  it("prints Gather info on the chip, not truncated Gather", () => {
    expect(stageChipLabel("gather")).toBe("Gather info");
    expect(stageChipLabel({ slug: "gather", name: "Gather" })).toBe("Gather info");
    expect(stageChipLabel({ slug: "gather", name: "Gather Info" })).toBe("Gather info");
    expect(humanizeDealStage("gather")).toBe("Gather info");
    expect(stageChipLabel({ slug: "quotes", name: "Meet / Quotes" })).toBe("Meet / Quotes");
  });

  it("advances along the happy path and still allows any board stage", () => {
    expect(STAGE_ADVANCE_ORDER[0]).toBe("gather");
    expect(nextAdvanceStage("gather", PC_SHOPPING_STAGES)?.slug).toBe("quotes");
    expect(nextAdvanceStage("quotes", PC_SHOPPING_STAGES)?.slug).toBe("review");
    expect(nextAdvanceStage("quote_sent", PC_SHOPPING_STAGES)?.slug).toBe("bound");
    expect(nextAdvanceStage("bound", PC_SHOPPING_STAGES)?.slug).toBe("policy_issued");
    expect(nextAdvanceStage("closed_won", PC_SHOPPING_STAGES)).toBeNull();
    expect(PC_SHOPPING_STAGES.map((stage) => stage.slug)).toEqual(
      expect.arrayContaining(["gather", "quotes", "review", "quote_sent", "bound", "policy_issued"]),
    );
  });

  it("header uses a colored chip + pipeline strip, not a bare select", () => {
    const page = source("src/app/deals/[id]/page.tsx");
    const header = source("src/components/deals/deal-header-stage.tsx");
    expect(page).toMatch(/DealHeaderStage/);
    expect(page).toMatch(/stageControl=/);
    expect(page).not.toMatch(/DealStageSelect/);
    expect(header).toMatch(/data-ff-header-stage-chip/);
    expect(header).toMatch(/data-ff-header-stage-strip/);
    expect(header).toMatch(/data-ff-header-stage-advance/);
    expect(header).toMatch(/StatusBadge/);
    expect(header).toMatch(/stageChipLabel/);
    expect(header).toMatch(/nextAdvanceStage/);
    expect(header).toMatch(/uppercase=\{false\}/);
    expect(header).toMatch(/whitespace-nowrap/);
    expect(header).not.toMatch(/<select/);
    expect(header).toMatch(/setDealProductStage/);
    expect(header).toMatch(/livePicked/);
    expect(header).toMatch(/disabled=\{\!livePicked\(\)\.length/);
    expect(page).toMatch(/liveQuoteIds/);
  });
});
