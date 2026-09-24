import { describe, expect, it } from "vitest";
import {
  coldChaseHref,
  coldChaseOpenLabel,
  DEAL_COLD_CHASE_KIND,
  DEAL_COLD_CHASE_TITLE,
  isDealColdChaseKind,
  planColdChaseNotices,
  planColdChaseSync,
} from "./cold-chase";

describe("deal cold chase", () => {
  it("emits one Notification Panel chase per open cold deal", () => {
    const notices = planColdChaseNotices([
      { id: "cold-1", heat: "cold", closed: false, insured: "Ana Dib", title: "Ana HO3", ownerId: "u1" },
      { id: "hot-1", heat: "hot", closed: false, insured: "Elena", title: "Elena HO3", ownerId: "u1" },
      { id: "closed-1", heat: "cold", closed: true, insured: "Harbor", title: "Harbor", ownerId: "u2" },
    ]);
    expect(notices).toEqual([
      {
        dealId: "cold-1",
        ownerId: "u1",
        title: DEAL_COLD_CHASE_TITLE,
        body: "Ana Dib · 14 days with no platform-logged comms.",
        href: "/deals/cold-1?tab=quotes",
      },
    ]);
    expect(coldChaseHref("cold-1")).toBe("/deals/cold-1?tab=quotes");
    expect(isDealColdChaseKind(DEAL_COLD_CHASE_KIND)).toBe(true);
    expect(coldChaseOpenLabel(DEAL_COLD_CHASE_KIND)).toBe("Chase");
    expect(coldChaseOpenLabel("lead_follow_up")).toBe("Open lead");
    expect(coldChaseOpenLabel("quote_declined")).toBe("Retry carriers");
    expect(coldChaseOpenLabel("ask")).toBe("Open");
  });

  it("does not re-insert after mark-as-read while the deal is still cold", () => {
    const planned = planColdChaseNotices([
      { id: "cold-1", heat: "cold", closed: false, insured: "Ana", title: "Ana", ownerId: "u1" },
    ]);
    const plan = planColdChaseSync(planned, [
      { id: "alert-read", entityId: "cold-1", readAt: new Date("2026-09-23T12:00:00Z") },
    ]);
    expect(plan.insertDealIds).toEqual([]);
    expect(plan.endEpisodeAlertIds).toEqual([]);
  });

  it("skips insert when an unread chase already exists for the deal", () => {
    const planned = planColdChaseNotices([
      { id: "cold-1", heat: "cold", closed: false, insured: "Ana", title: "Ana", ownerId: "u1" },
    ]);
    const plan = planColdChaseSync(planned, [
      { id: "alert-unread", entityId: "cold-1", readAt: null },
    ]);
    expect(plan.insertDealIds).toEqual([]);
  });

  it("inserts once for a newly cold deal with no prior chase", () => {
    const planned = planColdChaseNotices([
      { id: "cold-1", heat: "cold", closed: false, insured: "Ana", title: "Ana", ownerId: "u1" },
      { id: "cold-2", heat: "cold", closed: false, insured: "Bea", title: "Bea", ownerId: "u1" },
    ]);
    const plan = planColdChaseSync(planned, [
      { id: "alert-read", entityId: "cold-1", readAt: new Date("2026-09-23T12:00:00Z") },
    ]);
    expect(plan.insertDealIds).toEqual(["cold-2"]);
    expect(plan.endEpisodeAlertIds).toEqual([]);
  });

  it("ends the cold episode when the deal leaves cold so a later episode can re-alert", () => {
    const planned = planColdChaseNotices([
      { id: "still-cold", heat: "cold", closed: false, insured: "Ana", title: "Ana", ownerId: "u1" },
    ]);
    const plan = planColdChaseSync(planned, [
      { id: "keep", entityId: "still-cold", readAt: new Date() },
      { id: "drop-read", entityId: "was-cold", readAt: new Date() },
      { id: "drop-unread", entityId: "was-cold-2", readAt: null },
    ]);
    expect(plan.insertDealIds).toEqual([]);
    expect(plan.endEpisodeAlertIds.sort()).toEqual(["drop-read", "drop-unread"]);
  });

  it("skips On hold deals even when cold", () => {
    const notices = planColdChaseNotices([
      { id: "held-1", heat: "cold", closed: false, onHold: true, insured: "Marioja", title: "Marioja", ownerId: "u1" },
      { id: "cold-1", heat: "cold", closed: false, onHold: false, insured: "Ana", title: "Ana", ownerId: "u1" },
    ]);
    expect(notices.map((n) => n.dealId)).toEqual(["cold-1"]);
  });
});
