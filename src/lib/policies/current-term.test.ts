import { describe, expect, it } from "vitest";
import {
  businessDateKey,
  daysLeftEt,
  namedInsuredOrderChanged,
  normalizeNamedInsured,
  resolveCurrentTerm,
} from "@/lib/policies/current-term";
import { planIssuedTermWrite } from "@/lib/policies/issue-term";
import { auditCurrentTerms, formatAuditReport, sampleAuditRows } from "@/lib/policies/current-term-audit";
import { isClientStayingAvailable } from "@/lib/renewal/handled";

const noon = (day: string) => new Date(`${day}T12:00:00.000Z`);

describe("current term resolver", () => {
  it("keeps a renewal that starts tomorrow as Upcoming", () => {
    const asOf = noon("2026-09-24");
    const resolved = resolveCurrentTerm(
      {
        status: "active",
        lineOfBusiness: "HO3",
        policyNumber: "10641239",
        namedInsured: "Zoila Sample",
        premium: "1600",
        effectiveDate: "2025-07-30",
        expirationDate: "2026-09-25",
        terms: [
          { id: "old", role: "current", effective: "2025-07-30", expiration: "2026-09-25", premium: "1600" },
          { id: "new", role: "proposed", effective: "2026-09-25", expiration: "2027-09-25", premium: "1800" },
        ],
      },
      asOf,
    );
    expect(resolved.current?.id).toBe("old");
    expect(resolved.upcoming?.id).toBe("new");
    expect(resolved.band).toBe("renewal_window");
    expect(resolved.countsAsInForce).toBe(true);
    expect(resolved.daysLeft).toBe(1);
    expect(resolved.renewalAnchor).toBe("2026-09-25");
  });

  it("treats a term expiring today as not current", () => {
    const asOf = noon("2026-09-24");
    const resolved = resolveCurrentTerm(
      {
        status: "active",
        lineOfBusiness: "HO3",
        policyNumber: "ROBERT-1",
        namedInsured: "Robert Sample",
        effectiveDate: "2025-09-24",
        expirationDate: "2026-09-24",
        premium: "900",
      },
      asOf,
    );
    expect(resolved.current).toBeNull();
    expect(resolved.band).toBe("expired");
    expect(resolved.countsAsInForce).toBe(false);
    expect(resolved.daysLeft).toBe(0);
  });

  it("uses the Eastern calendar day after 8 PM", () => {
    // 8:30 PM EDT on Sep 24 is 00:30 UTC on Sep 25.
    const asOf = new Date("2026-09-25T00:30:00.000Z");
    expect(businessDateKey(asOf)).toBe("2026-09-24");
    const resolved = resolveCurrentTerm(
      {
        status: "active",
        lineOfBusiness: "AUTO",
        policyNumber: "AUTO-1",
        effectiveDate: "2026-03-01",
        expirationDate: "2026-09-25",
        premium: "1200",
      },
      asOf,
    );
    expect(resolved.current).not.toBeNull();
    expect(resolved.daysLeft).toBe(1);
    expect(daysLeftEt("2026-09-25", asOf)).toBe(1);
  });

  it("keeps the Eastern day across the November DST fallback", () => {
    // 1:30 AM EDT on Nov 1 2026, before clocks fall back at 2 AM.
    const before = new Date("2026-11-01T05:30:00.000Z");
    // 1:30 AM EST on Nov 1 2026, after the fallback.
    const after = new Date("2026-11-01T06:30:00.000Z");
    expect(businessDateKey(before)).toBe("2026-11-01");
    expect(businessDateKey(after)).toBe("2026-11-01");
    const ending = resolveCurrentTerm(
      {
        status: "active",
        effectiveDate: "2025-11-01",
        expirationDate: "2026-11-01",
        lineOfBusiness: "HO3",
      },
      before,
    );
    expect(ending.current).toBeNull();
    const starting = resolveCurrentTerm(
      {
        status: "active",
        effectiveDate: "2026-11-01",
        expirationDate: "2027-11-01",
        lineOfBusiness: "HO3",
        premium: "1000",
      },
      after,
    );
    expect(starting.current?.effective).toBe("2026-11-01");
    expect(starting.countsAsInForce).toBe(true);
  });

  it("does not let a lapsed status stay in force just because dates overlap", () => {
    const resolved = resolveCurrentTerm(
      {
        status: "lapsed",
        effectiveDate: "2026-01-01",
        expirationDate: "2027-01-01",
        lineOfBusiness: "HO3",
      },
      noon("2026-09-24"),
    );
    expect(resolved.band).toBe("lapsed");
    expect(resolved.countsAsInForce).toBe(false);
  });

  it("normalizes DEC named insured to First Last", () => {
    expect(normalizeNamedInsured("IORI DOMENIC")).toBe("Domenic Iori");
    expect(normalizeNamedInsured("IORI, DOMENIC")).toBe("Domenic Iori");
    expect(normalizeNamedInsured("Domenic Iori")).toBe("Domenic Iori");
    expect(normalizeNamedInsured("DE LA CRUZ, MARIA")).toBe("Maria De La Cruz");
    expect(namedInsuredOrderChanged("IORI DOMENIC")).toBe(true);
    expect(namedInsuredOrderChanged("Domenic Iori")).toBe(false);
  });
});

describe("DEC issue writes one line", () => {
  const ho3 = {
    id: "ho3",
    sourceProduct: "homeowners",
    lineOfBusiness: "HO3",
    policyNumber: "HO3-1",
    premium: "4000",
    effectiveDate: "2025-01-01",
    expirationDate: "2026-01-01",
    status: "active",
  };
  const flood = {
    id: "flood",
    sourceProduct: "flood",
    lineOfBusiness: "FLOOD",
    policyNumber: "FL-1",
    premium: "1892",
    effectiveDate: "2025-11-02",
    expirationDate: "2026-11-02",
    status: "active",
  };

  it("does not let a Flood DEC overwrite the HO3 term", () => {
    const plan = planIssuedTermWrite({
      product: "flood",
      lineOfBusiness: "FLOOD",
      policies: [ho3, flood],
      terms: [
        { id: "ho-term", policyId: "ho3", role: "current", effective: "2025-01-01", expiration: "2026-01-01", premium: "4000" },
        { id: "fl-term", policyId: "flood", role: "current", effective: "2025-11-02", expiration: "2026-11-02", premium: "1892" },
      ],
      dec: {
        lineOfBusiness: "FLOOD",
        effective: "2026-11-02",
        expiration: "2027-11-02",
        premium: "1910",
        policyNumber: "SF00102905",
      },
      asOf: noon("2026-09-24"),
      documentId: "flood-dec",
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.policyId).toBe("flood");
    expect(plan.demoteTermIds).toEqual([]);
    expect(plan.role).toBe("upcoming");
    expect(plan.policyPatch.effectiveDate).toBeUndefined();
    expect(plan.preserved).toContain("premium");
  });

  it("advances Current when a late DEC term has already started and keeps blank fields", () => {
    const plan = planIssuedTermWrite({
      product: "homeowners",
      lineOfBusiness: "HO3",
      policies: [ho3],
      terms: [
        { id: "old", role: "current", effective: "2025-07-30", expiration: "2026-07-30", premium: "1600" },
      ],
      dec: {
        lineOfBusiness: "HO3",
        effective: "2026-07-30",
        expiration: "2027-07-29",
        namedInsured: "SAMPLE ZOILA",
      },
      asOf: noon("2026-09-24"),
      documentId: "zoila-dec",
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.role).toBe("current");
    expect(plan.demoteTermIds).toEqual(["old"]);
    expect(plan.policyPatch.premium).toBeUndefined();
    expect(plan.preserved).toContain("premium");
    expect(plan.termPremium).toBe("1600");
    expect(plan.namedInsured).toBe("Zoila Sample");
    expect(businessDateKey(plan.policyPatch.effectiveDate)).toBe("2026-07-30");
    expect(businessDateKey(plan.policyPatch.expirationDate)).toBe("2027-07-29");
  });

  it("refuses a Flood DEC aimed at the HO3 policy", () => {
    const plan = planIssuedTermWrite({
      product: "homeowners",
      lineOfBusiness: "HO3",
      policies: [ho3, flood],
      dec: { lineOfBusiness: "FLOOD", effective: "2026-11-02", expiration: "2027-11-02", premium: "1910" },
      asOf: noon("2026-09-24"),
    });
    expect(plan.ok).toBe(false);
    if (plan.ok) return;
    expect(plan.reason).toBe("wrong_line");
  });
});

describe("client staying uses Eastern calendar days", () => {
  it("still includes the renewal day after 8 PM Eastern", () => {
    const asOf = new Date("2026-09-25T00:30:00.000Z");
    expect(isClientStayingAvailable("2026-09-24", asOf)).toBe(true);
    expect(isClientStayingAvailable("2026-12-23", asOf)).toBe(true);
    expect(isClientStayingAvailable("2026-12-24", asOf)).toBe(false);
  });
});

describe("audit report", () => {
  it("prints the documented sample format without a database", () => {
    const report = auditCurrentTerms(sampleAuditRows(noon("2026-09-24")), noon("2026-09-24"));
    const text = formatAuditReport(report, "sample");
    expect(text).toContain("FitFirst current-term audit");
    expect(text).toContain("mode: sample");
    expect(text).toContain("asOf: 2026-09-24 ET");
    expect(text).toContain("NAME_ORDER");
    expect(text).toContain("NO_CURRENT_TERM");
    expect(text).toContain("SHARED_DEC");
    expect(report.findings.some((row) => row.code === "MISSING_PREMIUM")).toBe(true);
  });
});
