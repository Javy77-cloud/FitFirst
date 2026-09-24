import { describe, expect, it } from "vitest";
import {
  dealHasOnHoldTag,
  formatDealTagLabel,
  includeDealInActiveFeed,
  ON_HOLD_FORBIDDEN_REUSE,
  ON_HOLD_LABEL,
  ON_HOLD_TAG,
  onHoldHistoryBody,
  onHoldRestoredHistoryBody,
  wantsOnHoldFeed,
  withOnHoldTag,
  withoutOnHoldTag,
} from "./on-hold";

describe("deal on hold tag", () => {
  it("uses stable on_hold key and On hold label — not Lost/Archive/nurture/handled", () => {
    expect(ON_HOLD_TAG).toBe("on_hold");
    expect(ON_HOLD_LABEL).toBe("On hold");
    expect(formatDealTagLabel("on_hold")).toBe("On hold");
    expect(formatDealTagLabel("shopping")).toBe("Shopping");
    for (const key of ON_HOLD_FORBIDDEN_REUSE) {
      expect(key).not.toBe(ON_HOLD_TAG);
    }
  });

  it("adds and removes the tag without inventing other parking states", () => {
    expect(withOnHoldTag(["shopping"])).toEqual(["shopping", "on_hold"]);
    expect(withOnHoldTag(["on_hold", "urgent"])).toEqual(["on_hold", "urgent"]);
    expect(withoutOnHoldTag(["shopping", "on_hold"])).toEqual(["shopping"]);
    expect(dealHasOnHoldTag(["on_hold"])).toBe(true);
    expect(dealHasOnHoldTag(["shopping"])).toBe(false);
  });

  it("excludes On hold from the default feed and shows them on explicit filter", () => {
    expect(wantsOnHoldFeed({ tags: "on_hold" })).toBe(true);
    expect(wantsOnHoldFeed({ attention: "on_hold" })).toBe(true);
    expect(wantsOnHoldFeed({})).toBe(false);
    expect(includeDealInActiveFeed(["on_hold"], {})).toBe(false);
    expect(includeDealInActiveFeed(["shopping"], {})).toBe(true);
    expect(includeDealInActiveFeed(["on_hold"], { tags: "on_hold" })).toBe(true);
    expect(includeDealInActiveFeed(["shopping"], { tags: "on_hold" })).toBe(false);
    expect(includeDealInActiveFeed(["on_hold"], { attention: "on_hold" })).toBe(true);
  });

  it("keeps an optional note on the history body", () => {
    expect(onHoldHistoryBody("Waiting on Marioja")).toContain("Waiting on Marioja");
    expect(onHoldHistoryBody("")).toContain("active priority stack");
    expect(onHoldRestoredHistoryBody()).toContain("Stage unchanged");
  });
});
