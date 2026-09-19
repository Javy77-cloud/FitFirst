import { describe, expect, it } from "vitest";
import { panelAlertBody, parsePanelKey } from "./sync-panel";
import { displayNoticeBody } from "@/lib/coverage/notices";

describe("panel alert persistence", () => {
  it("hides the machine key and keeps the why line for the board", () => {
    const body = panelAlertBody("Declined by Travelers at 2:14 AM · 3 carriers left", "quote_declined:q1");
    expect(parsePanelKey(body)).toBe("quote_declined:q1");
    expect(displayNoticeBody(body)).toBe("Declined by Travelers at 2:14 AM · 3 carriers left");
  });
});
