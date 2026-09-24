import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { panelAlertBody, panelOwnsInsert, parsePanelKey, visiblePanelCards } from "./sync-panel";
import { displayNoticeBody } from "@/lib/coverage/notices";
import type { PanelCard } from "./panel";

describe("panel alert persistence", () => {
  it("hides the machine key and keeps the why line for the board", () => {
    const body = panelAlertBody("Declined by Travelers at 2:14 AM · 3 carriers left", "quote_declined:q1");
    expect(parsePanelKey(body)).toBe("quote_declined:q1");
    expect(displayNoticeBody(body)).toBe("Declined by Travelers at 2:14 AM · 3 carriers left");
  });

  it("drops dismissed and snoozed keys from lane counts", () => {
    const card = (key: string): PanelCard => ({
      key,
      kind: "inbox_mail",
      urgency: "low",
      entityLine: "Client",
      why: "why",
      primary: { id: "open", label: "Open", href: "/inbox" },
      href: "/inbox",
      entityType: "contact",
      entityId: "c1",
      deadline: null,
      source: "live",
    });
    const rows = [card("keep"), card("gone"), card("later")];
    expect(
      visiblePanelCards(rows, new Set(["gone"]), new Set(["later"])).map((c) => c.key),
    ).toEqual(["keep"]);
  });

  it("does not insert deal_cold_chase — sole writer is cold-chase-sync", () => {
    expect(panelOwnsInsert("deal_cold_chase")).toBe(false);
    expect(panelOwnsInsert("quote_declined")).toBe(true);
    const src = readFileSync("src/lib/notifications/sync-panel.ts", "utf8");
    expect(src).toMatch(/syncLiveDealColdChaseNotices/);
    expect(src).toMatch(/if \(!panelOwnsInsert\(card\.kind\)\)/);
  });
});
