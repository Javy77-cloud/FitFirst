import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { MISSING_GEMINI_KEY_MESSAGE } from "@/lib/extraction/gemini/key";
import { mintFailureToast } from "./mint-gate";
import {
  autoDecCacheSupportsFill,
  DEC_FILE_MISSING_MESSAGE,
  homeDecCacheSupportsFill,
  loadGeminiRows,
  readDecPdfBytes,
  shouldForceAutoDecReread,
  shouldForceHomeDecReread,
  type GeminiMintRow,
} from "./load-gemini-rows";

const ROSA_BLOB_KEY =
  "11111111-1111-1111-1111-111111111111/5d4a4c04-a477-4691-8cc7-32d5ccf70351/cbd6719e-4d8e-4ed8-820e-0b3f1c07aa5f.pdf";

function source(file: string) {
  return readFileSync(file, "utf8");
}

function extractOk(fields: Array<{ fieldKey: string; normalizedValue: string }>) {
  return vi.fn(async (buffer: Buffer) => {
    expect(buffer.toString()).toContain("%PDF");
    return {
      ok: true as const,
      message: "ok",
      result: {
        fields: fields.map((field) => ({
          ...field,
          rawValue: field.normalizedValue,
          confidence: 0.94,
          flagged: false,
        })),
      },
    };
  });
}

describe("loadGeminiRows document store", () => {
  it("reads PDF bytes through the blob/document-store reader", async () => {
    const readStoredFile = vi.fn(async (storagePath: string) => {
      expect(storagePath).toBe(ROSA_BLOB_KEY);
      return Buffer.from("%PDF-1.4 rosa-dec");
    });
    const extractWithGeminiPdf = extractOk([
      { fieldKey: "policy_number", normalizedValue: "HO3 0140119 05 26" },
      { fieldKey: "current_premium", normalizedValue: "3383" },
    ]);
    const persistRows = vi.fn(async () => undefined);

    const result = await loadGeminiRows(
      {
        docId: "cbd6719e-4d8e-4ed8-820e-0b3f1c07aa5f",
        storagePath: ROSA_BLOB_KEY,
        mimeType: "application/pdf",
        filename: "Rosa Castellanos Florida Peninsula HO3 Dec Page.pdf",
      },
      {
        readStoredFile,
        loadGeminiApiKey: async () => "test-key",
        extractWithGeminiPdf,
        persistRows,
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.cached).toBe(false);
    expect(result.rows.map((row) => row.fieldKey)).toEqual(["policy_number", "current_premium"]);
    expect(readStoredFile).toHaveBeenCalledTimes(1);
    expect(readStoredFile).toHaveBeenCalledWith(ROSA_BLOB_KEY);
    expect(extractWithGeminiPdf).toHaveBeenCalledTimes(1);
    expect(persistRows).toHaveBeenCalledTimes(1);
  });

  it("sends Auto current-policy extracts with the auto shop line", async () => {
    const extractWithGeminiPdf = extractOk([
      { fieldKey: "policy_number", normalizedValue: "612345678 101 1" },
      { fieldKey: "current_premium", normalizedValue: "2109.00" },
      { fieldKey: "effective_date", normalizedValue: "2026-09-21" },
    ]);
    const result = await loadGeminiRows(
      {
        docId: "travelers-dec",
        storagePath: ROSA_BLOB_KEY,
        mimeType: "application/pdf",
        filename: "Travelers policy.pdf",
        shopLine: "auto",
        docType: "current_policy",
      },
      {
        readStoredFile: async () => Buffer.from("%PDF-1.4 travelers"),
        loadGeminiApiKey: async () => "test-key",
        extractWithGeminiPdf,
      },
    );
    expect(result.ok).toBe(true);
    expect(extractWithGeminiPdf).toHaveBeenCalledWith(
      expect.any(Buffer),
      "current_policy",
      expect.objectContaining({ shopLine: "auto", filename: "Travelers policy.pdf" }),
    );
  });

  it("fails loud when the document store cannot read the file", async () => {
    const readStoredFile = vi.fn(async () => null);
    const extractWithGeminiPdf = vi.fn();
    const log = vi.fn();

    const result = await loadGeminiRows(
      {
        docId: "cbd6719e-4d8e-4ed8-820e-0b3f1c07aa5f",
        storagePath: ROSA_BLOB_KEY,
        mimeType: "application/pdf",
        filename: "rosa-dec.pdf",
      },
      {
        readStoredFile,
        loadGeminiApiKey: async () => "test-key",
        extractWithGeminiPdf,
        log,
      },
    );

    expect(result).toEqual({
      ok: false,
      reason: "need_dec_file",
      message: DEC_FILE_MISSING_MESSAGE,
    });
    expect(extractWithGeminiPdf).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      "dec extract: could not read storage_path",
      expect.objectContaining({ storagePath: ROSA_BLOB_KEY }),
    );
  });

  it("fails loud when storage_path is missing", async () => {
    const readStoredFile = vi.fn();
    const result = await loadGeminiRows(
      { docId: "doc-1", storagePath: "" },
      { readStoredFile, loadGeminiApiKey: async () => "test-key" },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("need_dec_file");
    expect(readStoredFile).not.toHaveBeenCalled();
  });

  it("reads the PDF and the Gemini key at the same time", async () => {
    let started = 0;
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const readStoredFile = vi.fn(async () => {
      started += 1;
      await gate;
      return Buffer.from("%PDF-1.4 parallel");
    });
    const loadGeminiApiKey = vi.fn(async () => {
      started += 1;
      await gate;
      return "test-key";
    });
    const pending = loadGeminiRows(
      { docId: "doc-parallel", storagePath: ROSA_BLOB_KEY, force: true },
      {
        readStoredFile,
        loadGeminiApiKey,
        extractWithGeminiPdf: extractOk([{ fieldKey: "premium", normalizedValue: "1" }]),
      },
    );
    await vi.waitFor(() => {
      expect(started).toBe(2);
    });
    release();
    const result = await pending;
    expect(result.ok).toBe(true);
    expect(readStoredFile).toHaveBeenCalledTimes(1);
    expect(loadGeminiApiKey).toHaveBeenCalledTimes(1);
  });

  it("fails loud when the Gemini key is missing", async () => {
    const result = await loadGeminiRows(
      { docId: "doc-1", storagePath: ROSA_BLOB_KEY },
      {
        readStoredFile: async () => Buffer.from("%PDF-1.4"),
        loadGeminiApiKey: async () => "",
      },
    );
    expect(result).toEqual({
      ok: false,
      reason: "need_gemini",
      message: MISSING_GEMINI_KEY_MESSAGE,
    });
  });

  it("reuses cached extracted rows and skips the blob reader", async () => {
    const readStoredFile = vi.fn();
    const result = await loadGeminiRows(
      { docId: "doc-1", storagePath: ROSA_BLOB_KEY },
      {
        readStoredFile,
        loadCachedRows: async () => [
          {
            fieldKey: "policy_number",
            normalizedValue: "HO-cached",
            rawValue: "HO-cached",
            confidence: 0.9,
            flagged: false,
          },
          {
            fieldKey: "premium",
            normalizedValue: "3383",
            rawValue: "3383",
            confidence: 0.9,
            flagged: false,
          },
          {
            fieldKey: "effective_date",
            normalizedValue: "2026-09-01",
            rawValue: "2026-09-01",
            confidence: 0.9,
            flagged: false,
          },
        ],
      },
    );
    expect(result).toEqual({
      ok: true,
      cached: true,
      documentKind: null,
      geminiPreview: null,
      rows: [
        expect.objectContaining({ fieldKey: "policy_number", normalizedValue: "HO-cached" }),
        expect.objectContaining({ fieldKey: "premium", normalizedValue: "3383" }),
        expect.objectContaining({ fieldKey: "effective_date", normalizedValue: "2026-09-01" }),
      ],
    });
    expect(readStoredFile).not.toHaveBeenCalled();
  });

  it("does not treat a partial cache as a successful extract", async () => {
    const readStoredFile = vi.fn(async () => Buffer.from("%PDF-1.4"));
    const extractWithGeminiPdf = extractOk([
      { fieldKey: "policy_number", normalizedValue: "HO3 0140119 05 26" },
      { fieldKey: "premium", normalizedValue: "3383" },
      { fieldKey: "effective_date", normalizedValue: "2026-09-01" },
    ]);
    const result = await loadGeminiRows(
      { docId: "doc-1", storagePath: ROSA_BLOB_KEY },
      {
        readStoredFile,
        loadCachedRows: async () => [
          {
            fieldKey: "named_insured",
            normalizedValue: "Rosa Castellanos",
            rawValue: "Rosa Castellanos",
            confidence: 0.9,
            flagged: false,
          },
        ],
        loadGeminiApiKey: async () => "test-key",
        extractWithGeminiPdf,
      },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.cached).toBe(false);
    expect(extractWithGeminiPdf).toHaveBeenCalledTimes(1);
  });

  it("returns need_gemini without calling extract when the key is missing", async () => {
    const extractWithGeminiPdf = vi.fn();
    const persistRows = vi.fn();
    const log = vi.fn();
    const result = await loadGeminiRows(
      { docId: "doc-1", storagePath: ROSA_BLOB_KEY },
      {
        readStoredFile: async () => Buffer.from("%PDF-1.4"),
        loadGeminiApiKey: async () => "",
        extractWithGeminiPdf,
        persistRows,
        log,
      },
    );
    expect(result).toEqual({
      ok: false,
      reason: "need_gemini",
      message: MISSING_GEMINI_KEY_MESSAGE,
    });
    expect(extractWithGeminiPdf).not.toHaveBeenCalled();
    expect(persistRows).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      "dec extract: GEMINI_API_KEY is not configured — refusing extract",
      expect.objectContaining({ reason: "need_gemini" }),
    );
    expect(mintFailureToast("need_gemini")).toEqual({ key: "gemini-needs-key", kind: "error" });
  });

  it("treats persistRows failure as best-effort and still returns rows", async () => {
    const persistRows = vi.fn(async () => {
      throw new Error(
        'Failed query: insert into "extracted_fields" ("risk_id") values (null)',
      );
    });
    const log = vi.fn();
    const result = await loadGeminiRows(
      {
        docId: "43ebbf5d-0000-0000-0000-000000000001",
        storagePath: ROSA_BLOB_KEY,
      },
      {
        readStoredFile: async () => Buffer.from("%PDF-1.4 compare-dec"),
        loadGeminiApiKey: async () => "test-key",
        extractWithGeminiPdf: extractOk([
          { fieldKey: "current_carrier", normalizedValue: "America" },
          { fieldKey: "current_premium", normalizedValue: "2547.00" },
          { fieldKey: "effective_date", normalizedValue: "2026-10-01" },
          { fieldKey: "expiration_date", normalizedValue: "2027-10-01" },
        ]),
        persistRows,
        log,
      },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.cached).toBe(false);
    expect(result.rows.map((r) => r.fieldKey)).toContain("current_carrier");
    expect(persistRows).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(
      "dec extract: persist cache failed (best-effort)",
      expect.objectContaining({ documentId: "43ebbf5d-0000-0000-0000-000000000001" }),
    );
  });

  it("re-extracts when force is set even if cache exists", async () => {
    const readStoredFile = vi.fn(async () => Buffer.from("%PDF-1.4 remint"));
    const extractWithGeminiPdf = extractOk([{ fieldKey: "premium", normalizedValue: "3383" }]);
    const result = await loadGeminiRows(
      { docId: "doc-1", storagePath: ROSA_BLOB_KEY, force: true },
      {
        readStoredFile,
        loadCachedRows: async () => [
          {
            fieldKey: "policy_number",
            normalizedValue: "stale",
            rawValue: "stale",
            confidence: 0.1,
            flagged: true,
          },
        ],
        loadGeminiApiKey: async () => "test-key",
        extractWithGeminiPdf,
      },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.cached).toBe(false);
    expect(result.rows[0]?.normalizedValue).toBe("3383");
    expect(readStoredFile).toHaveBeenCalledWith(ROSA_BLOB_KEY);
  });
});

describe("readDecPdfBytes + mint failure toast", () => {
  it("logs a miss instead of inventing empty extract bytes", async () => {
    const log = vi.fn();
    const miss = await readDecPdfBytes("blob-key.pdf", async () => null, log);
    expect(miss).toEqual({ ok: false, message: DEC_FILE_MISSING_MESSAGE });
    expect(log).toHaveBeenCalled();
  });

  it("maps extract failures to agent-facing flash keys", () => {
    expect(mintFailureToast("need_dec_file")).toEqual({ key: "need-dec-file", kind: "error" });
    expect(mintFailureToast("need_gemini")).toEqual({ key: "gemini-needs-key", kind: "error" });
    expect(mintFailureToast("extract_failed")).toEqual({ key: "dec-extract-failed", kind: "error" });
  });

  it("wires mint and dec-prompt through the shared document store", () => {
    expect(source("src/app/actions/policy-mint.ts")).toMatch(/loadGeminiRows/);
    expect(source("src/app/actions/policy-mint.ts")).toMatch(/readStoredFile/);
    expect(source("src/app/actions/policy-mint.ts")).toMatch(/if \(!extracted\.ok\)/);
    expect(source("src/lib/policy/load-gemini-rows.ts")).toMatch(/need_dec_file/);
    expect(source("src/app/actions/policy-mint.ts")).not.toMatch(/readFile\(path\.join\(uploadRoot/);
    expect(source("src/app/actions/declaration-prompt.ts")).toMatch(/readDecPdfBytes|readStoredFile/);
    expect(source("src/app/actions/declaration-prompt.ts")).not.toMatch(/readFile\(path\.join\(uploadRoot/);
    expect(source("src/components/deal/issue-policy-from-dec.tsx")).toMatch(/mintFailureToast/);
    expect(source("src/components/deal/issue-policy-from-dec.tsx")).toMatch(/Re-read declaration/);
    expect(source("src/components/deal/issue-policy-from-dec.tsx")).toMatch(/mint\(undefined, true\)/);
    expect(source("src/app/actions/policy-mint.ts")).toMatch(/evaluateMintExtract/);
    expect(source("src/app/actions/policy-mint.ts")).toMatch(/geminiPreview/);
    expect(source("src/components/deal/issue-policy-from-dec.tsx")).toMatch(/mintFailureFlashText/);
    expect(source("src/app/actions/policy-mint.ts")).not.toMatch(/FF-MINT/);
    expect(source("src/lib/policy/load-gemini-rows.ts")).toMatch(/Promise\.allSettled\(\[/);
    expect(source("src/lib/policy/mint-gate.ts")).toMatch(/need_dec_file/);
    expect(source("src/lib/policy/mint-gate.ts")).toMatch(/need_dec_fields/);
  });
});

const mintCache: GeminiMintRow[] = [
  { fieldKey: "premium", normalizedValue: "1200.00", rawValue: "1200.00", confidence: 0.9, flagged: false },
  { fieldKey: "effective_date", normalizedValue: "2026-06-01", rawValue: "2026-06-01", confidence: 0.9, flagged: false },
];

describe("auto fill confirm does not re-read Gemini", () => {
  it("treats policy premium alone as a hollow auto cache", () => {
    expect(autoDecCacheSupportsFill(mintCache)).toBe(false);
    expect(
      autoDecCacheSupportsFill([
        ...mintCache,
        {
          fieldKey: "vehicle_1_comp_deductible",
          normalizedValue: "500",
          rawValue: "500",
          confidence: 0.9,
          flagged: false,
        },
      ]),
    ).toBe(true);
  });

  it("re-reads on the first click when the saved extract has no coverage amounts", () => {
    const now = new Date("2026-09-25T20:00:00.000Z");
    expect(
      shouldForceAutoDecReread({
        manualAuto: true,
        rows: mintCache,
        newestAt: new Date("2026-09-25T19:59:00.000Z"),
        now,
        reuseFresh: false,
      }),
    ).toBe(true);
  });

  it("skips Gemini on confirm when preview just stored the extract", () => {
    const now = new Date("2026-09-25T20:00:00.000Z");
    expect(
      shouldForceAutoDecReread({
        manualAuto: true,
        rows: mintCache,
        newestAt: new Date("2026-09-25T19:50:00.000Z"),
        now,
        reuseFresh: true,
      }),
    ).toBe(false);
  });

  it("re-reads a hollow cache that is older than this preview", () => {
    const now = new Date("2026-09-25T20:00:00.000Z");
    expect(
      shouldForceAutoDecReread({
        manualAuto: true,
        rows: mintCache,
        newestAt: new Date("2026-09-20T20:00:00.000Z"),
        now,
        reuseFresh: true,
      }),
    ).toBe(true);
  });

  it("re-reads a home cache that has dwelling limits and no coverage-row premiums", () => {
    const now = new Date("2026-09-25T20:00:00.000Z");
    const stale: GeminiMintRow[] = [
      ...mintCache,
      {
        fieldKey: "coverage_a",
        normalizedValue: "337000",
        rawValue: "337000",
        confidence: 0.9,
        flagged: false,
      },
      {
        fieldKey: "aop_deductible",
        normalizedValue: "1000",
        rawValue: "1000",
        confidence: 0.9,
        flagged: false,
      },
    ];
    expect(homeDecCacheSupportsFill(stale)).toBe(false);
    expect(homeDecCacheSupportsFill(mintCache)).toBe(true);
    expect(
      shouldForceHomeDecReread({
        manualHome: true,
        rows: stale,
        newestAt: new Date("2026-09-20T20:00:00.000Z"),
        now,
        reuseFresh: true,
      }),
    ).toBe(true);
    expect(
      shouldForceHomeDecReread({
        manualHome: false,
        rows: stale,
        newestAt: new Date("2026-09-20T20:00:00.000Z"),
        now,
        reuseFresh: false,
      }),
    ).toBe(false);
    const fresh: GeminiMintRow[] = [
      ...stale,
      {
        fieldKey: "coverage_a_premium",
        normalizedValue: "1310.55",
        rawValue: "1310.55",
        confidence: 0.9,
        flagged: false,
      },
      {
        fieldKey: "coverage_b_premium",
        normalizedValue: "Included",
        rawValue: "Included",
        confidence: 0.9,
        flagged: false,
      },
    ];
    expect(homeDecCacheSupportsFill(fresh)).toBe(false);
    expect(
      shouldForceHomeDecReread({
        manualHome: true,
        rows: fresh,
        newestAt: new Date("2026-01-01T00:00:00.000Z"),
        now,
        reuseFresh: false,
      }),
    ).toBe(true);
    const rated: GeminiMintRow[] = [
      ...fresh,
      {
        fieldKey: "year_of_construction",
        normalizedValue: "24",
        rawValue: "24",
        confidence: 0.9,
        flagged: false,
      },
      {
        fieldKey: "construction_type",
        normalizedValue: "Masonry",
        rawValue: "Masonry",
        confidence: 0.9,
        flagged: false,
      },
    ];
    expect(homeDecCacheSupportsFill(rated)).toBe(true);
    const unitOwner: GeminiMintRow[] = [
      {
        fieldKey: "loss_assessment",
        normalizedValue: "2000",
        rawValue: "2000",
        confidence: 0.9,
        flagged: false,
      },
      {
        fieldKey: "limited_fungi",
        normalizedValue: "10000/10000",
        rawValue: "10000/10000",
        confidence: 0.9,
        flagged: false,
      },
    ];
    expect(homeDecCacheSupportsFill(unitOwner)).toBe(false);
    expect(
      homeDecCacheSupportsFill([
        ...unitOwner,
        {
          fieldKey: "catastrophic_ground_cover_collapse_premium",
          normalizedValue: "Included",
          rawValue: "Incl",
          confidence: 0.9,
          flagged: false,
        },
      ]),
    ).toBe(true);
    expect(
      shouldForceHomeDecReread({
        manualHome: true,
        rows: rated,
        newestAt: new Date("2026-01-01T00:00:00.000Z"),
        now,
        reuseFresh: false,
      }),
    ).toBe(false);
  });

  it("keeps an older cache once deductibles are already stored", () => {
    const now = new Date("2026-09-25T20:00:00.000Z");
    const rows: GeminiMintRow[] = [
      ...mintCache,
      {
        fieldKey: "liability_bi_premium",
        normalizedValue: "640",
        rawValue: "640",
        confidence: 0.9,
        flagged: false,
      },
    ];
    expect(
      shouldForceAutoDecReread({
        manualAuto: true,
        rows,
        newestAt: new Date("2026-01-01T00:00:00.000Z"),
        now,
        reuseFresh: false,
      }),
    ).toBe(false);
  });
});
