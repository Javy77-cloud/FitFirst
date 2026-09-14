import { describe, expect, it } from "vitest";
import {
  AGENT_DEAL_TABS,
  DEAL_WORK_TAB_KEY,
  dealTabShowsAsk,
  dealTabShowsCommsLogs,
  dealTabShowsEmailSend,
  hasMeaningfulDealFieldValues,
  parseAgentDealTab,
  nextPersistedWorkTab,
  persistedDealWorkTab,
  resolveDealResumeTab,
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

describe("resolveDealResumeTab", () => {
  it("starts on details when record values are empty or blank-only", () => {
    expect(hasMeaningfulDealFieldValues({})).toBe(false);
    expect(hasMeaningfulDealFieldValues({ a: "", b: "  " })).toBe(false);
    expect(resolveDealResumeTab({ recordValues: {} })).toBe("details");
    expect(resolveDealResumeTab({ recordValues: { named_insured: "  " } })).toBe("details");
    expect(resolveDealResumeTab({})).toBe("details");
  });

  it("advances to documents after details are saved but sheet is not ready", () => {
    expect(hasMeaningfulDealFieldValues({ named_insured: "Elena" })).toBe(true);
    expect(
      resolveDealResumeTab({
        recordValues: { named_insured: "Elena" },
        quotingUnlocked: false,
        sheetFilled: false,
      }),
    ).toBe("documents");
  });

  it("stays on documents after Fill until Confirm & request quotes", () => {
    expect(
      resolveDealResumeTab({
        recordValues: { named_insured: "Elena" },
        sheetFilled: true,
        quotingUnlocked: false,
        quotesRequested: false,
        hasNonStubQuotes: false,
      }),
    ).toBe("documents");
  });

  it("advances to markets only after sheet is confirmed (unlocked) and quotes not yet requested", () => {
    expect(
      resolveDealResumeTab({
        recordValues: { named_insured: "Elena" },
        sheetFilled: true,
        quotingUnlocked: true,
        quotesRequested: false,
      }),
    ).toBe("markets");
  });

  it("lands on quotes after a shop request or non-stub quotes", () => {
    expect(
      resolveDealResumeTab({
        recordValues: { named_insured: "Elena" },
        quotingUnlocked: true,
        quotesRequested: true,
      }),
    ).toBe("quotes");
    expect(
      resolveDealResumeTab({
        recordValues: { named_insured: "Elena" },
        sheetFilled: true,
        hasNonStubQuotes: true,
      }),
    ).toBe("quotes");
  });
});

  it("ignores the persisted work-tab key when judging whether Details has values", () => {
    expect(hasMeaningfulDealFieldValues({ [DEAL_WORK_TAB_KEY]: "details" })).toBe(false);
    expect(
      hasMeaningfulDealFieldValues({ [DEAL_WORK_TAB_KEY]: "markets", named_insured: "Elena" }),
    ).toBe(true);
  });

  it("prefers the persisted work tab over inferred signals so convert stays on Details", () => {
    expect(persistedDealWorkTab({ [DEAL_WORK_TAB_KEY]: "details" })).toBe("details");
    expect(
      resolveDealResumeTab({
        recordValues: { [DEAL_WORK_TAB_KEY]: "details", first_name: "Elena", named_insured: "Elena Ruiz" },
        quotingUnlocked: false,
        sheetFilled: false,
      }),
    ).toBe("details");
    expect(
      resolveDealResumeTab({
        recordValues: { [DEAL_WORK_TAB_KEY]: "documents", named_insured: "Elena" },
        quotingUnlocked: true,
      }),
    ).toBe("documents");
    expect(
      resolveDealResumeTab({
        recordValues: { [DEAL_WORK_TAB_KEY]: "markets", named_insured: "Elena" },
        quotingUnlocked: true,
        quotesRequested: false,
        hasNonStubQuotes: false,
      }),
    ).toBe("markets");
    expect(
      resolveDealResumeTab({
        recordValues: { [DEAL_WORK_TAB_KEY]: "quotes", named_insured: "Elena" },
        quotesRequested: true,
      }),
    ).toBe("quotes");
  });

  it("wires persistDealWorkTab on convert and each stage advance", () => {
    const { readFileSync } = require("node:fs") as typeof import("node:fs");
    const src = (file: string) => readFileSync(file, "utf8");
    expect(src("src/app/actions/crm.ts")).toMatch(/persistDealWorkTab\(deal\.id, "details"\)/);
    expect(src("src/app/actions/custom-fields.ts")).toMatch(/persistDealWorkTab\(dealId, "documents"\)/);
    expect(src("src/app/actions/quoting.ts")).toMatch(/persistDealWorkTab\(dealId, "markets"\)/);
    expect(src("src/app/actions/quotes.ts")).toMatch(/persistDealWorkTab\(dealId, "quotes"\)/);
  });

  it("never moves an in-progress deal backward", () => {
    expect(nextPersistedWorkTab(null, "details")).toBe("details");
    expect(nextPersistedWorkTab("details", "documents")).toBe("documents");
    expect(nextPersistedWorkTab("markets", "documents")).toBe("markets");
    expect(nextPersistedWorkTab("quotes", "details")).toBe("quotes");
    expect(nextPersistedWorkTab("documents", "documents")).toBe("documents");
  });
