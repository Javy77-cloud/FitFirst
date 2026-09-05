import { describe, expect, it } from "vitest";
import {
  ACORD_STUB_DISCLAIMER,
  additionalInsuredFromInterest,
  matchingIssuedCertificate,
  nextCertificateRequestStatus,
  validateCertificateRequest,
} from "./coi-requests";

describe("COI request flow", () => {
  it("requires holder name and address before a request can sit in the queue", () => {
    expect(validateCertificateRequest({ holderName: "", holderAddress: "1 Dock" }).ok).toBe(
      false,
    );
    expect(validateCertificateRequest({ holderName: "Dockage", holderAddress: "" }).ok).toBe(
      false,
    );
    const ok = validateCertificateRequest({
      holderName: "Brevard County Parks",
      holderAddress: "2725 Judge Fran Jamieson Way, Viera, FL",
      jobLocation: "Harbor Key slip",
      additionalInsured: "Brevard County Parks",
      specialWording: "Additional insured as respects marina operations only.",
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.additionalInsured).toBe("Brevard County Parks");
      expect(ok.specialWording).toContain("marina operations");
    }
  });

  it("issues or withdraws from requested, and reuses an existing holder stub", () => {
    expect(nextCertificateRequestStatus("requested", "issue")).toBe("issued");
    expect(nextCertificateRequestStatus("requested", "withdraw")).toBe("withdrawn");
    expect(nextCertificateRequestStatus("issued", "issue")).toBeNull();
    const match = matchingIssuedCertificate(
      [
        { holderName: "Palm Bay Marina Dockage", status: "issued" },
        { holderName: "Other", status: "void" },
      ],
      "palm bay marina dockage",
    );
    expect(match?.holderName).toBe("Palm Bay Marina Dockage");
    expect(ACORD_STUB_DISCLAIMER.toLowerCase()).toContain("not a licensed acord");
    expect(
      additionalInsuredFromInterest({ kind: "certificate_holder", name: "Brevard County Parks" }),
    ).toBe("Brevard County Parks");
    expect(additionalInsuredFromInterest({ kind: "mortgagee", name: "Bank" })).toBeNull();
  });
});
