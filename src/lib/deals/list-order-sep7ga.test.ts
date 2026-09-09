import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(file, "utf8");
}

/** Tip sep7ga: pipeline list/board stay put when stage changes bump updatedAt. */
describe("sep7ga deal list order is stable on stage change", () => {
  it("listDeals orders by createdAt (+ id), not updatedAt", () => {
    const queries = source("src/lib/db/queries.ts");
    const listFn = queries.slice(
      queries.indexOf("export async function listDeals"),
      queries.indexOf("export type DealListRow"),
    );
    expect(listFn).toMatch(/\.orderBy\(desc\(deals\.createdAt\),\s*asc\(deals\.id\)\)/);
    expect(listFn).not.toMatch(/\.orderBy\(desc\(deals\.updatedAt\)\)/);
  });

  it("getPipelineBoard orders by createdAt (+ id), not updatedAt", () => {
    const queries = source("src/lib/db/queries.ts");
    const boardFn = queries.slice(
      queries.indexOf("export async function getPipelineBoard"),
      queries.indexOf("export type PipelineCardRow"),
    );
    expect(boardFn).toMatch(/\.orderBy\(desc\(deals\.createdAt\),\s*asc\(deals\.id\)\)/);
    expect(boardFn).not.toMatch(/\.orderBy\(desc\(deals\.updatedAt\)\)/);
  });

  it("stage move still writes updatedAt (activity/stale), only sort key changed", () => {
    const pipeline = source("src/app/actions/pipeline.ts");
    expect(pipeline).toMatch(/updatedAt:\s*now/);
    expect(pipeline).toMatch(/async function moveDealToStage/);
  });
});
