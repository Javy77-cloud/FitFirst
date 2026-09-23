import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PANEL_INBOX_KINDS,
  PANEL_LANES,
  allPanelKindsHaveLanes,
  countCardsByLane,
  filterCardsByLane,
  panelLaneForKind,
  panelLaneHref,
  parsePanelLane,
} from "./lanes";
import { PANEL_SIGNAL_KINDS, type PanelCard } from "./panel";

function card(partial: Partial<PanelCard> & Pick<PanelCard, "key" | "kind">): PanelCard {
  return {
    urgency: "medium",
    entityLine: "Client",
    why: "why",
    primary: { id: "open", label: "Open" },
    href: "/x",
    entityType: "policy",
    entityId: "p1",
    deadline: null,
    source: "live",
    ...partial,
  };
}

describe("notification Work | Inbox lanes", () => {
  it("classifies FitFirst chores as Work and awareness as Inbox", () => {
    expect(panelLaneForKind("renewal_silence")).toBe("work");
    expect(panelLaneForKind("renewal_autopilot")).toBe("work");
    expect(panelLaneForKind("quote_declined")).toBe("work");
    expect(panelLaneForKind("stale_docs")).toBe("work");
    expect(panelLaneForKind("commitment_nudge")).toBe("work");
    expect(panelLaneForKind("deal_cold_chase")).toBe("work");
    expect(panelLaneForKind("inbox_mail")).toBe("inbox");
    expect(panelLaneForKind("inbox_assigned")).toBe("inbox");
    expect(panelLaneForKind("renewal_term_started")).toBe("inbox");
    expect(PANEL_INBOX_KINDS).toContain("renewal_term_started");
    expect(PANEL_INBOX_KINDS).toContain("inbox_mail");
    expect(PANEL_INBOX_KINDS).toContain("inbox_assigned");
  });

  it("covers every panel signal kind", () => {
    expect(allPanelKindsHaveLanes()).toBe(true);
    for (const kind of PANEL_SIGNAL_KINDS) {
      expect(PANEL_LANES).toContain(panelLaneForKind(kind));
    }
  });

  it("filters and counts by lane without dropping urgency cards", () => {
    const cards = [
      card({ key: "w1", kind: "renewal_silence", urgency: "high" }),
      card({ key: "i1", kind: "renewal_term_started", urgency: "medium" }),
      card({ key: "i2", kind: "inbox_mail", urgency: "low" }),
      card({ key: "w2", kind: "stale_docs", urgency: "medium" }),
    ];
    expect(filterCardsByLane(cards, "work").map((c) => c.key)).toEqual(["w1", "w2"]);
    expect(filterCardsByLane(cards, "inbox").map((c) => c.key)).toEqual(["i1", "i2"]);
    expect(countCardsByLane(cards)).toEqual({ work: 2, inbox: 2 });
  });

  it("parses lane query and deep-links", () => {
    expect(parsePanelLane(undefined)).toBe("work");
    expect(parsePanelLane("inbox")).toBe("inbox");
    expect(parsePanelLane("work")).toBe("work");
    expect(parsePanelLane("nope")).toBe("work");
    expect(panelLaneHref("work")).toBe("/notifications?lane=work");
    expect(panelLaneHref("inbox")).toBe("/notifications?lane=inbox");
  });

  it("wires Work | Inbox onto the panel page and bell", () => {
    const page = readFileSync("src/app/notifications/page.tsx", "utf8");
    const board = readFileSync("src/components/notifications/panel-board.tsx", "utf8");
    const bell = readFileSync("src/components/desk/notification-bell.tsx", "utf8");
    expect(page).toMatch(/NotificationPanelLaneToggle/);
    expect(page).toMatch(/parsePanelLane/);
    expect(page).toMatch(/filterCardsByLane/);
    expect(board).toMatch(/data-ff-panel-active-lane/);
    expect(bell).toMatch(/data-ff-bell-lane-links/);
    expect(bell).toMatch(/panelLaneHref\("inbox"\)/);
  });
});
