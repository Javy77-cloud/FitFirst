import { describe, expect, it } from "vitest";
import { CARRIER_DOWNLOAD_STUB_REASON } from "@/lib/domain-ams";
import { attemptCarrierDownload, carrierDownloadCatalog } from "./carrier-download";

describe("IVANS / AL3 plug points", () => {
  it("always reports Not connected and never invents carrier fees", () => {
    const catalog = carrierDownloadCatalog([
      {
        provider: "ivans",
        status: "not_connected",
        lastAttemptAt: null,
        lastError: null,
      },
    ]);
    expect(catalog).toHaveLength(2);
    expect(catalog.every((row) => row.connected === false)).toBe(true);
    expect(catalog.every((row) => row.status === "not_connected")).toBe(true);
    expect(catalog.map((row) => row.provider)).toEqual(["ivans", "al3"]);
    expect(attemptCarrierDownload("ivans")).toEqual({
      ok: false,
      reason: CARRIER_DOWNLOAD_STUB_REASON,
      status: "not_connected",
    });
    expect(JSON.stringify(catalog).toLowerCase()).not.toMatch(/\$[\d,]+/);
    expect(catalog.every((row) => !row.connected)).toBe(true);
  });
});
