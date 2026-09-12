import { describe, expect, it } from "vitest";
import {
  appetiteSearchBlob,
  normalizeAppetiteRows,
  normalizeDontWriteRows,
} from "./appetite-rows";

describe("normalizeAppetiteRows", () => {
  it("keeps risk-factor columns and accept/decline", () => {
    const rows = normalizeAppetiteRows([
      {
        dateRequested: "2026-01-02",
        lob: "HO",
        roofAge: "12",
        waterHeater: "8",
        hvac: "5",
        electrical: "ok",
        claimsHistory: "1",
        acceptDecline: "accept",
        notes: "coastal ok",
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.lob).toBe("HO");
    expect(rows[0]?.roofAge).toBe("12");
    expect(rows[0]?.acceptDecline).toBe("accept");
  });
});

describe("appetiteSearchBlob", () => {
  it("searches structured rows across carriers", () => {
    const blob = appetiteSearchBlob({
      appetiteRows: [
        {
          id: "1",
          dateRequested: "2026-01-01",
          lob: "FLOOD",
          roofAge: "",
          waterHeater: "",
          hvac: "",
          electrical: "",
          claimsHistory: "",
          acceptDecline: "accept",
          notes: "writes AE zone",
        },
      ],
      dontWriteRows: [
        {
          id: "2",
          date: "2026-02-01",
          lob: "HO",
          reason: "Aluminum wiring",
          notes: "",
        },
      ],
    });
    expect(blob.writes.toLowerCase()).toContain("flood");
    expect(blob.excludes.toLowerCase()).toContain("aluminum");
  });
});

describe("normalizeDontWriteRows", () => {
  it("requires some content", () => {
    expect(normalizeDontWriteRows([{ date: "", lob: "", reason: "", notes: "" }])).toHaveLength(0);
    expect(
      normalizeDontWriteRows([{ date: "2026-03-01", lob: "AUTO", reason: "SR-22", notes: "" }]),
    ).toHaveLength(1);
  });
});
