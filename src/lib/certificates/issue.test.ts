import { describe, expect, it } from "vitest";
import {
  buildCertificateDraft,
  isInForceCertifiable,
  nextCertificateNumber,
  selectCertLines,
  toCertificateLine,
} from "./issue";
import type { PolicyForCert } from "./issue";

const AS_OF = new Date("2026-09-03T16:00:00.000Z");

function policy(partial: Partial<PolicyForCert> & Pick<PolicyForCert, "id" | "lineOfBusiness">): PolicyForCert {
  return {
    status: "active",
    policyNumber: "POL-1",
    carrierName: "Amerisure",
    effectiveDate: new Date("2026-03-01T00:00:00.000Z"),
    expirationDate: new Date("2027-03-01T00:00:00.000Z"),
    coverageLimits: { eachOccurrence: "1000000", generalAggregate: "2000000" },
    ...partial,
  };
}

describe("in-force GL/WC lines", () => {
  it("keeps active GL and WC and drops expired auto", () => {
    const lines = selectCertLines(
      [
        policy({ id: "gl", lineOfBusiness: "GL" }),
        policy({ id: "wc", lineOfBusiness: "WC", policyNumber: "WC-1", carrierName: "FFVA" }),
        policy({
          id: "auto",
          lineOfBusiness: "AUTO",
          status: "expired",
          policyNumber: "AU-1",
          expirationDate: new Date("2026-01-15T00:00:00.000Z"),
        }),
      ],
      AS_OF,
    );
    expect(lines.map((p) => p.lineOfBusiness)).toEqual(["GL", "WC"]);
  });

  it("rejects cancelled, expired, future-dated, and personal-lines policies", () => {
    expect(
      isInForceCertifiable(policy({ id: "x", lineOfBusiness: "GL", status: "cancelled" }), AS_OF),
    ).toBe(false);
    expect(
      isInForceCertifiable(
        policy({
          id: "x",
          lineOfBusiness: "WC",
          expirationDate: new Date("2026-08-01T00:00:00.000Z"),
        }),
        AS_OF,
      ),
    ).toBe(false);
    expect(
      isInForceCertifiable(
        policy({
          id: "x",
          lineOfBusiness: "GL",
          effectiveDate: new Date("2026-10-01T00:00:00.000Z"),
        }),
        AS_OF,
      ),
    ).toBe(false);
    expect(isInForceCertifiable(policy({ id: "x", lineOfBusiness: "HO" }), AS_OF)).toBe(false);
  });
});

describe("certificate draft", () => {
  const inForce = [
    policy({ id: "gl", lineOfBusiness: "GL", policyNumber: "AMS-GL-88421" }),
    policy({
      id: "wc",
      lineOfBusiness: "WC",
      policyNumber: "FFVA-WC-22911",
      carrierName: "FFVA Mutual",
      coverageLimits: {
        wcStatutory: "statutory",
        elEachAccident: "1000000",
      },
    }),
  ];

  it("requires holder name and address; job/location is optional", () => {
    expect(buildCertificateDraft(inForce, { holderName: "", holderAddress: "1 Main" }, AS_OF).ok).toBe(
      false,
    );
    expect(buildCertificateDraft(inForce, { holderName: "GC", holderAddress: "  " }, AS_OF).ok).toBe(
      false,
    );
    const noJob = buildCertificateDraft(
      inForce,
      { holderName: "Brevard GC", holderAddress: "1 Contractor Way, Melbourne, FL" },
      AS_OF,
    );
    expect(noJob.ok).toBe(true);
    if (noJob.ok) {
      expect(noJob.draft.jobLocation).toBeNull();
      expect(noJob.draft.lines).toHaveLength(2);
    }
  });

  it("blocks issue when the Business has no active GL or WC", () => {
    const result = buildCertificateDraft(
      [
        policy({
          id: "auto",
          lineOfBusiness: "AUTO",
          status: "expired",
          expirationDate: new Date("2025-12-01T00:00:00.000Z"),
        }),
      ],
      { holderName: "Holder", holderAddress: "Address" },
      AS_OF,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/active GL or WC/i);
    }
  });

  it("snapshots policy numbers, labels, and limits from in-force lines", () => {
    const result = buildCertificateDraft(
      inForce,
      {
        holderName: "Brevard County School Board",
        holderAddress: "2700 Judge Fran Jamieson Way, Viera, FL 32940",
        jobLocation: "Palm Bay Elementary restroom tile remodel",
      },
      AS_OF,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.draft.holderName).toBe("Brevard County School Board");
    expect(result.draft.jobLocation).toContain("Palm Bay Elementary");
    const gl = result.draft.lines.find((l) => l.lineOfBusiness === "GL");
    expect(gl?.policyNumber).toBe("AMS-GL-88421");
    expect(gl?.lineLabel).toMatch(/General Liability/);
    expect(gl?.limits.map((l) => l.key)).toContain("eachOccurrence");
    const wc = result.draft.lines.find((l) => l.lineOfBusiness === "WC");
    expect(wc?.limits.find((l) => l.key === "wcStatutory")?.value).toBe("statutory");
  });

  it("formats a sequential stub certificate number", () => {
    expect(nextCertificateNumber(0, AS_OF)).toBe("COI-20260903-0001");
    expect(nextCertificateNumber(12, AS_OF)).toBe("COI-20260903-0013");
  });

  it("does not treat a quote-shaped row as coverage", () => {
    const line = toCertificateLine(policy({ id: "gl", lineOfBusiness: "GL" }));
    expect(line.status).toBe("active");
    expect(line.policyNumber).not.toMatch(/QTE/i);
  });
});
