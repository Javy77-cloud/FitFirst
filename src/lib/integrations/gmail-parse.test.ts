import { describe, expect, it } from "vitest";
import { collectGmailImages, gmailBodiesFromPart, gmailHeadersFrom, gmailImageDataUrl, isGmailInbound } from "./gmail";

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

  it("collects CID images and normal image attachments", () => {
    const jpeg = Buffer.from("jpeg-bytes").toString("base64url");
    const parts = collectGmailImages({
      mimeType: "multipart/related",
      parts: [
        { mimeType: "text/html", body: { data: Buffer.from("<img src='cid:roof@x'>").toString("base64url") } },
        {
          mimeType: "image/jpeg",
          filename: "roof.jpg",
          headers: [{ name: "Content-ID", value: "<roof@x>" }],
          body: { data: jpeg, size: 10 },
        },
        {
          mimeType: "image/png",
          filename: "dec.png",
          headers: [{ name: "Content-Disposition", value: "attachment" }],
          body: { attachmentId: "att-1", size: 20 },
        },
      ],
    });
    expect(parts.map((part) => part.filename)).toEqual(["roof.jpg", "dec.png"]);
    expect(parts[0]?.contentId).toBe("roof@x");
    expect(parts[0]?.data).toBe(jpeg);
    expect(parts[1]?.attachmentId).toBe("att-1");
    expect(gmailImageDataUrl("image/jpeg", jpeg)).toMatch(/^data:image\/jpeg;base64,/);
  });
});
