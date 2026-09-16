import { describe, expect, it } from "vitest";
import {
  LIFE_HEALTH_STAGES,
  PC_SHOPPING_STAGES,
  SEEDED_PIPELINES,
  dealMatchesBoard,
  dealMatchesStage,
  defaultPipelineFieldIds,
  isAdminPipelineBadge,
  parsePipelineFields,
  parsePipelineView,
  pipelineFunnelRows,
  dealsHref,
  renewalsHref,
  parseRenewalsView,
  pipelineHref,
  pipelinePageTitle,
  pipelineTabLabel,
  resolveStageMove,
  switcherBoards,
} from "./pipeline";

describe("pipeline switcher", () => {
  it("labels the personal-lines board P&C pipeline, not P-C", () => {
    const pc = SEEDED_PIPELINES.find((board) => board.slug === "p-c");
    expect(pc?.name).toBe("P&C pipeline");
    expect(pipelineTabLabel(pc!)).toBe("P&C");
    expect(pipelinePageTitle(pc!)).toBe("P&C pipeline");
  });

  it("keeps Won-Lost and Archived as two tabs", () => {
    const slugs = SEEDED_PIPELINES.map((board) => board.slug);
    expect(slugs).toContain("won-lost");
    expect(slugs).toContain("archive");
    expect(SEEDED_PIPELINES.find((board) => board.slug === "won-lost")?.stages.map((s) => s.slug)).toEqual([
      "closed_won",
      "closed_lost",
    ]);
    expect(SEEDED_PIPELINES.find((board) => board.slug === "archive")?.stages.map((s) => s.slug)).toEqual([
      "archive",
    ]);
    expect(SEEDED_PIPELINES.find((board) => board.slug === "archive")?.name).toBe("Archived");
    expect(SEEDED_PIPELINES.find((board) => board.slug === "archive")?.stages[0]?.name).toBe("Archived");
    expect(pipelineTabLabel(SEEDED_PIPELINES.find((board) => board.slug === "archive")!)).toBe("Archived");
    expect(SEEDED_PIPELINES.some((board) => /won-lost\s*\/\s*archive/i.test(board.name))).toBe(false);
  });

  it("uses the locked gathering → markets → quote_review → late stages list", () => {
    expect(SEEDED_PIPELINES.find((board) => board.slug === "p-c")?.stages.map((s) => s.slug)).toEqual([
      "gathering",
      "markets",
      "quote_review",
      "quote_sent",
      "bound",
      "policy_issued",
      "closed_won",
      "closed_lost",
    ]);
    expect(PC_SHOPPING_STAGES.find((stage) => stage.slug === "gathering")?.name).toBe("Gathering");
    expect(SEEDED_PIPELINES.find((board) => board.slug === "p-c")?.stages).toEqual(PC_SHOPPING_STAGES);
    expect(SEEDED_PIPELINES.find((board) => board.slug === "flood")?.stages).toEqual(PC_SHOPPING_STAGES);
    expect(SEEDED_PIPELINES.find((board) => board.slug === "life")?.stages).toEqual(LIFE_HEALTH_STAGES);
    expect(LIFE_HEALTH_STAGES.map((stage) => stage.slug)).toContain("markets");
    for (const slug of ["health", "life", "flood"] as const) {
      const stages = SEEDED_PIPELINES.find((board) => board.slug === slug)?.stages.map((s) => s.slug) ?? [];
      const qs = stages.indexOf("quote_sent");
      const bound = stages.indexOf("bound");
      const issued = stages.indexOf("policy_issued");
      const won = stages.indexOf("closed_won");
      expect(qs).toBeGreaterThanOrEqual(0);
      expect(bound).toBe(qs + 1);
      expect(issued).toBe(bound + 1);
      expect(won).toBe(issued + 1);
    }
  });

  it("does not mark Flood as an admin board", () => {
    const flood = SEEDED_PIPELINES.find((board) => board.slug === "flood");
    expect(flood?.seeded).toBe(true);
    expect(isAdminPipelineBadge(flood!)).toBe(false);
  });

  it("orders shopping boards before Won-Lost and Archived", () => {
    const ordered = switcherBoards(SEEDED_PIPELINES).map((board) => board.slug);
    expect(ordered).toEqual(["p-c", "health", "life", "flood", "won-lost", "archive"]);
  });
});

describe("deal placement", () => {
  const pc = { id: "pc", slug: "p-c", kind: "shopping" };
  const wonLost = { id: "wl", slug: "won-lost", kind: "parking" };
  const archive = { id: "ar", slug: "archive", kind: "parking" };

  it("keeps Ana-style shopping/quote-sent deals on P&C, not Won-Lost or Archive", () => {
    const ana = {
      pipelineId: "pc",
      pipelineStage: "quote_sent",
      pipelineStageSlug: "quote_sent",
      archivedAt: null,
    };
    expect(dealMatchesBoard(ana, pc)).toBe(true);
    expect(dealMatchesBoard(ana, wonLost)).toBe(false);
    expect(dealMatchesBoard(ana, archive)).toBe(false);
    expect(dealMatchesStage(ana, "quote_sent")).toBe(true);
    expect(dealMatchesStage({ ...ana, pipelineStage: "shopping", pipelineStageSlug: "shopping" }, "gathering")).toBe(
      true,
    );
  });

  it("shows Closed Won on both the shopping board and the Won-Lost tab", () => {
    const elena = {
      pipelineId: "pc",
      pipelineStage: "bound",
      pipelineStageSlug: "closed_won",
      archivedAt: null,
    };
    expect(dealMatchesBoard(elena, pc)).toBe(true);
    expect(dealMatchesBoard(elena, wonLost)).toBe(true);
    expect(dealMatchesBoard(elena, archive)).toBe(false);
    expect(dealMatchesStage(elena, "closed_won")).toBe(true);
    expect(dealMatchesStage(elena, "bound")).toBe(false);
    expect(dealMatchesStage(elena, "closed_lost")).toBe(false);
  });

  it("matches Bound and remaps leftover Pending Inspection onto Bound", () => {
    const boundDeal = {
      pipelineId: "pc",
      pipelineStage: "bound",
      pipelineStageSlug: "bound",
      archivedAt: null,
    };
    const pendingDeal = {
      pipelineId: "pc",
      pipelineStage: "pending_inspection",
      pipelineStageSlug: "pending_inspection",
      archivedAt: null,
    };
    expect(dealMatchesStage(boundDeal, "bound")).toBe(true);
    expect(dealMatchesStage(boundDeal, "closed_won")).toBe(false);
    expect(dealMatchesStage(pendingDeal, "bound")).toBe(true);
    expect(dealMatchesStage(pendingDeal, "policy_issued")).toBe(false);
  });

  it("parks archived deals only on Archive", () => {
    const parked = {
      pipelineId: "ar",
      pipelineStage: "archive",
      pipelineStageSlug: "archive",
      archivedAt: "2026-09-01T00:00:00.000Z",
    };
    expect(dealMatchesBoard(parked, archive)).toBe(true);
    expect(dealMatchesBoard(parked, wonLost)).toBe(false);
    expect(dealMatchesBoard(parked, pc)).toBe(false);
    expect(dealMatchesStage(parked, "archive")).toBe(true);
  });
});

describe("stage move sync", () => {
  it("writes both legacy stage and board slug", () => {
    expect(resolveStageMove("shopping")).toEqual({ pipelineStage: "gathering", pipelineStageSlug: "gathering" });
    expect(resolveStageMove("quotes")).toEqual({ pipelineStage: "markets", pipelineStageSlug: "markets" });
    expect(resolveStageMove("review")).toEqual({
      pipelineStage: "quote_review",
      pipelineStageSlug: "quote_review",
    });
    expect(resolveStageMove("quote_sent")).toEqual({ pipelineStage: "quote_sent", pipelineStageSlug: "quote_sent" });
    expect(resolveStageMove("bound")).toEqual({ pipelineStage: "bound", pipelineStageSlug: "bound" });
    expect(resolveStageMove("pending_inspection")).toEqual({
      pipelineStage: "bound",
      pipelineStageSlug: "bound",
    });
    expect(resolveStageMove("policy_issued")).toEqual({
      pipelineStage: "policy_issued",
      pipelineStageSlug: "policy_issued",
    });
    expect(resolveStageMove("closed_won")).toEqual({ pipelineStage: "closed_won", pipelineStageSlug: "closed_won" });
    expect(resolveStageMove("closed_lost")).toEqual({ pipelineStage: "lost", pipelineStageSlug: "closed_lost" });
  });
});

describe("column / card field picker", () => {
  it("always keeps title and restores defaults when empty", () => {
    expect(defaultPipelineFieldIds()).toContain("title");
    expect(defaultPipelineFieldIds()).toContain("tags");
    expect(parsePipelineFields("")).toEqual(defaultPipelineFieldIds());
    expect(parsePipelineFields("insured,phone")).toEqual(["title", "insured", "phone"]);
    expect(parsePipelineFields("nope,email")).toEqual(["title", "email"]);
  });
});

describe("pipeline views", () => {
  it("parses List | Grid | Board | Funnel and keeps List as the Deals default", () => {
    expect(parsePipelineView(undefined)).toBe("list");
    expect(parsePipelineView("table")).toBe("list");
    expect(parsePipelineView("list")).toBe("list");
    expect(parsePipelineView("grid")).toBe("grid");
    expect(parsePipelineView("funnel")).toBe("funnel");
    expect(parsePipelineView("board")).toBe("board");
    expect(parsePipelineView("kanban")).toBe("list");
    expect(pipelineHref("p-c")).toBe("/deals?pipeline=p-c");
    expect(pipelineHref("p-c", "table")).toBe("/deals?pipeline=p-c&view=list");
    expect(pipelineHref("p-c", "list")).toBe("/deals?pipeline=p-c&view=list");
    expect(pipelineHref("p-c", "grid")).toBe("/deals?pipeline=p-c&view=grid");
    expect(pipelineHref("p-c", "funnel")).toBe("/deals?pipeline=p-c&view=funnel");
    expect(pipelineHref("p-c", "board")).toBe("/deals?pipeline=p-c&view=board");
    expect(pipelineHref("p-c", "list", "quote_sent")).toBe(
      "/deals?pipeline=p-c&view=list&stage=quote_sent",
    );
    expect(dealsHref({ view: "list" })).toBe("/deals?view=list");
    expect(dealsHref({})).toBe("/deals");
  });

  it("summarizes stage counts for the funnel and click-through", () => {
    const rows = pipelineFunnelRows(
      [
        { slug: "gathering", name: "Gathering", color: "blue" },
        { slug: "quote_sent", name: "Quote Sent", color: "violet" },
        { slug: "closed_won", name: "Closed Won", color: "green" },
      ],
      [
        { pipelineStage: "gathering", pipelineStageSlug: "gathering", archivedAt: null },
        { pipelineStage: "quote_sent", pipelineStageSlug: "quote_sent", archivedAt: null },
        { pipelineStage: "quote_sent", pipelineStageSlug: "quote_sent", archivedAt: null },
      ],
    );
    expect(rows.map((row) => ({ slug: row.slug, count: row.count }))).toEqual([
      { slug: "gathering", count: 1 },
      { slug: "quote_sent", count: 2 },
      { slug: "closed_won", count: 0 },
    ]);
  });
});

describe("renewals href / default view", () => {
  it("mirrors dealsHref on /renewals and defaults to board", () => {
    expect(parseRenewalsView(undefined)).toBe("board");
    expect(parseRenewalsView("kanban")).toBe("board");
    expect(parseRenewalsView("list")).toBe("list");
    expect(parseRenewalsView("table")).toBe("list");
    expect(parseRenewalsView("grid")).toBe("grid");
    expect(parseRenewalsView("funnel")).toBe("funnel");
    expect(renewalsHref({})).toBe("/renewals");
    expect(renewalsHref({ view: "board" })).toBe("/renewals?view=board");
    expect(renewalsHref({ pipeline: "p-c", view: "list", pcSub: "home" })).toBe(
      "/renewals?pipeline=p-c&view=list&pcSub=home",
    );
    expect(renewalsHref({ pipeline: "won-lost", view: "funnel" })).toBe(
      "/renewals?pipeline=won-lost&view=funnel",
    );
  });
});
