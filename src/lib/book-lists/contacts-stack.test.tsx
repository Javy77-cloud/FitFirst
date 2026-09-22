import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BookPriorityStack } from "@/components/book-lists/book-stack";
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
  it("source-locks exactly 3 rows, phone-row meta columns, sticky header, and no dash or status chip", () => {
    const card = source("src/components/book-lists/glance-card.tsx");
    const css = source("src/app/globals.css");
    const present = source("src/lib/book-lists/present.ts");
    const stackFile = source("src/components/book-lists/book-stack.tsx");
    const contactsPage = source("src/app/contacts/page.tsx");
    const tags = source("src/components/tags/assign-record-tags.tsx");
    const queries = source("src/lib/db/queries.ts");

    expect(card).toMatch(/data-ff-contact-stack-card/);
    expect(card).toMatch(/data-ff-contact-stack-check/);
    expect(card).toMatch(/data-ff-contact-stack-header/);
    expect(card).toMatch(/data-ff-contact-stack-row="name"/);
    expect(card).toMatch(/data-ff-contact-stack-row="phone"/);
    expect(card).toMatch(/data-ff-contact-stack-row="email"/);
    expect(card).not.toMatch(/data-ff-contact-stack-row="meta"/);
    expect(card).not.toMatch(/data-ff-contact-stack-row="contact"/);
    expect(card).toMatch(/data-ff-contact-stack-phone/);
    expect(card).toMatch(/data-ff-contact-stack-email/);
    expect(card).toMatch(/data-ff-contact-stack-reach/);
    expect(card).toMatch(/CONTACT_STACK_META = \["language", "status", "dob", "policies"\]/);
    expect(card).toMatch(/data-ff-contact-stack-col=\{column\.id\}/);
    expect(card).toMatch(/data-ff-contact-stack-row="phone"/);
    expect(card).not.toMatch(/sort ascending|sort descending|aria-sort/);

    const stackStart = card.indexOf("function ContactStackCard");
    expect(stackStart).toBeGreaterThan(-1);
    const stackSrc = card.slice(stackStart, card.indexOf("/** Policies Stack"));
    const rowIds = [...stackSrc.matchAll(/data-ff-contact-stack-row="([^"]+)"/g)].map((match) => match[1]);
    expect([...new Set(rowIds)]).toEqual(["name", "phone", "email"]);
    expect(stackSrc.indexOf("data-ff-contact-stack-check")).toBeLessThan(stackSrc.indexOf('className="ff-stack-name"'));
    expect(stackSrc.indexOf("data-ff-contact-stack-glyph")).toBeLessThan(stackSrc.indexOf("data-ff-contact-stack-phone"));
    expect(stackSrc.indexOf("data-ff-contact-stack-phone")).toBeLessThan(stackSrc.indexOf("data-ff-contact-stack-col"));
    expect(stackSrc.indexOf("data-ff-contact-stack-col")).toBeLessThan(stackSrc.indexOf("data-ff-contact-stack-email"));
    expect(stackSrc).toMatch(/data-ff-contact-stack-col=\{column\.id\}[\s\S]*data-ff-contact-stack-row="phone"/);
    expect(stackSrc).not.toMatch(/[—–]/);
    expect(stackSrc).not.toMatch(/ff-book-facts|ClientStatusPill|data-ff-contact-status-dot|data-status-color/);

    expect(stackFile).toMatch(/ContactStackColumnHeader/);
    expect(stackFile).toMatch(/surface === "contacts"/);
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
    expect(queries).toMatch(/clientStatus: clientStatusFromCounts\(counts\.lifetime, counts\.inForce\)/);
    expect(contactsPage).toMatch(/emptyPlaceholder="none"/);
    expect(tags).toMatch(/emptyPlaceholder === "none" && current\.length === 0\) return null/);

    expect(css).toMatch(
      /\[data-ff-book-command="contacts"\]\[data-ff-book-layout="stack"\] \.ff-contact-stack-spread \{[^}]*grid-template-rows:\s*auto auto auto/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="contacts"\]\[data-ff-book-layout="stack"\] \.ff-contact-stack-check \{/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="contacts"\]\[data-ff-book-layout="stack"\] \.ff-contact-stack-col\[data-ff-contact-stack-col="language"\] \{[^}]*grid-column:\s*3;[^}]*grid-row:\s*2/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="contacts"\]\[data-ff-book-layout="stack"\] \.ff-contact-stack-col\[data-ff-contact-stack-col="policies"\] \{[^}]*grid-column:\s*6;[^}]*grid-row:\s*2/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="contacts"\]\[data-ff-book-layout="stack"\] \.ff-contact-stack-phone \{[^}]*grid-row:\s*2/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="contacts"\]\[data-ff-book-layout="stack"\] \.ff-contact-stack-email \{[^}]*grid-row:\s*3/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="contacts"\]\[data-ff-book-layout="stack"\] \.ff-contact-stack-header \{[^}]*position:\s*sticky/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="contacts"\]\[data-ff-book-layout="stack"\] \.ff-contact-stack-col,\s*\[data-ff-book-command="contacts"\]\[data-ff-book-layout="stack"\] \.ff-contact-stack-phone a,\s*\[data-ff-book-command="contacts"\]\[data-ff-book-layout="stack"\] \.ff-contact-stack-email a,\s*\[data-ff-book-command="contacts"\]\[data-ff-book-layout="stack"\] \.ff-contact-stack-reach \{[^}]*font-size:\s*0\.9rem;[^}]*background:\s*none/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="contacts"\]\[data-ff-book-layout="stack"\] \.ff-contact-stack-card \[data-ff-assign-tags\]:not\(:has\(\[data-ff-tag-chip\]\)\) \{[^}]*display:\s*none/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="contacts"\]\[data-ff-book-layout="stack"\] \.ff-contact-stack-card \.ff-stack-name \{[^}]*font-weight:\s*750/,
    );
  });

  it("renders name, then phone-row meta columns, then email with reach — no status chip or dash row", () => {
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
    expect(html).toContain('data-ff-contact-stack-row="phone"');
    expect(html).toContain('data-ff-contact-stack-row="email"');
    expect(html).not.toContain('data-ff-contact-stack-row="meta"');
    expect(html).not.toContain('data-ff-contact-stack-row="contact"');
    expect(html).toContain("Dib, Ana");
    expect(html).toContain("(321) 555-0100");
    expect(html).toContain("ana@example.com");
    expect(html).toContain("Not reached");
    expect(html).not.toContain("ff-book-channels");
    expect(html).not.toContain("ff-book-facts");
    expect(html).not.toContain("data-ff-contact-status-dot");
    expect(html).not.toContain("data-status-color");
    expect(html.replace(/ title="[^"]*"/g, "").match(/>Client</g)).toEqual([">Client<"]);
    expect(html.indexOf('data-ff-contact-stack-row="name"')).toBeLessThan(
      html.indexOf('data-ff-contact-stack-row="phone"'),
    );
    expect(html.indexOf('data-ff-contact-stack-row="phone"')).toBeLessThan(
      html.indexOf('data-ff-contact-stack-row="email"'),
    );
    expect(html.indexOf('data-ff-contact-stack-check=""')).toBeLessThan(html.indexOf('class="ff-stack-name"'));
    expect(html.indexOf("data-ff-contact-stack-glyph")).toBeLessThan(html.indexOf("data-ff-contact-stack-phone"));
    expect(html.indexOf("data-ff-contact-stack-phone")).toBeLessThan(html.indexOf("data-ff-contact-stack-email"));
    const phoneRow = html.slice(
      html.indexOf('data-ff-contact-stack-row="phone"'),
      html.indexOf('data-ff-contact-stack-row="email"'),
    );
    expect(phoneRow).toContain('data-ff-contact-stack-col="language"');
    expect(phoneRow).toContain('data-ff-contact-stack-col="status"');
    expect(phoneRow).toContain('data-ff-contact-stack-col="dob"');
    expect(phoneRow).toContain('data-ff-contact-stack-col="policies"');
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

  it("keeps a sticky column header above the first card, labels only", () => {
    const html = renderToStaticMarkup(
      <BookPriorityStack cards={[contactCard()]} empty="Nobody in this lens." layoutMode="stack" />,
    );
    expect(html).toContain('data-ff-contact-stack-header=""');
    expect(html.indexOf("data-ff-contact-stack-header")).toBeLessThan(html.indexOf("data-ff-contact-stack-card"));
    for (const label of ["Name", "Language", "Status", "DOB", "Policies", "Reach"]) {
      expect(html).toContain(`>${label}<`);
    }
    expect(html).not.toMatch(/aria-sort|sort ascending|sort descending/i);
    expect(html).not.toContain("<button");
  });

  it("drops a dash reach and does not paint a status pill when facts still carry client status", () => {
    const card = {
      ...contactCard({
        preferredLanguage: null,
        language: null,
        clientStatus: null,
        dateOfBirth: null,
        policyCount: 0,
        activePolicyCount: 0,
      }),
      mid: "—",
      why: "—",
      subtitle: "client",
      facts: [{ id: "status", label: "Client" }],
    };
    const html = renderToStaticMarkup(<BookGlanceCardView card={card} layoutMode="stack" />);
    expect(html).not.toContain("—");
    expect(html).not.toContain("data-ff-contact-stack-reach");
    expect(html).not.toContain("ff-book-facts");
    expect(html).not.toContain("data-status-color");
    expect(html).not.toContain("data-ff-contact-status-dot");
    expect(html).not.toContain(">Client<");
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

  it("does not paint the Contacts stack chrome on an account card", () => {
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
    expect(html).not.toContain("data-ff-contact-stack-card");
    expect(html).not.toContain("data-ff-contact-stack-col");
    const stack = renderToStaticMarkup(
      <BookPriorityStack cards={[account]} empty="Nobody in this lens." layoutMode="stack" />,
    );
    expect(stack).not.toContain("data-ff-contact-stack-header");
  });
});
