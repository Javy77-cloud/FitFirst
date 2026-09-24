import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BookGlanceCardView } from "@/components/book-lists/glance-card";
import type { BookGlanceCard } from "@/lib/book-lists/types";
import {
  renewalEffectiveDateKey,
  showRenewalAgreedBadge,
  RENEWAL_AGREED_LABEL,
} from "./renewal-agreed";

/** Term 10-10-2025 through 10-09-2026. Next term starts 10-10-2026. */
const EXPIRING = "2026-10-09";

describe("showRenewalAgreedBadge", () => {
  it("shows when Client staying is set and today is before the renewal effective date", () => {
    expect(renewalEffectiveDateKey({ termExpiration: EXPIRING })).toBe("2026-10-10");
    expect(
      showRenewalAgreedBadge({
        clientStaying: true,
        termExpiration: EXPIRING,
        currentTermEffective: "2025-10-10",
        asOf: new Date("2026-10-09T16:00:00.000Z"),
      }),
    ).toBe(true);
  });

  it("clears on the effective date in Eastern time", () => {
    expect(
      showRenewalAgreedBadge({
        clientStaying: true,
        termExpiration: EXPIRING,
        asOf: new Date("2026-10-10T16:00:00.000Z"),
      }),
    ).toBe(false);

    // 11:30 PM ET the night before: UTC has already rolled, Eastern day has not.
    expect(
      showRenewalAgreedBadge({
        clientStaying: true,
        termExpiration: EXPIRING,
        asOf: new Date("2026-10-10T03:30:00.000Z"),
      }),
    ).toBe(true);

    // 8:30 PM ET on the effective date. UTC is the next calendar day.
    expect(
      showRenewalAgreedBadge({
        clientStaying: true,
        termExpiration: EXPIRING,
        asOf: new Date("2026-10-11T00:30:00.000Z"),
      }),
    ).toBe(false);

    // The renewed term is already current today, so a later expiration must not keep the badge.
    expect(
      showRenewalAgreedBadge({
        clientStaying: true,
        currentTermEffective: "2026-10-10",
        termExpiration: "2027-10-09",
        asOf: new Date("2026-10-10T16:00:00.000Z"),
      }),
    ).toBe(false);
  });

  it("stays hidden when the policy is not Client staying", () => {
    expect(
      showRenewalAgreedBadge({
        clientStaying: false,
        termExpiration: EXPIRING,
        asOf: new Date("2026-10-01T16:00:00.000Z"),
      }),
    ).toBe(false);
    expect(
      showRenewalAgreedBadge({
        clientStaying: null,
        termExpiration: EXPIRING,
        asOf: new Date("2026-10-01T16:00:00.000Z"),
      }),
    ).toBe(false);
  });

  it("prefers a recorded renewed-term effective date", () => {
    expect(
      renewalEffectiveDateKey({
        renewedTermEffective: "2026-11-15",
        termExpiration: EXPIRING,
      }),
    ).toBe("2026-11-15");
    expect(
      showRenewalAgreedBadge({
        clientStaying: true,
        renewedTermEffective: "2026-11-15",
        termExpiration: EXPIRING,
        asOf: new Date("2026-10-10T16:00:00.000Z"),
      }),
    ).toBe(true);
    expect(
      showRenewalAgreedBadge({
        clientStaying: true,
        renewedTermEffective: "2026-11-15",
        asOf: new Date("2026-11-15T16:00:00.000Z"),
      }),
    ).toBe(false);
  });

  it("prefers a stored policy renewal date and derives only when it is blank", () => {
    expect(
      renewalEffectiveDateKey({
        renewalDate: "2027-02-01",
        renewedTermEffective: "2026-11-15",
        termExpiration: EXPIRING,
      }),
    ).toBe("2027-02-01");
    expect(
      showRenewalAgreedBadge({
        clientStaying: true,
        renewalDate: "2027-01-01",
        termEffective: "2026-01-01",
        termExpiration: "2026-12-31",
        asOf: new Date("2026-12-31T17:00:00.000Z"),
      }),
    ).toBe(true);
    expect(
      renewalEffectiveDateKey({
        renewalDate: null,
        termEffective: "2026-01-01",
        termExpiration: "2026-12-31",
      }),
    ).toBe("2027-01-01");
    expect(
      renewalEffectiveDateKey({
        renewalDate: "",
        termExpiration: EXPIRING,
      }),
    ).toBe("2026-10-10");
  });

  it("Marketplace, Medicare, and PNC calendar terms renew January 1 when renewal date is blank", () => {
    const calendarYear = {
      clientStaying: true,
      termEffective: "2026-01-01",
      termExpiration: "2026-12-31",
      renewalDate: null as string | null,
    };
    expect(renewalEffectiveDateKey(calendarYear)).toBe("2027-01-01");
    expect(showRenewalAgreedBadge({ ...calendarYear, asOf: new Date("2026-12-31T17:00:00.000Z") })).toBe(
      true,
    );
    expect(showRenewalAgreedBadge({ ...calendarYear, asOf: new Date("2027-01-01T17:00:00.000Z") })).toBe(
      false,
    );
    // 7:30 PM EST on Dec 31 is 00:30 UTC on Jan 1. Still the day before.
    expect(showRenewalAgreedBadge({ ...calendarYear, asOf: new Date("2027-01-01T00:30:00.000Z") })).toBe(
      true,
    );
    // 12:30 AM EST on Jan 1 is 05:30 UTC.
    expect(showRenewalAgreedBadge({ ...calendarYear, asOf: new Date("2027-01-01T05:30:00.000Z") })).toBe(
      false,
    );
  });
});

function policyCard(overrides: Partial<BookGlanceCard> = {}): BookGlanceCard {
  return {
    id: "p1",
    surface: "policies",
    href: "/policies/p1",
    title: "Pat Hale",
    heat: "cold",
    column: "current",
    glance: [],
    why: "Renews in 12d",
    facts: [{ id: "renews", label: "Renews in 12d" }],
    primaryAction: { label: "Open", href: "/policies/p1" },
    hay: "pat hale",
    lastTouchDays: 2,
    flags: {},
    renewalAgreed: {
      handled: true,
      termExpiration: "2099-06-09",
      termEffective: "2098-06-10",
    },
    ...overrides,
  };
}

describe("Current band Renewal agreed badge", () => {
  it("renders a corner badge on Current policy cards and leaves the renews line alone", () => {
    const html = renderToStaticMarkup(<BookGlanceCardView card={policyCard()} layoutMode="bands" />);
    expect(html).toContain(`>${RENEWAL_AGREED_LABEL}<`);
    expect(html).toContain('data-ff-renewal-agreed=""');
    expect(html).toContain("ff-renewal-agreed-badge");
    expect(html).toContain("is-renewal-agreed");
    expect(html).toContain("Renews in 12d");
    expect(html).not.toMatch(/Renews in 12d[^<]*Renewal agreed/);
  });

  it("does not render on the stack view, other bands, or policies that are not Client staying", () => {
    const stack = renderToStaticMarkup(<BookGlanceCardView card={policyCard()} layoutMode="stack" />);
    expect(stack).not.toContain("data-ff-renewal-agreed");
    expect(stack).toContain("Renews in 12d");

    const watch = renderToStaticMarkup(
      <BookGlanceCardView card={policyCard({ column: "watch" })} layoutMode="bands" />,
    );
    expect(watch).not.toContain("data-ff-renewal-agreed");
    expect(watch).not.toContain("is-renewal-agreed");

    const open = renderToStaticMarkup(
      <BookGlanceCardView
        card={policyCard({
          renewalAgreed: { handled: false, termExpiration: "2099-06-09" },
        })}
        layoutMode="bands"
      />,
    );
    expect(open).not.toContain("data-ff-renewal-agreed");
    expect(open).not.toContain("is-renewal-agreed");

    const cleared = renderToStaticMarkup(
      <BookGlanceCardView
        card={policyCard({
          renewalAgreed: { handled: true, termExpiration: "2000-01-09" },
        })}
        layoutMode="bands"
      />,
    );
    expect(cleared).not.toContain("data-ff-renewal-agreed");
    expect(cleared).not.toContain("is-renewal-agreed");
  });
});
