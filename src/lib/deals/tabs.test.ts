import { describe, expect, it } from "vitest";
import {
  AGENT_DEAL_TABS,
  dealTabShowsAsk,
  dealTabShowsCommsLogs,
  dealTabShowsEmailSend,
  parseAgentDealTab,
} from "./tabs";

describe("agent deal tabs", () => {
  it("does not expose Master Risk or Quote Sheet on the agent Deal", () => {
    expect(AGENT_DEAL_TABS).toEqual(["details", "documents", "markets", "quotes"]);
    expect(AGENT_DEAL_TABS).not.toContain("risk");
    expect(AGENT_DEAL_TABS).not.toContain("master-risk");
    expect(AGENT_DEAL_TABS).not.toContain("quote-sheet");
    expect(parseAgentDealTab("risk")).toBe("documents");
    expect(parseAgentDealTab("master-risk")).toBe("documents");
    expect(parseAgentDealTab("quote-sheet")).toBe("documents");
    expect(parseAgentDealTab("details")).toBe("details");
    expect(parseAgentDealTab(undefined)).toBe("details");
    expect(parseAgentDealTab("markets")).toBe("markets");
    expect(parseAgentDealTab("quotes")).toBe("quotes");
  });

  it("never shows Ask a teammate on a Deal tab", () => {
    for (const tab of ["documents", "quote-sheet", "markets", "quotes", "risk"]) {
      expect(dealTabShowsAsk(tab)).toBe(false);
    }
  });

  it("keeps email-send and comms logs off Markets and Quotes", () => {
    expect(dealTabShowsCommsLogs("quote-sheet")).toBe(true);
    expect(dealTabShowsEmailSend("quote-sheet")).toBe(true);
    expect(dealTabShowsCommsLogs("markets")).toBe(false);
    expect(dealTabShowsCommsLogs("quotes")).toBe(false);
    expect(dealTabShowsCommsLogs("documents")).toBe(true);
    expect(dealTabShowsEmailSend("documents")).toBe(true);
  });
});
