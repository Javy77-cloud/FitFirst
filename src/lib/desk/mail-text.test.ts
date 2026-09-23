import { describe, expect, it } from "vitest";
import { decodeMailText, decodeMimeWords, repairUtf8Mojibake } from "./mail-text";

describe("mail-text", () => {
  it("decodes RFC 2047 UTF-8 base64 subjects", () => {
    const encoded = "=?UTF-8?B?Rm9sbG93LXVwIMK3IFRlc3Q=?=";
    expect(decodeMimeWords(encoded)).toBe("Follow-up · Test");
  });

  it("repairs double-encoded middle dot mojibake from Gmail/CP1252", () => {
    // Prod shape: UTF-8 bytes of "Â·" misread as Windows-1252 → Ã‚Â·
    const mojibake = "Re: Follow-up \u00C3\u201A\u00C2\u00B7 Francisco";
    expect(repairUtf8Mojibake(mojibake)).toBe("Re: Follow-up · Francisco");
    expect(decodeMailText(mojibake)).toBe("Re: Follow-up · Francisco");
  });

  it("leaves clean UTF-8 alone", () => {
    expect(decodeMailText("Follow-up · Francisco Javier Garcia")).toBe(
      "Follow-up · Francisco Javier Garcia",
    );
  });
});
