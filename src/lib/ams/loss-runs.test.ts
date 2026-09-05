import { describe, expect, it } from "vitest";
import { LOSS_RUN_STUB_DISCLAIMER, lossRunCsv, lossRunFilename, lossRunRows } from "./loss-runs";

describe("loss run CSV stub", () => {
  it("exports Elena wind inquiry without pretending it is a carrier loss run", () => {
    const rows = lossRunRows([
      {
        dateOfLoss: "2026-09-02T18:40:00.000Z",
        dateReported: "2026-09-03T15:10:00.000Z",
        causeType: "wind",
        status: "inquiry",
        carrierClaimNumber: null,
        lossLocation: "Harbor Isle Dr, Melbourne FL",
        description: "Screen enclosure bent after an afternoon squall.",
        reporterName: "Elena Ruiz",
      },
    ]);
    expect(rows[0]?.[2]).toBe("wind");
    expect(rows[0]?.[3]).toBe("inquiry");
    expect(rows[0]?.[4]).toBe("");
    const csv = lossRunCsv([
      {
        dateOfLoss: "2026-09-02",
        dateReported: "2026-09-03",
        causeType: "wind",
        status: "inquiry",
        carrierClaimNumber: null,
        lossLocation: "Harbor Isle",
        description: "Squall",
        reporterName: "Elena Ruiz",
      },
    ]);
    expect(csv).toContain(LOSS_RUN_STUB_DISCLAIMER);
    expect(csv).toContain("Elena Ruiz");
    expect(lossRunFilename("HO3-ELENA-2026", new Date("2026-09-05T12:00:00.000Z"))).toBe(
      "loss-run-HO3-ELENA-2026-stub-2026-09-05.csv",
    );
  });
});
