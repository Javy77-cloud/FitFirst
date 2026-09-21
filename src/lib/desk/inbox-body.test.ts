import { describe, expect, it } from "vitest";
import { looksLikeHtml, plainFromInboxHtml, sanitizeInboxHtml } from "./inbox-body";

describe("inbox body fit", () => {
  it("keeps a contract table and strips widths, scripts, and nowrap styles", () => {
    const raw = `
      <html><head><style>td{white-space:nowrap}</style></head>
      <body>
        <script>alert(1)</script>
        <table width="960" style="width:960px;white-space:nowrap">
          <tr><td style="white-space:nowrap">Agility producer contract</td>
          <td><a href="javascript:alert(1)" onclick="steal()">https://agility.example/contracts/producer-agreement-very-long-token</a></td></tr>
        </table>
      </body></html>`;
    const safe = sanitizeInboxHtml(raw);
    expect(looksLikeHtml(safe)).toBe(true);
    expect(safe).toContain("Agility producer contract");
    expect(safe).toContain("<table");
    expect(safe).not.toMatch(/<script/i);
    expect(safe).not.toMatch(/onclick/i);
    expect(safe).not.toMatch(/javascript:/i);
    expect(safe).not.toMatch(/\swidth=/i);
    expect(safe).not.toMatch(/\sstyle=/i);
    expect(sanitizeInboxHtml("Plain note with no tags")).toBe("");
  });

  it("turns an HTML-only body into wrapped plain lines", () => {
    const plain = plainFromInboxHtml(
      "<p>Hello</p><table><tr><td>Agility</td><td>producer contract</td></tr></table>",
    );
    expect(plain).toMatch(/Hello/);
    expect(plain).toMatch(/Agility/);
    expect(plain).not.toMatch(/<table/);
  });
});
