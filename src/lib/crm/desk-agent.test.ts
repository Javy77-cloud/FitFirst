import { describe, expect, it } from "vitest";
import { deskAgentsToInsert } from "./desk-agent";

const SEEDS = [
  { id: "44444444-4444-4444-8444-444444444401", slug: "admin" },
  { id: "44444444-4444-4444-8444-444444444402", slug: "javy" },
  { id: "44444444-4444-4444-8444-444444444403", slug: "producer" },
] as const;

describe("deskAgentsToInsert", () => {
  it("inserts nothing when seed ids already exist under different slugs", () => {
    const existing = [
      { id: SEEDS[0].id, slug: "javy-rivera" },
      { id: SEEDS[1].id, slug: "maya-chen" },
    ];
    expect(deskAgentsToInsert(existing, SEEDS)).toEqual([SEEDS[2]]);
  });

  it("inserts nothing when seed slugs already exist under different ids", () => {
    const existing = [
      { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", slug: "admin" },
      { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", slug: "javy" },
      { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", slug: "producer" },
    ];
    expect(deskAgentsToInsert(existing, SEEDS)).toEqual([]);
  });

  it("inserts only truly missing seed rows", () => {
    expect(deskAgentsToInsert([], SEEDS)).toEqual([...SEEDS]);
    expect(deskAgentsToInsert([SEEDS[0]], SEEDS)).toEqual([SEEDS[1], SEEDS[2]]);
  });
});
