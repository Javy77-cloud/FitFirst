import { describe, expect, it } from "vitest";
import { buildSocialPulse } from "./pulse";
import { SOCIAL_PULSE_SEEDS } from "./seeds";

const items = [
  {
    id: "facebook" as const,
    name: "Facebook",
    initials: "Fb",
    connected: true,
    accountLabel: "FitFirst Insurance · Facebook Page stub",
  },
  {
    id: "instagram" as const,
    name: "Instagram",
    initials: "Ig",
    connected: true,
    accountLabel: "@fitfirst.insurance · Instagram stub",
  },
  {
    id: "x" as const,
    name: "X (Twitter)",
    initials: "X",
    connected: false,
    accountLabel: null,
  },
  {
    id: "linkedin" as const,
    name: "LinkedIn",
    initials: "Li",
    connected: false,
    accountLabel: null,
  },
  {
    id: "google_business_profile" as const,
    name: "Google Business Profile",
    initials: "Gb",
    connected: true,
    accountLabel: "FitFirst Insurance · Palm Bay GBP stub",
  },
];

describe("social pulse", () => {
  it("shows demo numbers only for connected stubs the viewer may see", () => {
    const admin = buildSocialPulse({ items, role: "admin", allowAgentsMonitorGbp: false });
    expect(admin.connectedVisible).toBe(3);
    expect(admin.gbpLocked).toBe(false);
    const fb = admin.cards.find((card) => card.id === "facebook");
    expect(fb?.metrics?.followers).toBe(SOCIAL_PULSE_SEEDS.facebook.followers);
    expect(fb?.metrics?.views).toBe(12600);
    expect(admin.inquiries.map((row) => row.platform).sort()).toEqual([
      "facebook",
      "google_business_profile",
      "instagram",
    ]);

    const agent = buildSocialPulse({ items, role: "agent", allowAgentsMonitorGbp: false });
    expect(agent.gbpLocked).toBe(true);
    expect(agent.connectedVisible).toBe(2);
    const gbp = agent.cards.find((card) => card.id === "google_business_profile");
    expect(gbp?.locked).toBe(true);
    expect(gbp?.metrics).toBeNull();
    expect(agent.inquiries.some((row) => row.platform === "google_business_profile")).toBe(false);
    expect(agent.inquiries.some((row) => row.id === "inq-instagram-priya")).toBe(true);
  });

  it("unlocks GBP pulse for agents after Admin enables monitoring", () => {
    const agent = buildSocialPulse({ items, role: "agent", allowAgentsMonitorGbp: true });
    const gbp = agent.cards.find((card) => card.id === "google_business_profile");
    expect(gbp?.locked).toBe(false);
    expect(gbp?.metrics?.views).toBe(SOCIAL_PULSE_SEEDS.google_business_profile.views);
    expect(agent.inquiries.some((row) => row.id === "inq-gbp-denise")).toBe(true);
  });

  it("keeps disconnected platforms empty — no invented live sync", () => {
    const pulse = buildSocialPulse({ items, role: "admin", allowAgentsMonitorGbp: true });
    const x = pulse.cards.find((card) => card.id === "x");
    expect(x?.connected).toBe(false);
    expect(x?.metrics).toBeNull();
    expect(pulse.inquiries.some((row) => row.platform === "x")).toBe(false);
  });
});
