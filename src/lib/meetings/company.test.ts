import { describe, expect, it } from "vitest";
import { MEETING_TYPES } from "./types";
import {
  COMPANY_EVENT_TYPES,
  INVITE_AUDIENCES,
  agentIdsForTerritory,
  companyEventChipLabel,
  inviteAudienceSummary,
  isCompanyEventType,
  isPersonalMeetingType,
  normalizeVideoUrl,
  resolveInviteeIds,
  videoHrefFromEvent,
} from "./company";

const javy = { id: "admin", name: "Javy Rivera", role: "admin", active: true };
const maya = { id: "agent", name: "Maya Chen", role: "agent", active: true };
const inactive = { id: "gone", name: "Left Desk", role: "agent", active: false };

const officeMemberships = [
  { userId: "admin", officeId: "palm-bay" },
  { userId: "agent", officeId: "palm-bay" },
  { userId: "admin", officeId: "savannah" },
];
const territoryMemberships = [{ userId: "admin", territoryId: "space-coast" }];
const territoryOfficeLinks = [{ territoryId: "space-coast", officeId: "palm-bay" }];

describe("company / training event types", () => {
  it("adds Company meeting and Training without removing personal types", () => {
    expect(COMPANY_EVENT_TYPES).toEqual(["company", "training"]);
    expect(MEETING_TYPES).toEqual(["video", "in_home", "in_office"]);
    expect(isPersonalMeetingType("video")).toBe(true);
    expect(isPersonalMeetingType("training")).toBe(false);
    expect(isCompanyEventType("training")).toBe(true);
    expect(isCompanyEventType("in_office")).toBe(false);
    expect(companyEventChipLabel("training")).toBe("Training");
    expect(companyEventChipLabel("video")).toBeNull();
  });

  it("lists the four invite audiences", () => {
    expect(INVITE_AUDIENCES).toEqual(["agency", "office", "territory", "management"]);
    expect(inviteAudienceSummary({ audience: "agency" })).toBe("Whole agency");
    expect(inviteAudienceSummary({ audience: "office", officeName: "Palm Bay" })).toBe(
      "Office · Palm Bay",
    );
  });
});

describe("invite resolution", () => {
  it("invites the whole agency, skipping inactive users", () => {
    expect(
      resolveInviteeIds({
        audience: "agency",
        users: [javy, maya, inactive],
        officeMemberships,
        territoryMemberships,
        territoryOfficeLinks,
      }),
    ).toEqual(["admin", "agent"]);
  });

  it("invites management only", () => {
    expect(
      resolveInviteeIds({
        audience: "management",
        users: [javy, maya],
        officeMemberships,
        territoryMemberships,
        territoryOfficeLinks,
      }),
    ).toEqual(["admin"]);
  });

  it("invites an office", () => {
    expect(
      resolveInviteeIds({
        audience: "office",
        officeId: "savannah",
        users: [javy, maya],
        officeMemberships,
        territoryMemberships,
        territoryOfficeLinks,
      }),
    ).toEqual(["admin"]);
    expect(
      resolveInviteeIds({
        audience: "office",
        officeId: "palm-bay",
        users: [javy, maya],
        officeMemberships,
        territoryMemberships,
        territoryOfficeLinks,
      }),
    ).toEqual(["admin", "agent"]);
  });

  it("invites a territory via membership plus linked offices", () => {
    expect(
      agentIdsForTerritory({
        territoryId: "space-coast",
        linkedOfficeIds: ["palm-bay"],
        officeMemberships,
        territoryMemberships,
      }),
    ).toEqual(["admin", "agent"]);
    expect(
      resolveInviteeIds({
        audience: "territory",
        territoryId: "space-coast",
        users: [javy, maya],
        officeMemberships,
        territoryMemberships,
        territoryOfficeLinks,
      }),
    ).toEqual(["admin", "agent"]);
  });
});

describe("video link", () => {
  it("accepts Zoom / Meet / other http(s) URLs and rejects junk", () => {
    expect(normalizeVideoUrl("https://zoom.us/j/fitfirst-training")).toBe(
      "https://zoom.us/j/fitfirst-training",
    );
    expect(normalizeVideoUrl("https://meet.google.com/fit-first")).toBe(
      "https://meet.google.com/fit-first",
    );
    expect(normalizeVideoUrl("not-a-url")).toBeNull();
    expect(
      videoHrefFromEvent({
        videoUrl: "https://zoom.us/j/fitfirst-training",
        meetingType: "training",
      }),
    ).toBe("https://zoom.us/j/fitfirst-training");
  });
});
