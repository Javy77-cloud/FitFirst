import { describe, expect, it } from "vitest";
import { buildSocialPulse } from "./pulse";

const items = [
  {
    id: "facebook" as const,
    name: "Facebook",
    initials: "Fb",
    connected: true,
    accountLabel: "FitFirst Insurance · Facebook Page",
  },
  {
    id: "instagram" as const,
    name: "Instagram",
    initials: "Ig",
    connected: true,
    accountLabel: "@fitfirst.insurance",
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
    accountLabel: "FitFirst Insurance · Palm Bay GBP",
  },
];

describe("social pulse", () => {
  it("never invents follower counts or seed inquiries", () => {
    const admin = buildSocialPulse({ items, role: "admin", allowAgentsMonitorGbp: false });
    expect(admin.gbpLocked).toBe(false);
    expect(admin.cards.every((card) => card.metrics === null)).toBe(true);
    expect(admin.inquiries).toEqual([]);
    expect(admin.connectedVisible).toBe(0);

    const agent = buildSocialPulse({ items, role: "agent", allowAgentsMonitorGbp: false });
    expect(agent.gbpLocked).toBe(true);
    const gbp = agent.cards.find((card) => card.id === "google_business_profile");
    expect(gbp?.locked).toBe(true);
    expect(gbp?.metrics).toBeNull();
    expect(agent.inquiries).toEqual([]);
  });

  it("unlocks GBP for agents after Admin enables monitoring", () => {
    const agent = buildSocialPulse({ items, role: "agent", allowAgentsMonitorGbp: true });
    const gbp = agent.cards.find((card) => card.id === "google_business_profile");
    expect(gbp?.locked).toBe(false);
    expect(gbp?.metrics).toBeNull();
    expect(agent.inquiries).toEqual([]);
  });

  it("keeps disconnected platforms empty — no invented live sync", () => {
    const pulse = buildSocialPulse({ items, role: "admin", allowAgentsMonitorGbp: true });
    const x = pulse.cards.find((card) => card.id === "x");
    expect(x?.connected).toBe(false);
    expect(x?.metrics).toBeNull();
    expect(pulse.inquiries.some((row) => row.platform === "x")).toBe(false);
  });
});
