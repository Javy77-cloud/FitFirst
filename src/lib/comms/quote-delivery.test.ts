import { describe, expect, it } from "vitest";
import {
  OPEN_TRACKING_NOTE,
  parseMailProviderEvents,
  quoteEmailHtml,
  stageAfterDeliveryFailure,
} from "./quote-delivery";

describe("quote delivery audit", () => {
  it("reverts a late stage when the unlocking message bounces or is complained", () => {
    const bounced = stageAfterDeliveryFailure({
      kind: "bounce",
      stage: "quote_sent",
      messageId: "msg-1",
      unlockedByMessageId: "msg-1",
    });
    expect(bounced.revert).toBe(true);
    expect(bounced.stage).toBe("quote_review");
    expect(bounced.clientSendMessageId).toBeNull();
    expect(bounced.clientSendFlag).toBe("bounce");

    const complaint = stageAfterDeliveryFailure({
      kind: "complaint",
      stage: "bound",
      messageId: "msg-1",
      unlockedByMessageId: "msg-1",
    });
    expect(complaint.revert).toBe(true);

    const other = stageAfterDeliveryFailure({
      kind: "bounce",
      stage: "quote_sent",
      messageId: "msg-2",
      unlockedByMessageId: "msg-1",
    });
    expect(other.revert).toBe(false);
  });

  it("parses provider events and embeds an open pixel plus the image-block note", () => {
    expect(parseMailProviderEvents({ messageId: "msg-1", event: "bounce" })).toEqual([
      { messageId: "msg-1", kind: "bounce" },
    ]);
    expect(
      parseMailProviderEvents([{ sg_message_id: "msg-9.filter", event: "spamreport" }]),
    ).toEqual([{ messageId: "msg-9", kind: "complaint" }]);
    const html = quoteEmailHtml({ text: "Your quote", pixelUrl: "https://desk.example/api/track/open/tok" });
    expect(html).toContain("https://desk.example/api/track/open/tok");
    expect(html).toContain(OPEN_TRACKING_NOTE);
    expect(html).toContain("block images");
  });
});