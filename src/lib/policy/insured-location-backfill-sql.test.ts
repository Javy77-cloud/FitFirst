import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const FILES = {
  shared: "scripts/marketplace-medicare-insured-location.shared.sql",
  preview: "scripts/preview-marketplace-medicare-insured-location.sql",
  flag: "scripts/flag-marketplace-medicare-insured-location.sql",
  backfill: "scripts/backfill-marketplace-medicare-insured-location.sql",
} as const;

function read(name: string): string {
  return readFileSync(resolve(name), "utf8");
}

function sharedBlock(text: string): string {
  const start = text.indexOf("-- SHARED-START");
  const end = text.indexOf("-- SHARED-END");
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return text.slice(start, end + "-- SHARED-END".length);
}

describe("marketplace / medicare insured-location SQL", () => {
  const preview = read(FILES.preview);
  const flag = read(FILES.flag);
  const backfill = read(FILES.backfill);
  const shared = sharedBlock(read(FILES.shared));

  it("keeps one classification block in the preview, flag list, and backfill", () => {
    expect(sharedBlock(preview)).toBe(shared);
    expect(sharedBlock(flag)).toBe(shared);
    expect(sharedBlock(backfill)).toBe(shared);
  });

  it("keeps preview and flag read-only", () => {
    for (const text of [preview, flag]) {
      expect(text).not.toMatch(/^\s*(UPDATE|INSERT|DELETE|ALTER|DROP|TRUNCATE|CREATE)\b/im);
      expect(text).not.toMatch(/\b(renewal_date|premises_address)\s*=/i);
    }
  });

  it("updates only the four insured-location columns", () => {
    const set = backfill.match(/UPDATE policies AS p\s+SET\s+([\s\S]*?)\s+FROM insured_location_work/i);
    expect(set?.[1]).toBeTruthy();
    const assigned = [...set![1].matchAll(/^\s*([a-z0-9_]+)\s*=/gim)].map((match) => match[1]);
    expect(assigned).toEqual([
      "premises_address",
      "premises_city",
      "premises_state",
      "premises_zip",
    ]);
    expect(backfill).toMatch(/\bBEGIN;\s*$/m);
    expect(backfill.trimEnd().endsWith("COMMIT;")).toBe(true);
    expect(backfill).not.toMatch(/^\s*(renewal_date|premium|policy_number|status|updated_at)\s*=/im);
  });

  it("rejects country-only streets and writes a USPS state code", () => {
    expect(shared).toMatch(/contact has no real address/);
    expect(shared).toMatch(/\('tennessee', 'TN'\)/);
    expect(shared).toMatch(/\('utah', 'UT'\)/);
    expect(shared).toMatch(/\('florida', 'FL'\)/);
    expect(shared).toMatch(/united states/);
    expect(flag).toMatch(/copy_state/);
    expect(preview).toMatch(/copy_state/);
  });
});
