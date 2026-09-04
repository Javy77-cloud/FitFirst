import { describe, expect, it } from "vitest";
import {
  defaultVideoProvider,
  homeAddressFromRecords,
  meetingNotes,
  officeMeetingAddress,
  pipelineCardShowsAsk,
  PIPELINE_CARD_ACTIONS,
  resolveMeetingPlace,
  videoLinkFor,
} from "./types";

describe("meeting place", () => {
  it("pulls In-Home from the deal risk, then lead, then contact", () => {
    expect(
      homeAddressFromRecords({
        risk: { address1: "412 Harbor Isle Dr", city: "Melbourne", state: "FL", zip: "32901" },
        lead: { mailingAddress: "Lead only" },
      }),
    ).toBe("412 Harbor Isle Dr · Melbourne, FL · 32901");
    expect(
      homeAddressFromRecords({
        risk: null,
        lead: { mailingAddress: "88 Palm Bay Rd", city: "Palm Bay", state: "FL", zip: "32905" },
      }),
    ).toBe("88 Palm Bay Rd · Palm Bay, FL · 32905");
  });

  it("joins agency plus per-agent office addresses", () => {
    expect(
      officeMeetingAddress({
        agencyName: "FitFirst Insurance",
        officeAddress: "2100 Palm Bay Rd NE, Palm Bay, FL 32905",
        agentName: "Maya Chen",
        agentAddress: "Suite 112",
      }),
    ).toBe("FitFirst Insurance — 2100 Palm Bay Rd NE, Palm Bay, FL 32905 · Maya Chen — Suite 112");
  });

  it("resolves Video / In-Home / In-Office copy", () => {
    expect(
      resolveMeetingPlace({
        type: "in_home",
        homeAddress: "88 Palm Bay Rd · Palm Bay, FL · 32905",
      }).location,
    ).toBe("88 Palm Bay Rd · Palm Bay, FL · 32905");
    expect(
      resolveMeetingPlace({
        type: "in_office",
        officeAddress: "FitFirst Insurance — 2100 Palm Bay Rd NE",
      }).location,
    ).toContain("Palm Bay");
    expect(
      resolveMeetingPlace({
        type: "video",
        videoUrl: "https://zoom.us/j/fitfirst-demo",
      }).location,
    ).toBe("https://zoom.us/j/fitfirst-demo");
  });

  it("picks a connected video stub", () => {
    const links = {
      zoomUrl: "https://zoom.us/j/fitfirst-demo",
      meetUrl: "https://meet.google.com/fit-first-demo",
      videoProvider: "meet",
    };
    expect(defaultVideoProvider(links)).toBe("meet");
    expect(videoLinkFor("zoom", links)).toBe("https://zoom.us/j/fitfirst-demo");
  });

  it("writes a readable meeting note", () => {
    expect(
      meetingNotes({
        type: "video",
        videoProvider: "zoom",
        location: "https://zoom.us/j/fitfirst-demo",
      }),
    ).toContain("Video-call");
  });
});

describe("pipeline card actions", () => {
  it("keeps Call and Meeting, never Ask a teammate", () => {
    expect(PIPELINE_CARD_ACTIONS).toEqual(["Call", "SMS", "Task", "Meeting"]);
    expect(PIPELINE_CARD_ACTIONS).not.toContain("Dial");
    expect(PIPELINE_CARD_ACTIONS).not.toContain("Mail");
    expect(PIPELINE_CARD_ACTIONS).not.toContain("Email");
    expect(PIPELINE_CARD_ACTIONS.some((label) => /teammate/i.test(label))).toBe(false);
    expect(pipelineCardShowsAsk()).toBe(false);
  });
});
