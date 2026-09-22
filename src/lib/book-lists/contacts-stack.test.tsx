import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BookGlanceCardView } from "@/components/book-lists/glance-card";
import { presentPartyCard } from "./present";
import type { BookGlanceCard } from "./types";

function source(file: string) {
  return readFileSync(file, "utf8");
}

function contactCard(overrides: Partial<Parameters<typeof presentPartyCard>[0]> = {}) {
  return presentPartyCard(
    {
      id: "c1",
      firstName: "Ana",
      lastName: "Dib",
      phone: "(321) 555-0100",
      email: "ana@example.com",
      preferredLanguage: "es",
      clientStatus: "client",
      dateOfBirth: "1979-04-12",
      policyCount: 2,
      activePolicyCount: 2,
      ...overrides,
    },
    "contact",
    { asOf: new Date("2026-09-21T12:00:00.000Z") },
  );
}

describe("Contacts Stack layout lock", () => {
  it("source-locks name → meta → phone/email, checkbox top-left, meta language→status→dob→policies", () => {
    const card = source("src/components/book-lists/glance-card.tsx");
    const css = source("src/app/globals.css");
    const present = source("src/lib/book-lists/present.ts");

    expect(card).toMatch(/data-ff-contact-stack-card/);
    expect(card).toMatch(/data-ff-contact-stack-check/);
    expect(card).toMatch(/data-ff-contact-stack-row="name"/);
    expect(card).toMatch(/data-ff-contact-stack-row="meta"/);
    expect(card).toMatch(/data-ff-contact-stack-row="contact"/);
    expect(card).toMatch(/data-ff-contact-stack-phone/);
    expect(card).toMatch(/data-ff-contact-stack-email/);
    expect(card).toMatch(/data-ff-contact-stack-reach/);
    expect(card).toMatch(/CONTACT_STACK_META = \["language", "status", "dob", "policies"\]/);
    expect(card).toMatch(/data-ff-contact-stack-col=\{column\.id\}/);
    expect(card.indexOf('data-ff-contact-stack-row="name"')).toBeLessThan(
      card.indexOf('data-ff-contact-stack-row="meta"'),
    );
    expect(card.indexOf('data-ff-contact-stack-row="meta"')).toBeLessThan(
      card.indexOf('data-ff-contact-stack-row="contact"'),
    );
    const stackStart = card.indexOf("function ContactStackCard");
    expect(stackStart).toBeGreaterThan(-1);
    const stackSrc = card.slice(stackStart);
    expect(stackSrc.indexOf("data-ff-contact-stack-check")).toBeLessThan(
      stackSrc.indexOf('className="ff-stack-name"'),
    );
    expect(stackSrc.indexOf("data-ff-contact-stack-phone")).toBeLessThan(
      stackSrc.indexOf("data-ff-contact-stack-email"),
    );

    expect(present).toMatch(/function contactStackFooter/);
    expect(present).toMatch(/id: "language"/);
    expect(present).toMatch(/id: "status"/);
    expect(present).toMatch(/id: "dob"/);
    expect(present).toMatch(/id: "policies"/);
    expect(present.indexOf('id: "language"')).toBeLessThan(present.indexOf('id: "status"'));
    expect(present.indexOf('id: "status"')).toBeLessThan(present.indexOf('id: "dob"'));
    expect(present.indexOf('id: "dob"')).toBeLessThan(
      present.indexOf('id: "policies", label: String(row.policyCount'),
    );

    expect(css).toMatch(
      /\[data-ff-book-command="contacts"\]\[data-ff-book-layout="stack"\] \.ff-contact-stack-spread \{[^}]*grid-template-rows:\s*auto auto auto/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="contacts"\]\[data-ff-book-layout="stack"\] \.ff-contact-stack-check \{/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="contacts"\]\[data-ff-book-layout="stack"\] \.ff-contact-stack-meta \{[^}]*grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="contacts"\]\[data-ff-book-layout="stack"\] \.ff-contact-stack-reach-row \{[^}]*column-gap:\s*0\.95rem/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="contacts"\]\[data-ff-book-layout="stack"\] \.ff-contact-stack-meta li \{[^}]*font-size:\s*0\.9rem;[^}]*background:\s*none/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="contacts"\]\[data-ff-book-layout="stack"\] \.ff-contact-stack-phone a,\s*\[data-ff-book-command="contacts"\]\[data-ff-book-layout="stack"\] \.ff-contact-stack-email a,\s*\[data-ff-book-command="contacts"\]\[data-ff-book-layout="stack"\] \.ff-contact-stack-reach \{[^}]*font-size:\s*0\.9rem/,
    );
  });

  it("renders name, center meta columns, then phone under email with reach", () => {
    const card = contactCard();
    expect(card.columns?.map((column) => column.id)).toEqual([
      "language",
      "status",
      "dob",
      "policies",
    ]);
    expect(card.columns?.map((column) => column.label)).toEqual([
      "Spanish",
      "Client",
      "DOB 04/12",
      "2",
    ]);
    expect(card.mid).toBe("Not reached");

    const html = renderToStaticMarkup(
      <BookGlanceCardView
        card={card}
        layoutMode="stack"
        leading={<input type="checkbox" aria-label="Select row" />}
      />,
    );
    expect(html).toContain('data-ff-contact-stack-card="c1"');
    expect(html).toContain('data-ff-contact-stack-check=""');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('data-ff-contact-stack-row="name"');
    expect(html).toContain('data-ff-contact-stack-row="meta"');
    expect(html).toContain('data-ff-contact-stack-row="contact"');
    expect(html).toContain("Dib, Ana");
    expect(html).toContain("(321) 555-0100");
    expect(html).toContain("ana@example.com");
    expect(html).toContain("Not reached");
    expect(html).not.toContain("ff-book-channels");
    expect(html).not.toContain("ff-book-facts");
    expect(html.indexOf('data-ff-contact-stack-row="name"')).toBeLessThan(
      html.indexOf('data-ff-contact-stack-row="meta"'),
    );
    expect(html.indexOf('data-ff-contact-stack-row="meta"')).toBeLessThan(
      html.indexOf('data-ff-contact-stack-row="contact"'),
    );
    expect(html.indexOf('data-ff-contact-stack-check=""')).toBeLessThan(html.indexOf('class="ff-stack-name"'));
    expect(html.indexOf("data-ff-contact-stack-phone")).toBeLessThan(
      html.indexOf("data-ff-contact-stack-email"),
    );
    expect(html).toContain('data-ff-contact-stack-col="language"');
    expect(html).toContain('data-ff-contact-stack-col="status"');
    expect(html).toContain('data-ff-contact-stack-col="dob"');
    expect(html).toContain('data-ff-contact-stack-col="policies"');
    expect(html.indexOf('data-ff-contact-stack-col="language"')).toBeLessThan(
      html.indexOf('data-ff-contact-stack-col="status"'),
    );
    expect(html.indexOf('data-ff-contact-stack-col="status"')).toBeLessThan(
      html.indexOf('data-ff-contact-stack-col="dob"'),
    );
    expect(html.indexOf('data-ff-contact-stack-col="dob"')).toBeLessThan(
      html.indexOf('data-ff-contact-stack-col="policies"'),
    );
  });

  it("keeps empty meta cells blank and policy count at 0", () => {
    const card = contactCard({
      preferredLanguage: null,
      language: null,
      clientStatus: "—",
      dateOfBirth: null,
      policyCount: 0,
      activePolicyCount: 0,
    });
    expect(card.columns?.map((column) => column.label)).toEqual(["", "", "", "0"]);
  });

  it("shows English in the language column when that is the stored preference", () => {
    const card = contactCard({ preferredLanguage: "english" });
    expect(card.columns?.find((column) => column.id === "language")?.label).toBe("English");
  });

  it("leaves Accounts on the shared party grid card", () => {
    const account = presentPartyCard(
      {
        id: "a1",
        name: "Ruiz Tile LLC",
        phone: "(321) 555-0188",
        email: "office@ruiztile.example",
        policyCount: 1,
        activePolicyCount: 1,
      },
      "account",
      { asOf: new Date("2026-09-21T12:00:00.000Z") },
    ) as BookGlanceCard;
    const html = renderToStaticMarkup(<BookGlanceCardView card={account} layoutMode="stack" />);
    expect(html).toContain("ff-party-card");
    expect(html).not.toContain("data-ff-contact-stack-card");
    expect(html).toContain("ff-book-grid");
  });
});
