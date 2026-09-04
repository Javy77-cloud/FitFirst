import { describe, expect, it } from "vitest";
import { socialLeadSource } from "./platforms";
import { inquiryById, SOCIAL_INQUIRY_SEEDS } from "./seeds";

describe("social inquiries", () => {
  it("maps each inbound stub to a Lead source the desk already understands", () => {
    expect(inquiryById("inq-instagram-priya")?.email).toBe("priya.shah@example.com");
    expect(inquiryById("missing")).toBeUndefined();
    for (const row of SOCIAL_INQUIRY_SEEDS) {
      expect(socialLeadSource(row.platform)).toBe(row.platform);
      expect(row.email).toContain("@");
      expect(row.excerpt.length).toBeGreaterThan(20);
    }
    expect(SOCIAL_INQUIRY_SEEDS.map((row) => row.platform)).toEqual([
      "facebook",
      "instagram",
      "x",
      "linkedin",
      "google_business_profile",
    ]);
  });
});
