import { describe, expect, it } from "vitest";
import { decodeMimeWords, encodeMimeSubject } from "@/lib/desk/mail-text";
import { buildGmailRfc2822 } from "./gmail";

describe("encodeMimeSubject", () => {
  it("leaves ASCII subjects alone", () => {
    expect(encodeMimeSubject("Follow-up - Rosa Castellanos")).toBe("Follow-up - Rosa Castellanos");
  });

  it("RFC 2047-encodes middle-dot subjects so Gmail does not mojibake", () => {
    const subject = "Follow-up · Rosa Castellanos";
    const encoded = encodeMimeSubject(subject);
    expect(encoded).toMatch(/^=\?UTF-8\?B\?.+\?=$/);
    expect(encoded).not.toContain("·");
    expect(decodeMimeWords(encoded)).toBe(subject);
  });

  it("round-trips Insurance Quotes style subjects", () => {
    const subject = "Insurance Quotes · Heather Camirand";
    expect(decodeMimeWords(encodeMimeSubject(subject))).toBe(subject);
  });
});

describe("buildGmailRfc2822", () => {
  it("puts Subject as encoded-word when non-ASCII", () => {
    const raw = buildGmailRfc2822({
      to: "rosa@example.com",
      from: "desk@agency.local",
      subject: "Follow-up · Rosa Castellanos",
      body: "Hi Rosa,\n\nShort note.\n\nJavy",
    });
    const subjectLine = raw.split("\r\n").find((l) => l.startsWith("Subject:"));
    expect(subjectLine).toMatch(/^Subject: =\?UTF-8\?B\?/);
    expect(subjectLine).not.toMatch(/·/);
    const b64 = subjectLine!.replace(/^Subject: =\?UTF-8\?B\?/, "").replace(/\?=$/, "");
    expect(Buffer.from(b64, "base64").toString("utf8")).toBe("Follow-up · Rosa Castellanos");
  });

  it("includes plain body bytes in the Gmail payload (empty-body regression)", () => {
    const body =
      "Hi Heather,\n\nHere are the HO3 quotes we discussed.\n\nJavy\nFitFirst Insurance";
    const raw = buildGmailRfc2822({
      to: "heather@example.com",
      subject: "Follow-up - Heather",
      body,
      htmlBody: "Hi Heather,<div>Here are the HO3 quotes we discussed.</div><div><br></div>Javy",
    });
    // multipart headers must be followed by a blank line before the first boundary
    expect(raw).toMatch(/Content-Type: multipart\/mixed; boundary="[^"]+"\r\n\r\n--/);
    expect(raw).toMatch(/Content-Type: multipart\/alternative/);
    // body text must appear after base64 decode of parts
    const plainMatch = raw.match(
      /Content-Type: text\/plain; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n([A-Za-z0-9+/=\r\n]+)\r\n/,
    );
    expect(plainMatch).toBeTruthy();
    const decodedPlain = Buffer.from(plainMatch![1].replace(/\s+/g, ""), "base64").toString("utf8");
    expect(decodedPlain).toContain("Hi Heather");
    expect(decodedPlain).toContain("HO3 quotes");
    expect(decodedPlain).toContain("FitFirst Insurance");

    const htmlMatch = raw.match(
      /Content-Type: text\/html; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n([A-Za-z0-9+/=\r\n]+)\r\n/,
    );
    expect(htmlMatch).toBeTruthy();
    const decodedHtml = Buffer.from(htmlMatch![1].replace(/\s+/g, ""), "base64").toString("utf8");
    expect(decodedHtml).toContain("Hi Heather");
    expect(decodedHtml.length).toBeGreaterThan(20);
  });

  it("plain-only path still carries body with blank line after headers", () => {
    const raw = buildGmailRfc2822({
      to: "a@b.com",
      subject: "Hello",
      body: "Visible body text for Gmail.",
    });
    expect(raw).toMatch(/Content-Transfer-Encoding: base64\r\n\r\n/);
    const b64 = raw.split("\r\n\r\n")[1]?.trim();
    expect(Buffer.from(b64!, "base64").toString("utf8")).toBe("Visible body text for Gmail.");
  });
});
