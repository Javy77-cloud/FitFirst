import { describe, expect, it } from "vitest";
import {
  certificateFlagLabels,
  normalizeHolderName,
  parseCertificateFlags,
  rollupCertificateHolders,
} from "./certificate-holders";

describe("certificate holder polish", () => {
  it("reads waiver and primary & noncontributory checkboxes", () => {
    expect(parseCertificateFlags({ waiverOfSubrogation: "1", primaryNoncontributory: "on" })).toEqual(
      {
        waiverOfSubrogation: true,
        primaryNoncontributory: true,
      },
    );
    expect(parseCertificateFlags({})).toEqual({
      waiverOfSubrogation: false,
      primaryNoncontributory: false,
    });
    expect(
      certificateFlagLabels({ waiverOfSubrogation: true, primaryNoncontributory: true }),
    ).toEqual(["Waiver of subrogation", "Primary & noncontributory"]);
  });

  it("rolls Harbor holders without inventing a second certificate table", () => {
    const rows = rollupCertificateHolders(
      [
        {
          name: "Brevard County Parks",
          kind: "additional_interest",
          policyId: "harbor",
          policyNumber: "GL-HARBOR-2026",
          accountName: "Harbor Key Marine LLC",
        },
        {
          name: "Palm Bay Marina Dockage",
          kind: "certificate_holder",
          policyId: "harbor",
          policyNumber: "GL-HARBOR-2026",
          accountName: "Harbor Key Marine LLC",
        },
      ],
      [
        {
          holderName: "Brevard County Parks",
          status: "requested",
          waiverOfSubrogation: false,
          primaryNoncontributory: false,
        },
        {
          holderName: "Palm Bay Marina Dockage",
          status: "issued",
          waiverOfSubrogation: true,
          primaryNoncontributory: true,
        },
      ],
    );
    expect(rows).toHaveLength(2);
    const palm = rows.find((row) => row.name === "Palm Bay Marina Dockage");
    const brevard = rows.find((row) => row.name === "Brevard County Parks");
    expect(palm?.issuedStubs).toBe(1);
    expect(palm?.waiverOfSubrogation).toBe(true);
    expect(palm?.primaryNoncontributory).toBe(true);
    expect(brevard?.openCoi).toBe(1);
    expect(brevard?.waiverOfSubrogation).toBe(false);
    expect(normalizeHolderName("Palm Bay  Marina Dockage")).toBe("palm bay marina dockage");
  });
});
