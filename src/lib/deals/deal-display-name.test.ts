import { describe, expect, it } from "vitest";
import { dealDisplayName } from "@/components/deals/deal-host-face";
import { primaryApplicantDisplayName } from "@/lib/deals/deal-display-name";

describe("primaryApplicantDisplayName", () => {
  it("strips co-applicant append after ·", () => {
    expect(primaryApplicantDisplayName("Domenic Iori · James Iori")).toBe("Domenic Iori");
    expect(primaryApplicantDisplayName("Domenic Iori • James Iori")).toBe("Domenic Iori");
  });

  it("dedupes case-variant duplicates of the same person", () => {
    expect(primaryApplicantDisplayName("Rosa Castellanos ROSA CASTELLANOS")).toBe(
      "Rosa Castellanos",
    );
    expect(primaryApplicantDisplayName("Rosa Castellanos · ROSA CASTELLANOS")).toBe(
      "Rosa Castellanos",
    );
  });

  it("keeps a single primary name unchanged", () => {
    expect(primaryApplicantDisplayName("Domenic Iori")).toBe("Domenic Iori");
    expect(primaryApplicantDisplayName("Rosa Castellanos")).toBe("Rosa Castellanos");
  });

  it("does not collapse two different people into one without a separator", () => {
    expect(primaryApplicantDisplayName("Domenic Iori James Iori")).toBe("Domenic Iori James Iori");
  });
});

describe("dealDisplayName", () => {
  it("prefers cleaned insured over a mashed title", () => {
    expect(
      dealDisplayName({
        insured: "Domenic Iori · James Iori",
        title: "Domenic Iori James Iori / HO3",
      }),
    ).toBe("Domenic Iori");
    expect(
      dealDisplayName({
        insured: "Rosa Castellanos ROSA CASTELLANOS",
        title: "ROSA CASTELLANOS / MHO",
      }),
    ).toBe("Rosa Castellanos");
  });

  it("falls back to cleaned title when insured is blank", () => {
    expect(dealDisplayName({ insured: "—", title: "Rosa Castellanos ROSA CASTELLANOS" })).toBe(
      "Rosa Castellanos",
    );
  });
});
