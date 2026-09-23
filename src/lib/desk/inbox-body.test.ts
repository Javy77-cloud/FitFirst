import { describe, expect, it } from "vitest";
import { applyInboxInlineImages, looksLikeHtml, paintInboxMessage, plainFromInboxHtml, sanitizeInboxHtml } from "./inbox-body";

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
    const withPhoto = sanitizeInboxHtml(
      `<p>Photo</p><img src="data:image/png;base64,abc" alt="roof"><img src="data:text/html;base64,xx" alt="bad"><img src="cid:missing">`,
    );
    expect(withPhoto).toContain("data:image/png;base64,abc");
    expect(withPhoto).not.toMatch(/data:text\/html/i);
    expect(withPhoto).not.toMatch(/cid:/i);
  });

  it("turns an HTML-only body into wrapped plain lines", () => {
    const plain = plainFromInboxHtml(
      "<p>Hello</p><table><tr><td>Agility</td><td>producer contract</td></tr></table>",
    );
    expect(plain).toMatch(/Hello/);
    expect(plain).toMatch(/Agility/);
    expect(plain).not.toMatch(/<table/);
  });

  it("rewrites cid sources to image data URLs and leaves other urls alone", () => {
    const html = applyInboxInlineImages(
      `<img src="cid:ii_roof@mail" alt="roof"><img src="https://cdn.example/logo.png" alt="logo">`,
      [{ contentId: "<ii_roof@mail>", dataUrl: "data:image/jpeg;base64,abc" }],
    );
    expect(html).toContain('src="data:image/jpeg;base64,abc"');
    expect(html).toContain("https://cdn.example/logo.png");
    expect(html).not.toMatch(/cid:/i);
    expect(
      applyInboxInlineImages(`<img src="cid:x">`, [{ contentId: "x", dataUrl: "data:text/html;base64,nope" }]),
    ).toContain("cid:x");
  });

  it("paints cid images for any mailbox and drops non-image data urls", () => {
    const painted = paintInboxMessage({
      bodyHtml: `<img src="cid:logo">`,
      images: [
        { contentId: "logo", filename: "logo.png", dataUrl: "data:image/png;base64,abc" },
        { contentId: "bad", filename: "x.html", dataUrl: "data:text/html;base64,nope" },
      ],
    });
    expect(painted.bodyHtml).toContain("data:image/png;base64,abc");
    expect(painted.bodyHtml).not.toMatch(/cid:/i);
    expect(painted.images).toHaveLength(1);
  });

  it("does not smash contenteditable paragraphs (Hi Edmerson,This is)", () => {
    const plain = plainFromInboxHtml(
      "Hi Edmerson,<div>This is a quick follow-up on your HO3 quotes.</div><div><br></div>Javy",
    );
    expect(plain).toContain("Hi Edmerson,");
    expect(plain).toContain("This is a quick follow-up");
    expect(plain).not.toMatch(/Hi Edmerson,This is/);
    expect(plain.indexOf("Hi Edmerson,")).toBeLessThan(plain.indexOf("This is"));
  });

});
