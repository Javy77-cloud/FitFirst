import { describe, expect, it } from "vitest";
import { gmailHeadersFrom, isGmailInbound } from "./gmail";

describe("gmail thread helpers", () => {
  it("reads headers and treats SENT-only as outbound", () => {
    const headers = gmailHeadersFrom({
      headers: [
        { name: "Subject", value: "Re: HO3" },
        { name: "From", value: "Elena <elena@x.com>" },
        { name: "To", value: "desk@fitfirst.agency" },
        { name: "Message-ID", value: "<abc@x.com>" },
      ],
    });
    expect(headers.subject).toBe("Re: HO3");
    expect(headers.messageId).toBe("<abc@x.com>");
    expect(isGmailInbound(["INBOX", "UNREAD"], "Elena <elena@x.com>", "desk@fitfirst.agency")).toBe(true);
    expect(isGmailInbound(["SENT"], "FitFirst <desk@fitfirst.agency>", "desk@fitfirst.agency")).toBe(false);
  });
});
