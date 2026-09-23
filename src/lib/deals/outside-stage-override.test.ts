import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildOutsideStageOverride,
  hasActiveOutsideOverride,
  OUTSIDE_FITFIRST_STAMP,
  OUTSIDE_OVERRIDE_STAGES,
  outsideFitFirstStampLabel,
  parseOutsideStageOverride,
} from "./outside-stage-override";
import {
  displayProductStage,
  lateStageNeedsQuoteSelection,
  productStampStage,
  setProductStage,
} from "./product-stages";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("outside FitFirst stage override", () => {
  it("requires a reason and only allows late pipeline stages", () => {
    expect(buildOutsideStageOverride({ stageSlug: "policy_issued", reason: "" }).ok).toBe(false);
    expect(buildOutsideStageOverride({ stageSlug: "markets", reason: "portal" }).ok).toBe(false);
    const ok = buildOutsideStageOverride({
      stageSlug: "policy_issued",
      reason: "Quoted & bound in Progressive portal offline",
    });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.override.toStage).toBe("policy_issued");
    expect(OUTSIDE_OVERRIDE_STAGES).toEqual([
      "quote_sent",
      "bound",
      "policy_issued",
      "closed_won",
    ]);
  });

  it("keeps Policy issued without inventing quote rows when override is set", () => {
    const built = buildOutsideStageOverride({
      stageSlug: "policy_issued",
      reason: "Legacy GL quoted outside FitFirst",
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const next = setProductStage({}, "homeowners", {
      stage: "policy_issued",
      selectedQuoteIds: [],
      outsideOverride: built.override,
    });
    expect(next.homeowners?.stage).toBe("policy_issued");
    expect(next.homeowners?.selectedQuoteIds).toEqual([]);
    expect(hasActiveOutsideOverride(next.homeowners?.outsideOverride)).toBe(true);
    expect(
      lateStageNeedsQuoteSelection({
        stage: "policy_issued",
        selectedQuoteIds: [],
        outsideOverride: next.homeowners?.outsideOverride,
      }),
    ).toBe(false);
    expect(
      displayProductStage({
        stage: "policy_issued",
        selectedQuoteIds: [],
        outsideOverride: next.homeowners?.outsideOverride,
      }),
    ).toBe("policy_issued");
    expect(
      productStampStage(next.homeowners, "policy_issued", null, []),
    ).toBe("policy_issued");
    expect(outsideFitFirstStampLabel(next.homeowners?.outsideOverride)).toBe(
      OUTSIDE_FITFIRST_STAMP,
    );
  });

  it("still demotes leftover late stages without override or quotes", () => {
    expect(
      setProductStage({}, "homeowners", { stage: "bound", selectedQuoteIds: [] }).homeowners,
    ).toMatchObject({ stage: "quote_review" });
    expect(parseOutsideStageOverride({ reason: "x", toStage: "gathering" })).toBeNull();
  });

  it("wires stepper control, activity override action, and mint-without-quote path", () => {
    expect(source("src/components/deals/deal-header-stage.tsx")).toMatch(
      /data-ff-pipeline-chrome/,
    );
    expect(source("src/components/deals/deal-header-stage.tsx")).toMatch(
      /data-ff-outside-stage-stepper/,
    );
    expect(source("src/components/deals/deal-header-stage.tsx")).toMatch(
      /buttonVariant="button"/,
    );
    expect(source("src/components/deals/outside-stage-override-dialog.tsx")).toMatch(
      /Notes why/,
    );
    expect(source("src/components/deals/outside-stage-override-dialog.tsx")).toMatch(
      /disabled=\{pending \|\| !reason\.trim\(\)\}/,
    );
    expect(source("src/app/actions/product-stage.ts")).toMatch(
      /overrideDealProductStageOutside/,
    );
    expect(source("src/app/actions/product-stage.ts")).toMatch(
      /!hasActiveOutsideOverride\(outsideOverride\)/,
    );
    expect(source("src/lib/policy/mint-gate.ts")).toMatch(/outsideOverride/);
    expect(source("src/app/actions/policy-mint.ts")).toMatch(/Outside FitFirst/);
    expect(source("src/components/deal/outside-fitfirst-stamp.tsx")).toMatch(
      /data-ff-outside-fitfirst-hero/,
    );
    expect(source("src/components/deal/quotes-panel.tsx")).toMatch(
      /variant="hero"/,
    );
    expect(source("src/components/deal/markets-panel.tsx")).toMatch(
      /variant="hero"/,
    );
    expect(source("src/app/deals/[id]/page.tsx")).toMatch(/OutsideFitFirstStamp/);
    expect(source("src/components/deal/issue-policy-from-dec.tsx")).toMatch(
      /outsideOverride/,
    );
    expect(source("src/components/deal/deal-package-shell.tsx")).toMatch(
      /label: "Pipeline"/,
    );
  });
});
