import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { markProductIssuedDone } from "@/lib/policy/dec-prompt";
import { ROSA_DEC_DEAL_ID } from "@/lib/policy/dec-prompt";
import {
  allProductsTerminalForArchive,
  decideArchiveDealWhenAllProductsTerminal,
  dealStageWhenAllProductsTerminal,
  isProductTerminalForArchive,
  productsForTerminalArchive,
} from "./archive-when-terminal";

function source(file: string) {
  return readFileSync(file, "utf8");
}

const NOW = new Date("2026-09-16T18:00:00.000Z");

describe("maybeArchiveDealWhenAllProductsTerminal — decision (backfill-safe)", () => {
  it("does not archive while a sibling is still shopping", () => {
    const afterHo3 = markProductIssuedDone(
      {
        homeowners: { stage: "policy_issued", selectedQuoteIds: ["q-ho3"], mintStatus: "unpublished" },
        auto: { stage: "bound", selectedQuoteIds: ["q-auto"] },
      },
      "homeowners",
      { policyId: "p-ho3" },
    );
    expect(isProductTerminalForArchive(afterHo3.homeowners)).toBe(true);
    expect(isProductTerminalForArchive(afterHo3.auto)).toBe(false);
    expect(allProductsTerminalForArchive(["homeowners", "auto"], afterHo3)).toBe(false);
    expect(
      decideArchiveDealWhenAllProductsTerminal({
        products: ["homeowners", "auto"],
        stages: afterHo3,
        now: NOW,
      }),
    ).toMatchObject({ shouldArchive: false, reason: "shopping", patch: null });
  });

  it("archives the whole deal when the last product is terminal", () => {
    const afterAuto = markProductIssuedDone(
      {
        homeowners: {
          stage: "closed_won",
          selectedQuoteIds: ["q-ho3"],
          issuedDone: true,
          mintStatus: "published",
        },
        auto: { stage: "bound", selectedQuoteIds: ["q-auto"] },
      },
      "auto",
      { policyId: "p-auto" },
    );
    expect(allProductsTerminalForArchive(["homeowners", "auto"], afterAuto)).toBe(true);
    const decision = decideArchiveDealWhenAllProductsTerminal({
      products: ["homeowners", "auto"],
      stages: afterAuto,
      pipelineStage: "quote_sent",
      pipelineStageSlug: "quote_sent",
      now: NOW,
    });
    expect(decision.shouldArchive).toBe(true);
    expect(decision.dealStage).toBe("closed_won");
    expect(decision.patch).toMatchObject({
      archivedAt: NOW,
      pipelineStage: "closed_won",
      pipelineStageSlug: "closed_won",
    });
  });

  it("treats closed_lost, issuedDone, published, and policy_issued as terminal", () => {
    expect(isProductTerminalForArchive({ stage: "closed_lost", selectedQuoteIds: [] })).toBe(true);
    expect(isProductTerminalForArchive({ stage: "closed_won", selectedQuoteIds: [] })).toBe(true);
    expect(
      isProductTerminalForArchive({
        stage: "quote_review",
        selectedQuoteIds: [],
        issuedDone: true,
      }),
    ).toBe(true);
    expect(
      isProductTerminalForArchive({
        stage: "policy_issued",
        selectedQuoteIds: ["q1"],
        mintStatus: "published",
      }),
    ).toBe(true);
    expect(
      isProductTerminalForArchive({
        stage: "policy_issued",
        selectedQuoteIds: ["q1"],
        mintStatus: "unpublished",
      }),
    ).toBe(true);
    expect(isProductTerminalForArchive({ stage: "gathering", selectedQuoteIds: [] })).toBe(false);
    expect(isProductTerminalForArchive({ stage: "markets", selectedQuoteIds: [] })).toBe(false);
    expect(isProductTerminalForArchive({ stage: "quote_review", selectedQuoteIds: [] })).toBe(false);
    expect(isProductTerminalForArchive({ stage: "quote_sent", selectedQuoteIds: [] })).toBe(false);
    expect(isProductTerminalForArchive({ stage: "bound", selectedQuoteIds: [] })).toBe(false);
    expect(isProductTerminalForArchive(null)).toBe(false);
  });

  it("sets closed_lost when every product is lost; closed_won when any line is won/issued", () => {
    expect(
      dealStageWhenAllProductsTerminal(["homeowners", "auto"], {
        homeowners: { stage: "closed_lost", selectedQuoteIds: [], lostReason: "price" },
        auto: { stage: "closed_lost", selectedQuoteIds: [], lostReason: "no_response" },
      }),
    ).toBe("closed_lost");
    expect(
      dealStageWhenAllProductsTerminal(["homeowners", "auto"], {
        homeowners: { stage: "closed_won", selectedQuoteIds: ["q1"], issuedDone: true },
        auto: { stage: "closed_lost", selectedQuoteIds: [], lostReason: "price" },
      }),
    ).toBe("closed_won");
    expect(
      dealStageWhenAllProductsTerminal(["homeowners"], {
        homeowners: { stage: "policy_issued", selectedQuoteIds: ["q1"], mintStatus: "unpublished" },
      }),
    ).toBe("closed_won");
  });

  it("does not overwrite an existing archived_at on re-run (backfill-safe)", () => {
    const archivedAt = new Date("2026-09-10T12:00:00.000Z");
    const decision = decideArchiveDealWhenAllProductsTerminal({
      products: ["homeowners"],
      stages: {
        homeowners: { stage: "closed_won", selectedQuoteIds: ["q1"], issuedDone: true },
      },
      archivedAt,
      pipelineStage: "closed_won",
      pipelineStageSlug: "closed_won",
      now: NOW,
    });
    expect(decision).toMatchObject({
      shouldArchive: false,
      alreadyArchived: true,
      reason: "already_archived",
      patch: null,
    });
  });

  it("stamps archived_at only when the archive board already holds the deal", () => {
    const decision = decideArchiveDealWhenAllProductsTerminal({
      products: ["homeowners"],
      stages: { homeowners: { stage: "closed_lost", selectedQuoteIds: [] } },
      archivedAt: null,
      pipelineStage: "archive",
      pipelineStageSlug: "archive",
      now: NOW,
    });
    expect(decision.shouldArchive).toBe(true);
    expect(decision.patch).toEqual({ archivedAt: NOW, updatedAt: NOW });
    expect(decision.patch).not.toHaveProperty("pipelineStageSlug");
  });

  it("keeps a prior archived_at when only the deal-level stage still needs closed_won", () => {
    const archivedAt = new Date("2026-09-08T08:00:00.000Z");
    const decision = decideArchiveDealWhenAllProductsTerminal({
      products: ["homeowners"],
      stages: {
        homeowners: { stage: "closed_won", selectedQuoteIds: ["q1"], mintStatus: "published" },
      },
      archivedAt,
      pipelineStage: "policy_issued",
      pipelineStageSlug: "policy_issued",
      now: NOW,
    });
    expect(decision.shouldArchive).toBe(true);
    expect(decision.patch?.archivedAt).toEqual(archivedAt);
    expect(decision.patch?.pipelineStageSlug).toBe("closed_won");
  });

  it("does not archive an empty product list or a missing sibling row", () => {
    expect(allProductsTerminalForArchive([], {})).toBe(false);
    expect(
      decideArchiveDealWhenAllProductsTerminal({ products: [], stages: {}, now: NOW }).reason,
    ).toBe("empty");
    expect(
      allProductsTerminalForArchive(["homeowners", "auto"], {
        homeowners: { stage: "closed_won", selectedQuoteIds: ["q1"] },
      }),
    ).toBe(false);
    expect(
      productsForTerminalArchive(["homeowners"], {
        homeowners: { stage: "closed_won", selectedQuoteIds: [] },
        auto: { stage: "gathering", selectedQuoteIds: [] },
      }),
    ).toEqual(["homeowners", "auto"]);
  });

  it("archives a single-product deal the same as a multi-product last line", () => {
    const decision = decideArchiveDealWhenAllProductsTerminal({
      products: ["homeowners"],
      stages: { homeowners: { stage: "closed_lost", selectedQuoteIds: [], lostReason: "timing" } },
      now: NOW,
    });
    expect(decision.dealStage).toBe("closed_lost");
    expect(decision.patch).toMatchObject({
      archivedAt: NOW,
      pipelineStage: "lost",
      pipelineStageSlug: "closed_lost",
    });
  });
});

describe("archive-when-terminal wiring + Rosa note", () => {
  it("hooks publish, product-stage, and quote-won paths", () => {
    expect(source("src/app/actions/policy-mint.ts")).toMatch(/maybeArchiveDealWhenAllProductsTerminal/);
    expect(source("src/app/actions/policy-mint.ts")).toMatch(/allProductsClosedForDealWon/);
    expect(source("src/app/actions/policy-mint.ts")).toMatch(/markProductIssuedDone/);
    expect(source("src/app/actions/product-stage.ts")).toMatch(/maybeArchiveDealWhenAllProductsTerminal/);
    expect(source("src/app/actions/quotes.ts")).toMatch(/maybeArchiveDealWhenAllProductsTerminal/);
    expect(source("src/lib/deals/archive-when-terminal.ts")).toMatch(
      /export async function maybeArchiveDealWhenAllProductsTerminal/,
    );
  });

  it("notes Rosa was archived by hand; new publishes auto-archive", () => {
    expect(ROSA_DEC_DEAL_ID).toMatch(/5d4a4c04/);
    expect(source("src/lib/deals/archive-when-terminal.ts")).toMatch(/Rosa Castellanos HO/);
    expect(source("src/lib/deals/archive-when-terminal.ts")).toMatch(/archived by hand/);
    expect(source("src/lib/policy/dec-prompt.ts")).toMatch(/archived by hand/);
  });
});
