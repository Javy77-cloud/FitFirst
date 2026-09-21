import { describe, expect, it } from "vitest";
import { gmailBodiesFromPart, gmailHeadersFrom, isGmailInbound } from "./gmail";

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

  it("keeps HTML for a wide contract and falls back to plain when both exist", () => {
    const html = Buffer.from(
      "<table width=\"960\"><tr><td>Agility producer contract</td></tr></table>",
    ).toString("base64url");
    const plain = Buffer.from("Agility producer contract\nSee the attached terms.").toString("base64url");
    const bodies = gmailBodiesFromPart({
      mimeType: "multipart/alternative",
      parts: [
        { mimeType: "text/plain", body: { data: plain } },
        { mimeType: "text/html", body: { data: html } },
      ],
    });
    expect(bodies.plain).toMatch(/attached terms/);
    expect(bodies.html).toMatch(/<table/);
    expect(bodies.html).toMatch(/Agility producer contract/);
  });
});
