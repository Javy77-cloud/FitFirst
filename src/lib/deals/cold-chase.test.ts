import { describe, expect, it } from "vitest";
import {
  coldChaseHref,
  coldChaseOpenLabel,
  DEAL_COLD_CHASE_KIND,
  DEAL_COLD_CHASE_TITLE,
  isDealColdChaseKind,
  planColdChaseNotices,
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
});
