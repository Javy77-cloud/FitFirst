import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BookLenses } from "@/components/book-lists/book-lenses";
import { BookGlanceCardView } from "@/components/book-lists/glance-card";
import type { BookGlanceCard } from "@/lib/book-lists/types";

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
  ],
  primaryAction: { label: "Renew", href: "/renewals?policy=p1" },
  hay: "pat hale",
  lastTouchDays: 4,
  flags: {},
  phone: "(305) 555-0100",
  email: "pat@example.com",
};

describe("policies stack view", () => {
  it("adds Stack beside Bands and List and stacks existing policy facts", () => {
    const toggle = renderToStaticMarkup(
      <BookLenses
        surface="policies"
        path="/policies"
        heat={null}
        lens={null}
        counts={counts}
        layout="stack"
      />,
    );
    expect(toggle).toContain('aria-label="Bands Stack List"');
    expect(toggle).toContain('data-ff-book-layout="bands"');
    expect(toggle).toContain('data-ff-book-layout="stack"');
    expect(toggle).toContain('data-ff-book-layout="list"');
    expect(toggle).toContain('href="/policies?view=stack"');
    expect(toggle).toContain('href="/policies?view=list"');
    expect(toggle).toContain('href="/policies"');
    const stackLink = toggle.match(/<a[^>]*data-ff-book-layout="stack"[^>]*>/)?.[0] ?? "";
    const bandsLink = toggle.match(/<a[^>]*data-ff-book-layout="bands"[^>]*>/)?.[0] ?? "";
    expect(stackLink).toContain("bg-primary");
    expect(bandsLink).not.toContain("bg-primary");

    const contacts = renderToStaticMarkup(
      <BookLenses surface="contacts" path="/contacts" heat={null} lens={null} counts={counts} layout="stack" />,
    );
    expect(contacts).not.toContain("data-ff-book-layout-toggle");

    const stack = renderToStaticMarkup(<BookGlanceCardView card={card} layoutMode="stack" />);
    expect(stack).toContain('data-ff-policy-stack-card="p1"');
    expect(stack).not.toContain("data-ff-policy-list-card");
    expect(stack).toContain("ff-policy-stack-center");
    expect(stack).toContain('data-ff-policy-field="form"');
    expect(stack).toContain("HO3");
    expect(stack).toContain("Heritage");
    expect(stack).toContain("Home");
    expect(stack).toContain("Pat Hale");
    expect(stack).toContain("(305) 555-0100");
    expect(stack).toContain("pat@example.com");
    expect(stack).not.toContain("ff-book-facts");
    expect(stack).not.toContain(">—</");
    expect(stack).not.toContain(">—<");

    const list = renderToStaticMarkup(<BookGlanceCardView card={card} layoutMode="list" />);
    expect(list).toContain('data-ff-policy-list-card="p1"');
    expect(list).not.toContain("data-ff-policy-stack-card");
    expect(list).toContain("ff-book-facts");

    const bands = renderToStaticMarkup(<BookGlanceCardView card={card} layoutMode="bands" />);
    expect(bands).not.toContain("data-ff-policy-stack-card");
    expect(bands).not.toContain("data-ff-policy-list-card");
    expect(bands).toContain("Expires soon");
  });
});
