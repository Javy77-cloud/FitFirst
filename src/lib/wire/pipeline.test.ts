import { describe, expect, it } from "vitest";
import {
  SEEDED_PIPELINES,
  dealMatchesBoard,
  dealMatchesStage,
  defaultPipelineFieldIds,
  isAdminPipelineBadge,
  parsePipelineFields,
  parsePipelineView,
  pipelineFunnelRows,
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

  it("keeps Won-Lost and Archive as two tabs", () => {
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
    expect(SEEDED_PIPELINES.some((board) => /won-lost\s*\/\s*archive/i.test(board.name))).toBe(false);
  });

  it("does not mark Flood as an admin board", () => {
    const flood = SEEDED_PIPELINES.find((board) => board.slug === "flood");
    expect(flood?.seeded).toBe(true);
    expect(isAdminPipelineBadge(flood!)).toBe(false);
  });

  it("orders shopping boards before Won-Lost and Archive", () => {
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
    expect(dealMatchesStage({ ...ana, pipelineStage: "shopping", pipelineStageSlug: "shopping" }, "gather")).toBe(
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
    expect(dealMatchesStage(elena, "closed_lost")).toBe(false);
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
    expect(resolveStageMove("shopping")).toEqual({ pipelineStage: "shopping", pipelineStageSlug: "gather" });
    expect(resolveStageMove("quotes")).toEqual({ pipelineStage: "quoting", pipelineStageSlug: "quotes" });
    expect(resolveStageMove("quote_sent")).toEqual({ pipelineStage: "quote_sent", pipelineStageSlug: "quote_sent" });
    expect(resolveStageMove("closed_lost")).toEqual({ pipelineStage: "lost", pipelineStageSlug: "closed_lost" });
  });
});

describe("column / card field picker", () => {
  it("always keeps title and restores defaults when empty", () => {
    expect(defaultPipelineFieldIds()).toContain("title");
    expect(parsePipelineFields("")).toEqual(defaultPipelineFieldIds());
    expect(parsePipelineFields("insured,phone")).toEqual(["title", "insured", "phone"]);
    expect(parsePipelineFields("nope,email")).toEqual(["title", "email"]);
  });
});

describe("pipeline views", () => {
  it("parses Board | Table | Funnel and keeps Table as the Deals default", () => {
    expect(parsePipelineView(undefined)).toBe("table");
    expect(parsePipelineView("table")).toBe("table");
    expect(parsePipelineView("funnel")).toBe("funnel");
    expect(parsePipelineView("board")).toBe("board");
    expect(parsePipelineView("kanban")).toBe("table");
    expect(pipelineHref("p-c")).toBe("/deals?pipeline=p-c");
    expect(pipelineHref("p-c", "table")).toBe("/deals?pipeline=p-c");
    expect(pipelineHref("p-c", "funnel")).toBe("/deals?pipeline=p-c&view=funnel");
    expect(pipelineHref("p-c", "board")).toBe("/deals?pipeline=p-c&view=board");
    expect(pipelineHref("p-c", "table", "quote_sent")).toBe(
      "/deals?pipeline=p-c&stage=quote_sent",
    );
  });

  it("summarizes stage counts for the funnel and click-through", () => {
    const rows = pipelineFunnelRows(
      [
        { slug: "gather", name: "Gather Info", color: "blue" },
        { slug: "quote_sent", name: "Quote Sent", color: "violet" },
        { slug: "closed_won", name: "Closed Won", color: "green" },
      ],
      [
        { pipelineStage: "shopping", pipelineStageSlug: "gather", archivedAt: null },
        { pipelineStage: "quote_sent", pipelineStageSlug: "quote_sent", archivedAt: null },
        { pipelineStage: "quote_sent", pipelineStageSlug: "quote_sent", archivedAt: null },
      ],
    );
    expect(rows.map((row) => ({ slug: row.slug, count: row.count }))).toEqual([
      { slug: "gather", count: 1 },
      { slug: "quote_sent", count: 2 },
      { slug: "closed_won", count: 0 },
    ]);
  });
});
