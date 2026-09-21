import { describe, expect, it } from "vitest";
import {
  INBOX_LIST_BODY_MIN,
  INBOX_LIST_WIDTH_DEFAULT,
  INBOX_LIST_WIDTH_MIN,
  INBOX_LIST_WIDTH_STORAGE_KEY,
  INBOX_SPLITTER_WIDTH,
  clampInboxListWidth,
  inboxListWidthFromPointer,
  nudgeInboxListWidth,
  parseInboxListWidth,
} from "./inbox-split";

describe("inbox list width", () => {
  it("parses a stored pixel width and drops junk", () => {
    expect(INBOX_LIST_WIDTH_STORAGE_KEY).toBe("ff-inbox-list-width:v1");
    expect(parseInboxListWidth("420")).toBe(420);
    expect(parseInboxListWidth(" 380.4 ")).toBe(380);
    expect(parseInboxListWidth("")).toBeNull();
    expect(parseInboxListWidth(null)).toBeNull();
    expect(parseInboxListWidth("wide")).toBeNull();
    expect(parseInboxListWidth("40")).toBeNull();
    expect(parseInboxListWidth("9000")).toBeNull();
  });

  it("clamps the list so the message body keeps a column", () => {
    const container = 1000;
    expect(clampInboxListWidth(100, container)).toBe(INBOX_LIST_WIDTH_MIN);
    expect(clampInboxListWidth(900, container)).toBe(container - INBOX_SPLITTER_WIDTH - INBOX_LIST_BODY_MIN);
    expect(clampInboxListWidth(460, container)).toBe(460);
    expect(clampInboxListWidth(Number.NaN, container)).toBe(INBOX_LIST_WIDTH_DEFAULT);
    expect(clampInboxListWidth(80, 0)).toBe(INBOX_LIST_WIDTH_MIN);
  });

  it("maps a pointer and arrow nudge onto the same clamp", () => {
    expect(inboxListWidthFromPointer(640, 200, 1000)).toBe(440);
    expect(nudgeInboxListWidth(420, -24, 1000)).toBe(396);
    expect(nudgeInboxListWidth(420, 800, 1000)).toBe(1000 - INBOX_SPLITTER_WIDTH - INBOX_LIST_BODY_MIN);
    expect(nudgeInboxListWidth(260, -80, 1000)).toBe(INBOX_LIST_WIDTH_MIN);
  });
});
