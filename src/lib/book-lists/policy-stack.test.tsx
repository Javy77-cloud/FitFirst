import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BookLenses } from "@/components/book-lists/book-lenses";
import { BookGlanceCardView } from "@/components/book-lists/glance-card";
import { PolicyStackColumnHeader } from "@/components/book-lists/policy-stack-header";
import { PoliciesViewSwitch } from "@/components/book-lists/policies-view-switch";
import type { BookGlanceCard } from "@/lib/book-lists/types";

function source(file: string) {
  return readFileSync(file, "utf8");
}

const counts = { hot: 1, cooling: 0, cold: 0 };

const card: BookGlanceCard = {
  id: "p1",
  surface: "policies",
  href: "/policies/p1",
  title: "Pat Hale",
  heat: "hot",
  column: "now",
  glance: [],
  why: "Expires soon · $2,184",
  facts: [
    { id: "carrier", label: "Heritage" },
    { id: "form", label: "HO3" },
    { id: "lob", label: "Home" },
    { id: "premium", label: "$2,184" },
    { id: "expires", label: "Expires Oct 3, 2026" },
    { id: "renews", label: "Renews in 12d" },
    { id: "status", label: "Active" },
    { id: "number", label: "HP-FL-88421" },
    { id: "billing", label: "Annual" },
  ],
  primaryAction: { label: "Open", href: "/policies/p1" },
  hay: "pat hale",
  lastTouchDays: 4,
  flags: {},
  phone: "(305) 555-0100",
  email: "pat@example.com",
};

describe("policies stack view", () => {
  it("source-locks Bands|Stack clear of the lenses and drops List", () => {
    const lenses = source("src/components/book-lists/book-lenses.tsx");
    const workspace = source("src/components/book-lists/book-workspace.tsx");
    const toggle = source("src/components/book-lists/policies-view-switch.tsx");
    expect(lenses).not.toMatch(/data-ff-book-layout/);
    expect(lenses).not.toMatch(/>List</);
    expect(toggle).toMatch(/aria-label="Bands Stack"/);
    expect(toggle).not.toMatch(/>List</);
    expect(toggle).not.toMatch(/data-ff-book-layout="list"/);
    expect(toggle).toMatch(/data-ff-policy-view-switch/);
    expect(toggle).toMatch(/data-ff-book-layout="bands"/);
    expect(toggle).toMatch(/data-ff-book-layout="stack"/);
    expect(toggle).not.toMatch(/data-ff-book-layout="list"/);
    expect(workspace).toMatch(/data-ff-book-lens-bar="policies"/);
    expect(workspace.indexOf("<BookLenses")).toBeLessThan(workspace.indexOf("<PoliciesViewSwitch"));
    expect(workspace).toMatch(/surface === "policies" \?/);

    const lensHtml = renderToStaticMarkup(
      <BookLenses surface="policies" path="/policies" heat={null} lens={null} counts={counts} />,
    );
    expect(lensHtml).toContain('data-ff-book-lenses="policies"');
    expect(lensHtml).toContain('data-ff-book-lens="needs"');
    expect(lensHtml).not.toContain("data-ff-book-layout");
    expect(lensHtml).not.toContain("data-ff-policy-view-switch");
    expect(lensHtml).not.toContain(">List<");

    const switchHtml = renderToStaticMarkup(
      <PoliciesViewSwitch path="/policies" heat={null} lens={null} layout="stack" />,
    );
    expect(switchHtml).toContain('data-ff-policy-view-row=""');
    expect(switchHtml).toContain('aria-label="Bands Stack"');
    expect(switchHtml).toContain('data-ff-book-layout="bands"');
    expect(switchHtml).toContain('data-ff-book-layout="stack"');
    expect(switchHtml).not.toContain('data-ff-book-layout="list"');
    expect(switchHtml).not.toContain(">List<");
    expect(switchHtml).toContain('href="/policies?view=stack"');
    expect(switchHtml).toContain('href="/policies"');
    const stackLink = switchHtml.match(/<a[^>]*data-ff-book-layout="stack"[^>]*>/)?.[0] ?? "";
    const bandsLink = switchHtml.match(/<a[^>]*data-ff-book-layout="bands"[^>]*>/)?.[0] ?? "";
    expect(stackLink).toContain("bg-primary");
    expect(bandsLink).not.toContain("bg-primary");

    const contacts = renderToStaticMarkup(
      <BookLenses surface="contacts" path="/contacts" heat={null} lens={null} counts={counts} />,
    );
    expect(contacts).not.toContain("data-ff-book-layout-toggle");
    expect(contacts).not.toContain("data-ff-policy-view-switch");
  });

  it("renders a 3-row stack, renew cue left of Open, and no dash row", () => {
    const cardSrc = source("src/components/book-lists/glance-card.tsx");
    const css = source("src/app/globals.css");
    const stackFn = cardSrc.slice(cardSrc.indexOf("function PolicyStackCard"));
    expect(stackFn.indexOf('data-ff-policy-stack-row="name"')).toBeLessThan(
      stackFn.indexOf('data-ff-policy-stack-row="phone"'),
    );
    expect(stackFn.indexOf('data-ff-policy-stack-row="phone"')).toBeLessThan(
      stackFn.indexOf('data-ff-policy-stack-row="email"'),
    );
    expect(stackFn.indexOf("data-ff-policy-renew-cue")).toBeLessThan(stackFn.indexOf("data-ff-book-action"));
    expect(cardSrc).toMatch(/POLICY_STACK_TOP = \["form", "carrier", "status", "premium"\]/);
    expect(cardSrc).toMatch(/POLICY_STACK_BOTTOM = \["number", "expires", "renews", "billing"\]/);
    expect(css).toMatch(
      /\[data-ff-book-command="policies"\]\[data-ff-book-layout="stack"\] \.ff-policy-stack-grid \{[^}]*grid-template-rows:\s*auto auto auto/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="policies"\]\[data-ff-book-layout="stack"\] \.ff-policy-stack-header,\s*\[data-ff-book-command="policies"\]\[data-ff-book-layout="stack"\] \.ff-policy-stack-grid \{[^}]*column-gap:\s*0\.95rem/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="policies"\]\[data-ff-book-layout="stack"\] \.ff-policy-stack-open \{[^}]*grid-template-columns:\s*minmax\(12\.5rem,\s*1fr\) auto/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="policies"\]\[data-ff-book-layout="stack"\] \.ff-policy-stack-open \.ff-stack-mid \{[^}]*text-align:\s*left/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="policies"\]\[data-ff-book-layout="stack"\] \.ff-policy-stack-cell,\s*\[data-ff-book-command="policies"\]\[data-ff-book-layout="stack"\] \.ff-policy-stack-phone a,\s*\[data-ff-book-command="policies"\]\[data-ff-book-layout="stack"\] \.ff-policy-stack-email a,\s*\[data-ff-book-command="policies"\]\[data-ff-book-layout="stack"\] \.ff-policy-stack-open \.ff-stack-mid \{[^}]*font-size:\s*0\.9rem;[^}]*background:\s*none/,
    );

    const stack = renderToStaticMarkup(<BookGlanceCardView card={card} layoutMode="stack" />);
    expect(stack).toContain('data-ff-policy-stack-card="p1"');
    expect(stack).toContain("ff-policy-stack-grid");
    expect(stack).not.toContain("ff-policy-stack-center");
    expect(stack).not.toContain("ff-book-facts");
    expect(stack).toContain('data-ff-policy-stack-row="name"');
    expect(stack).toContain('data-ff-policy-stack-row="phone"');
    expect(stack).toContain('data-ff-policy-stack-row="email"');
    expect(stack.indexOf('data-ff-policy-stack-row="name"')).toBeLessThan(
      stack.indexOf('data-ff-policy-stack-row="phone"'),
    );
    expect(stack.indexOf('data-ff-policy-stack-row="phone"')).toBeLessThan(
      stack.indexOf('data-ff-policy-stack-row="email"'),
    );
    expect(stack).toContain("Pat Hale");
    expect(stack).toContain("(305) 555-0100");
    expect(stack).toContain("pat@example.com");
    expect(stack).toContain('data-ff-policy-field="form"');
    expect(stack).toContain("HO3");
    expect(stack).toContain("Heritage");
    expect(stack).toContain("Active");
    expect(stack).toContain("$2,184");
    expect(stack).toContain("HP-FL-88421");
    expect(stack).toContain("Expires Oct 3, 2026");
    expect(stack).toContain("Renews in 12d");
    expect(stack).toContain("Annual");
    expect(stack).not.toContain("Home");
    expect(stack).not.toContain(">—</");
    expect(stack).not.toContain(">—<");

    const open = stack.slice(stack.indexOf('data-ff-policy-stack-open=""'));
    expect(open.indexOf("data-ff-policy-renew-cue")).toBeLessThan(open.indexOf("data-ff-book-action"));
    expect(open.indexOf("Expires soon")).toBeLessThan(open.indexOf(">Open<"));
    const nameRow = stack.slice(
      stack.indexOf('data-ff-policy-stack-row="name"'),
      stack.indexOf('data-ff-policy-stack-row="phone"'),
    );
    expect(nameRow).toContain("Pat Hale");
    expect(nameRow).not.toContain("HO3");
    expect(nameRow).not.toContain("Heritage");
    expect(nameRow).not.toContain("(305) 555-0100");

    const dated = renderToStaticMarkup(
      <BookGlanceCardView
        card={{ ...card, why: "Renews in 12d, Oct 3, 2026" }}
        layoutMode="stack"
      />,
    );
    const datedOpen = dated.slice(dated.indexOf("data-ff-policy-renew-cue"));
    expect(datedOpen.startsWith('data-ff-policy-renew-cue=""')).toBe(true);
    expect(datedOpen.indexOf("Renews in 12d")).toBeLessThan(datedOpen.indexOf("data-ff-book-action"));
    expect(datedOpen).not.toContain("Oct 3, 2026");
    expect(dated).toContain("Expires Oct 3, 2026");
    expect(datedOpen).not.toContain("data-ff-renewal-agreed");

    const bare = renderToStaticMarkup(
      <BookGlanceCardView
        card={{
          ...card,
          why: "—",
          phone: "",
          email: "",
          facts: [
            { id: "form", label: "—" },
            { id: "carrier", label: "-" },
            { id: "status", label: "Active" },
            { id: "premium", label: "n/a" },
          ],
        }}
        layoutMode="stack"
      />,
    );
    expect(bare).toContain("Active");
    expect(bare).toContain('data-ff-policy-stack-row="name"');
    expect(bare).toContain('data-ff-policy-stack-row="phone"');
    expect(bare).toContain('data-ff-policy-stack-row="email"');
    expect(bare).not.toContain('data-ff-policy-stack-row="dash"');
    expect(bare.match(/data-ff-stack-empty-dash=/g)).toHaveLength(2);
    expect(bare).not.toContain(">n/a<");
    expect(bare.match(/data-ff-policy-stack-row=/g)).toHaveLength(3);

    const bands = renderToStaticMarkup(<BookGlanceCardView card={card} layoutMode="bands" />);
    expect(bands).not.toContain("data-ff-policy-stack-card");
    expect(bands).toContain("Expires soon");
    expect(bands).toContain("Pat Hale");
    expect(bands).toContain('data-ff-policy-band-form=""');
    expect(bands).toContain("· HO3");
    const bandName = bands.slice(bands.indexOf('class="ff-stack-name'), bands.indexOf("</a>"));
    expect(bandName).toContain("Pat Hale");
    expect(bandName).toContain("HO3");
    expect(bandName).not.toContain("Heritage");

    const bandWhy = renderToStaticMarkup(
      <BookGlanceCardView
        card={{
          ...card,
          why: "Renews in 12d, Oct 3, 2026",
          renewalAgreed: {
            handled: true,
            termEffective: "2025-10-10",
            termExpiration: "2026-10-09",
            asOf: new Date("2026-09-24T16:00:00.000Z"),
          },
        }}
        layoutMode="bands"
      />,
    );
    expect(bandWhy).toContain("Renews in 12d, Oct 3, 2026");
    expect(bandWhy).toContain("ff-renewal-agreed-badge");
    expect(bandWhy).toContain("Renewal agreed");
    expect(bandWhy).not.toContain("ff-policy-renewal-agreed");
    expect(bandWhy).not.toContain("data-ff-policy-stack-card");
    expect(bandWhy).not.toMatch(/Renews in 12d, Oct 3, 2026[^<]*Renewal agreed/);
  });

  it("stamps Renewal agreed beside the countdown and keeps the line from wrapping", () => {
    const css = source("src/app/globals.css");
    expect(css).toMatch(
      /\[data-ff-book-command="policies"\]\[data-ff-book-layout="stack"\] \.ff-policy-renew-line \{[^}]*display:\s*flex;[^}]*flex-wrap:\s*nowrap;[^}]*overflow:\s*hidden/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="policies"\]\[data-ff-book-layout="stack"\] \.ff-policy-renewal-agreed \{[^}]*flex:\s*0 0 auto;[^}]*white-space:\s*nowrap/,
    );
    expect(css).toMatch(
      /\[data-ff-book-command="policies"\]\[data-ff-book-layout="stack"\] \.ff-policy-renew-line \{[^}]*flex-wrap:\s*nowrap/,
    );
    expect(css).not.toMatch(
      /\[data-ff-book-command="policies"\]\[data-ff-book-layout="stack"\] \.ff-policy-renew-line \{[^}]*flex-wrap:\s*wrap/,
    );

    const waiting = renderToStaticMarkup(
      <BookGlanceCardView
        card={{
          ...card,
          why: "Renews in 16d, Oct 9, 2026",
          renewalAgreed: {
            handled: true,
            termEffective: "2025-10-10",
            termExpiration: "2026-10-09",
            asOf: new Date("2026-09-24T16:00:00.000Z"),
          },
        }}
        layoutMode="stack"
      />,
    );
    const line = waiting.slice(
      waiting.indexOf('data-ff-policy-renew-line=""'),
      waiting.indexOf('data-ff-book-action=""'),
    );
    expect(line).toContain("Renews in 16d");
    expect(line).not.toContain("Oct 9, 2026");
    expect(line).toContain('data-ff-renewal-agreed=""');
    expect(line).toContain("Renewal agreed");
    expect(line.indexOf("Renews in 16d")).toBeLessThan(line.indexOf("Renewal agreed"));
    expect(line).toContain("ff-deal-notice-compact-ink");
    expect(line).toContain("ff-policy-renewal-agreed");

    const arrived = renderToStaticMarkup(
      <BookGlanceCardView
        card={{
          ...card,
          why: "Renews in 0d, Oct 9, 2026",
          renewalAgreed: {
            handled: true,
            termEffective: "2026-10-10",
            termExpiration: "2027-10-09",
            priorExpiration: "2026-10-09",
            asOf: new Date("2026-10-10T16:00:00.000Z"),
          },
        }}
        layoutMode="stack"
      />,
    );
    const arrivedOpen = arrived.slice(arrived.indexOf('data-ff-policy-stack-open=""'));
    expect(arrivedOpen).not.toContain("data-ff-renewal-agreed");
    expect(arrivedOpen).toContain("Renews in 0d");
  });

  it("sticks a label-only column header between the lenses and the first card", () => {
    const headerSrc = source("src/components/book-lists/policy-stack-header.tsx");
    const stackSrc = source("src/components/book-lists/book-stack.tsx");
    const css = source("src/app/globals.css");
    expect(headerSrc).toMatch(/data-ff-policy-stack-header/);
    expect(headerSrc).toMatch(/data-ff-policy-stack-col="name"/);
    expect(headerSrc).toMatch(/data-ff-policy-stack-col="form"/);
    expect(headerSrc).toMatch(/data-ff-policy-stack-col="carrier"/);
    expect(headerSrc).toMatch(/data-ff-policy-stack-col="status"/);
    expect(headerSrc).toMatch(/data-ff-policy-stack-col="premium"/);
    expect(headerSrc).not.toMatch(/aria-sort|<button|asc|desc/);
    expect(stackSrc).toMatch(/PolicyStackColumnHeader/);
    expect(stackSrc).toMatch(/card\.surface === "policies"/);
    expect(css).toMatch(
      /\[data-ff-book-command="policies"\]\[data-ff-book-layout="stack"\] \.ff-policy-stack-header \{[^}]*position:\s*sticky/,
    );

    const header = renderToStaticMarkup(<PolicyStackColumnHeader />);
    expect(header).toContain('data-ff-policy-stack-header=""');
    expect(header).toContain(">Name<");
    expect(header).toContain(">Form<");
    expect(header).toContain(">Carrier<");
    expect(header).toContain(">Status<");
    expect(header).toContain(">Premium<");
    expect(header).not.toContain("aria-sort");
    expect(header).not.toContain("<button");
  });
});
