import { describe, expect, it } from "vitest";
import { CARRIER_IDS, ELENA_QUOTE_AI_ID, ELENA_QUOTE_TAILROW_ID } from "@/lib/fixtures/ids";
import type { Carrier, Quote, QuoteAttemptLog } from "@/lib/db/schema";
import {
  collectCompareQuotes,
  defaultSelectedIds,
  diffQuotes,
  parsePremium,
  parseSelectedIds,
  plainEnglishLines,
} from "./compare";

function carrier(id: string, name: string): Carrier {
  return { id, name } as Carrier;
}

function quote(partial: Partial<Quote> & Pick<Quote, "id" | "carrierId">): Quote {
  return {
    tenantId: "11111111-1111-4111-8111-111111111111",
    dealId: "44444444-4444-4444-8444-444444444442",
    riskId: "44444444-4444-4444-8444-444444444443",
    quoteAttemptLogId: null,
    quoteNumber: null,
    premium: null,
    hurricaneDeductible: null,
    aopDeductible: null,
    coverageA: null,
    bindable: false,
    coverageGaps: [],
    notes: null,
    stub: true,
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
    ...partial,
  } as Quote;
}

function log(partial: Partial<QuoteAttemptLog> & Pick<QuoteAttemptLog, "id" | "carrierId">): QuoteAttemptLog {
  return {
    tenantId: "11111111-1111-4111-8111-111111111111",
    dealId: "22222222-2222-4222-8222-222222222222",
    riskId: "22222222-2222-4222-8222-222222222223",
    attemptedAt: new Date("2026-09-02T00:00:00.000Z"),
    lineOfBusiness: "HO3",
    result: "quoted",
    bindable: false,
    quoteNumber: null,
    premium: null,
    covATried: 321000,
    covAForced: null,
    why: null,
    ...partial,
  } as QuoteAttemptLog;
}

describe("parsePremium", () => {
  it("reads numeric strings", () => {
    expect(parsePremium("2840.00")).toBe(2840);
    expect(parsePremium("")).toBeNull();
  });
});

describe("collectCompareQuotes", () => {
  it("ranks Elena stub quotes cheapest first", () => {
    const rows = collectCompareQuotes({
      quotes: [
        {
          quote: quote({
            id: ELENA_QUOTE_TAILROW_ID,
            carrierId: CARRIER_IDS.tailrow,
            premium: "3120.00",
            coverageA: 385000,
            bindable: true,
            hurricaneDeductible: "2%",
            aopDeductible: "$2,500",
            quoteNumber: "Q-TR-MEL-3120",
          }),
          carrier: carrier(CARRIER_IDS.tailrow, "Tailrow"),
        },
        {
          quote: quote({
            id: ELENA_QUOTE_AI_ID,
            carrierId: CARRIER_IDS.americanIntegrity,
            premium: "2840.00",
            coverageA: 385000,
            bindable: true,
            hurricaneDeductible: "2%",
            aopDeductible: "$2,500",
            quoteNumber: "Q-AI-MEL-2840",
          }),
          carrier: carrier(CARRIER_IDS.americanIntegrity, "American Integrity"),
        },
      ],
    });
    expect(rows.map((row) => row.carrierName)).toEqual(["American Integrity", "Tailrow"]);
    expect(rows[0].premium).toBe(2840);
  });

  it("keeps Ana attempt rows that have a premium and skips empty declines", () => {
    const rows = collectCompareQuotes({
      quotes: [],
      logs: [
        {
          log: log({
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
            carrierId: CARRIER_IDS.americanIntegrity,
            result: "quoted",
            premium: "5607.53",
            quoteNumber: "QT-21770008",
            why: "Quoted at $321,000 but not bindable.",
          }),
          carrier: carrier(CARRIER_IDS.americanIntegrity, "American Integrity"),
        },
        {
          log: log({
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
            carrierId: CARRIER_IDS.geovera,
            result: "floor_only",
            premium: "4001.35",
            covAForced: 363000,
          }),
          carrier: carrier(CARRIER_IDS.geovera, "GeoVera"),
        },
        {
          log: log({
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3",
            carrierId: CARRIER_IDS.qbe,
            result: "declined",
            premium: null,
          }),
          carrier: carrier(CARRIER_IDS.qbe, "QBE"),
        },
      ],
    });
    expect(rows.map((row) => row.carrierName)).toEqual(["GeoVera", "American Integrity"]);
    expect(rows.every((row) => row.source === "attempt")).toBe(true);
  });
});

describe("defaultSelectedIds + diffs + plain English", () => {
  const elena = collectCompareQuotes({
    quotes: [
      {
        quote: quote({
          id: ELENA_QUOTE_AI_ID,
          carrierId: CARRIER_IDS.americanIntegrity,
          premium: "2840.00",
          coverageA: 385000,
          bindable: true,
          hurricaneDeductible: "2%",
          aopDeductible: "$2,500",
        }),
        carrier: carrier(CARRIER_IDS.americanIntegrity, "American Integrity"),
      },
      {
        quote: quote({
          id: ELENA_QUOTE_TAILROW_ID,
          carrierId: CARRIER_IDS.tailrow,
          premium: "3120.00",
          coverageA: 385000,
          bindable: true,
          hurricaneDeductible: "2%",
          aopDeductible: "$2,500",
          coverageGaps: ["No opening protection credit"],
        }),
        carrier: carrier(CARRIER_IDS.tailrow, "Tailrow"),
      },
    ],
  });

  it("defaults to the quoted/cheapest pair", () => {
    expect(defaultSelectedIds(elena)).toEqual([ELENA_QUOTE_AI_ID, ELENA_QUOTE_TAILROW_ID]);
  });

  it("flags premium as a diff and Coverage A as the same", () => {
    const diffs = diffQuotes(elena);
    expect(diffs.find((row) => row.key === "premium")?.same).toBe(false);
    expect(diffs.find((row) => row.key === "coverageA")?.same).toBe(true);
    expect(diffs.find((row) => row.key === "premium")?.values[ELENA_QUOTE_AI_ID]).toMatch(/2,840/);
  });

  it("writes plain English that a client can read", () => {
    const lines = plainEnglishLines(elena);
    expect(lines[0]).toMatch(/American Integrity is the cheapest/);
    expect(lines[0]).toMatch(/\$280/);
    expect(lines.some((line) => /Coverage A \$385,000/.test(line))).toBe(true);
    expect(lines.some((line) => /Quotes are not coverage/.test(line))).toBe(true);
    expect(lines.some((line) => /Tailrow notes: No opening protection credit/.test(line))).toBe(true);
  });

  it("explains a single Ana quote without inventing a second", () => {
    const lines = plainEnglishLines([
      {
        id: "ana-ai",
        source: "attempt",
        carrierName: "American Integrity",
        quoteNumber: "QT-21770008",
        premium: 5607.53,
        hurricaneDeductible: null,
        aopDeductible: null,
        coverageA: 321000,
        bindable: false,
        coverageGaps: [],
        result: "quoted",
        notes: null,
        why: "Roof age + RCS",
      },
    ]);
    expect(lines[0]).toMatch(/\$5,607\.53/);
    expect(lines[0]).toMatch(/\$321,000/);
    expect(lines[0]).toMatch(/not bindable/);
    expect(lines[1]).toMatch(/Select a second quote/);
  });

  it("keeps only ids that exist on the shop", () => {
    expect(parseSelectedIds(`${ELENA_QUOTE_AI_ID},missing`, [ELENA_QUOTE_AI_ID])).toEqual([
      ELENA_QUOTE_AI_ID,
    ]);
  });
});
