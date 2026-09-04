import { describe, expect, it } from "vitest";
import {
  AGENT_DEAL_TABS,
  dealTabShowsAsk,
  dealTabShowsCommsLogs,
  dealTabShowsEmailSend,
  parseAgentDealTab,
} from "./tabs";

describe("agent deal tabs", () => {
  it("does not expose Master Risk on the agent Deal", () => {
    expect(AGENT_DEAL_TABS).toEqual(["documents", "quote-sheet", "markets", "quotes"]);
    expect(parseAgentDealTab("risk")).toBe("documents");
    expect(parseAgentDealTab("quote-sheet")).toBe("quote-sheet");
  });

  it("never shows Ask a teammate on a Deal tab", () => {
    for (const tab of ["documents", "quote-sheet", "markets", "quotes", "risk"]) {
      expect(dealTabShowsAsk(tab)).toBe(false);
    }
  });

  it("keeps email-send and comms logs off Quote Sheet, Markets, and Quotes", () => {
    expect(dealTabShowsCommsLogs("quote-sheet")).toBe(false);
    expect(dealTabShowsEmailSend("quote-sheet")).toBe(false);
    expect(dealTabShowsCommsLogs("markets")).toBe(false);
    expect(dealTabShowsCommsLogs("quotes")).toBe(false);
    expect(dealTabShowsCommsLogs("documents")).toBe(true);
    expect(dealTabShowsEmailSend("documents")).toBe(true);
  });
});
