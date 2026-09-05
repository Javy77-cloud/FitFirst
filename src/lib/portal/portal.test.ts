import { describe, expect, it } from "vitest";
import fixture from "@/lib/fixtures/ana-dib-ho3-2026-09-02.json";
import {
  CONTACT_ID,
  ELENA_CONTACT_ID,
  ELENA_PORTAL_TOKEN,
  ELENA_PORTAL_TOKEN_ID,
  HARBOR_ACCOUNT_ID,
  POLICY_CHANGE_LOG_IDS,
  HARBOR_CERTIFICATE_ID,
  HARBOR_PORTAL_TOKEN,
  HARBOR_PORTAL_TOKEN_ID,
} from "@/lib/fixtures/ids";
import { isPublicPath } from "@/lib/auth/access";
import { PORTAL_PING_KIND, PORTAL_REQUEST_KIND } from "@/lib/work-queue/types";
import { buildIdCardStub } from "./id-card";
import { findMatchingCertificate, isAnaContact, portalHref } from "./session";
import { formatChangeWorkNote, formatCoiWorkNote } from "./requests";
import { normalizeHolderName } from "./types";

const HARBOR_STUB = {
  id: HARBOR_CERTIFICATE_ID,
  tenantId: "11111111-1111-4111-8111-111111111111",
  accountId: HARBOR_ACCOUNT_ID,
  businessId: HARBOR_ACCOUNT_ID,
  certificateNumber: "COI-20260820-0001",
  holderName: "Palm Bay Marina Dockage",
  holderAddress: "100 Harbor Key Blvd, Palm Bay, FL 32905",
  jobLocation: "Slip B-14",
  lines: [],
  producerName: "FitFirst",
  issuedAt: new Date("2026-08-20T15:00:00.000Z"),
  status: "issued",
  createdAt: new Date("2026-08-20T15:00:00.000Z"),
  additionalInsured: null,
  specialWording: null,
  interestId: null,
};

describe("client portal stubs", () => {
  it("keeps /portal and token APIs public", () => {
    expect(isPublicPath("/portal")).toBe(true);
    expect(isPublicPath("/portal/elena-ruiz-2026")).toBe(true);
    expect(isPublicPath("/portal/harbor-key-2026/coi")).toBe(true);
    expect(isPublicPath("/api/portal/elena-ruiz-2026/files/abc")).toBe(true);
    expect(isPublicPath("/sign/idesk-demo")).toBe(true);
    expect(isPublicPath("/api/sign/idesk-demo/file")).toBe(true);
    expect(isPublicPath("/policies")).toBe(false);
  });

  it("never seeds or accepts an Ana portal token", () => {
    expect(isAnaContact(CONTACT_ID)).toBe(true);
    expect(isAnaContact(ELENA_CONTACT_ID)).toBe(false);
    expect(ELENA_PORTAL_TOKEN_ID).not.toBe(CONTACT_ID);
    expect(HARBOR_PORTAL_TOKEN_ID).not.toBe(CONTACT_ID);
    expect(ELENA_PORTAL_TOKEN_ID).not.toBe(POLICY_CHANGE_LOG_IDS.bindStatus);
    expect(ELENA_PORTAL_TOKEN).not.toMatch(/ana/i);
    expect(HARBOR_PORTAL_TOKEN).not.toMatch(/ana/i);
    expect(fixture.risk.coverageA).toBe(321000);
    expect(fixture.outcome.bindableAt321k).toBe(0);
  });

  it("reuses an issued COI stub when the holder already exists", () => {
    const hit = findMatchingCertificate([HARBOR_STUB], "  palm   bay marina dockage ");
    expect(hit?.certificateNumber).toBe("COI-20260820-0001");
    expect(findMatchingCertificate([HARBOR_STUB], "New GC LLC")).toBeNull();
    expect(normalizeHolderName("Palm Bay Marina Dockage")).toBe("palm bay marina dockage");
  });

  it("writes the full policy-change payload so the desk does not rekey", () => {
    const note = formatChangeWorkNote({
      partyName: "Elena Ruiz",
      policyNumber: "HO3-ELENA-2026",
      changeKind: "endorsement",
      reasonLabel: "Coverage change",
      effectiveDate: "2026-10-01",
      summary: "Raise Coverage A after rebuild. Same policy.",
    });
    expect(note).toContain("CLIENT PORTAL — policy change (no rekey)");
    expect(note).toContain("HO3-ELENA-2026");
    expect(note).toContain("Coverage change");
    expect(note).toContain("2026-10-01");
    expect(note).toContain("Raise Coverage A after rebuild. Same policy.");
    expect(note).toContain("Do not retype");
  });

  it("writes holder fields onto the COI work note", () => {
    const note = formatCoiWorkNote({
      partyName: "Harbor Key Marine LLC",
      policyNumber: "GL-HARBOR-2026",
      holderName: "Acme Dockage",
      holderAddress: "1 Marina Way, Palm Bay, FL 32905",
      jobLocation: "Slip C-2",
    });
    expect(note).toContain("CLIENT PORTAL — COI request (no rekey)");
    expect(note).toContain("Acme Dockage");
    expect(note).toContain("1 Marina Way, Palm Bay, FL 32905");
    expect(note).toContain("Slip C-2");
    expect(note).toContain("GL-HARBOR-2026");
  });

  it("builds a branded ID card stub from the in-force policy", () => {
    const card = buildIdCardStub({
      policy: {
        policyNumber: "HO3-ELENA-2026",
        lineOfBusiness: "HO",
        effectiveDate: new Date("2026-09-01T00:00:00.000Z"),
        expirationDate: new Date("2027-09-01T00:00:00.000Z"),
      },
      insuredName: "Elena Ruiz",
      carrierName: "American Integrity",
      brand: { agencyName: "Javier Garcia Insurance", phone: "321-429-1182" },
      documentId: "doc-1",
      filename: "ho3-elena-2026-id-card.txt",
    });
    expect(card.agencyName).toBe("Javier Garcia Insurance");
    expect(card.policyNumber).toBe("HO3-ELENA-2026");
    expect(card.insuredName).toBe("Elena Ruiz");
    expect(card.documentId).toBe("doc-1");
    expect(card.effectiveDate).toBe("2026-09-01");
  });

  it("uses in-desk portal request kinds, never email", () => {
    expect(PORTAL_REQUEST_KIND).toBe("portal_request");
    expect(PORTAL_PING_KIND).toBe("portal_ping");
    expect(PORTAL_REQUEST_KIND).not.toMatch(/email/i);
    expect(portalHref("elena-ruiz-2026", "changes")).toBe("/portal/elena-ruiz-2026/changes");
  });
});
