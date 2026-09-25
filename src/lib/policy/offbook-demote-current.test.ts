import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { tagsWithTermRole } from "@/lib/documents/document-labels";
import {
  planOffBookDocumentDemotions,
  planOffBookTermDemotions,
  shouldDemoteCurrentForStatus,
} from "./offbook-demote-current";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("shouldDemoteCurrentForStatus", () => {
  it("runs when next status is off-book (active→lapsed / cancelled / non_renewed / expired)", () => {
    expect(shouldDemoteCurrentForStatus("lapsed")).toBe(true);
    expect(shouldDemoteCurrentForStatus("cancelled")).toBe(true);
    expect(shouldDemoteCurrentForStatus("non_renewed")).toBe(true);
    expect(shouldDemoteCurrentForStatus("expired")).toBe(true);
    expect(shouldDemoteCurrentForStatus("lapse")).toBe(true);
    expect(shouldDemoteCurrentForStatus("non_renewal")).toBe(true);
  });

  it("does not run when next status stays in force (active→active)", () => {
    expect(shouldDemoteCurrentForStatus("active")).toBe(false);
    expect(shouldDemoteCurrentForStatus("bound")).toBe(false);
    expect(shouldDemoteCurrentForStatus("pending")).toBe(false);
    expect(shouldDemoteCurrentForStatus("unpublished")).toBe(false);
    expect(shouldDemoteCurrentForStatus("")).toBe(false);
    expect(shouldDemoteCurrentForStatus(null)).toBe(false);
  });
});

describe("planOffBookDocumentDemotions", () => {
  it("demotes Current DEC tags to Prior and keeps other tags (file kept via tag-only change)", () => {
    const plan = planOffBookDocumentDemotions([
      { id: "dec-current", tags: tagsWithTermRole(["dec", "policy_dec"], "current") },
      { id: "dec-prior", tags: tagsWithTermRole(["dec"], "prior") },
      { id: "dec-unset", tags: ["dec"] },
      { id: "dec-renewal", tags: tagsWithTermRole(["dec"], "renewal") },
    ]);
    expect(plan).toEqual([
      {
        id: "dec-current",
        tags: ["dec", "policy_dec", "term_role:prior"],
      },
    ]);
    // Prior / Not set / renewal are no-ops — documents stay on the policy.
    expect(plan.some((row) => row.id === "dec-prior")).toBe(false);
    expect(plan.some((row) => row.id === "dec-unset")).toBe(false);
  });

  it("is a no-op when already Prior or empty", () => {
    expect(
      planOffBookDocumentDemotions([
        { id: "a", tags: tagsWithTermRole(["dec"], "prior") },
        { id: "b", tags: [] },
      ]),
    ).toEqual([]);
  });
});

describe("planOffBookTermDemotions", () => {
  it("lists current policy_terms to demote to prior so Overview loses a current term on a lapsed book", () => {
    expect(
      planOffBookTermDemotions([
        { id: "c1", role: "current" },
        { id: "p1", role: "prior" },
        { id: "prop", role: "proposed" },
      ]),
    ).toEqual(["c1"]);
  });
});

describe("off-book demote wiring", () => {
  it("demotes through the shared off-book handler on status transitions", () => {
    const helper = source("src/lib/policy/offbook-demote-current.ts");
    expect(helper).toMatch(/export async function demoteCurrentOnOffBookStatus/);
    expect(helper).toMatch(/term_role:prior|tagsWithTermRole\(doc\.tags, "prior"\)/);
    expect(helper).not.toMatch(/\.delete\(documents\)/);

    const effects = source("src/lib/policy/offbook-effects.ts");
    expect(effects).toMatch(/demoteCurrentOnOffBookStatusMany/);

    const record = source("src/app/actions/policy-record.ts");
    expect(record).toMatch(/applyOffBookEffects\(/);
    expect(record).toMatch(/shouldApplyOffBookEffects/);

    const mass = source("src/app/actions/mass-update.ts");
    expect(mass).toMatch(/applyOffBookEffectsMany/);
    expect(mass).toMatch(/shouldApplyOffBookEffects/);

    const service = source("src/lib/policy/service.ts");
    expect(service).toMatch(/applyOffBookEffects\(/);
  });
});
