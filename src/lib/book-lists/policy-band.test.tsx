import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BookBoard } from "@/components/book-lists/book-board";
import { matchesBookLens } from "@/lib/book-lists/lenses";
import { presentPolicyCard } from "@/lib/book-lists/present";
import { POLICY_COLUMNS } from "@/lib/book-lists/types";
import {
  bandIsOffBook,
  deskTermBandLabel,
  resolveCurrentTerm,
} from "@/lib/policies/current-term";

const noon = (day: string) => new Date(`${day}T12:00:00.000Z`);
const AS_OF = noon("2026-09-24");

function boardCard(input: {
  status: string;
  effective: string;
  expiration: string;
  renewalHandled?: boolean;
  updatedAt?: string;
}) {
  const resolved = resolveCurrentTerm(
    {
      status: input.status,
      effectiveDate: input.effective,
      expirationDate: input.expiration,
      lineOfBusiness: "FLOOD",
      policyNumber: "FL-100",
      namedInsured: "Robert De Swartz Junior",
    },
    AS_OF,
  );
  const offBook = bandIsOffBook(resolved.band);
  const card = presentPolicyCard(
    {
      id: "robert",
      policyNumber: "FL-100",
      displayName: "Robert De Swartz Junior",
      status: offBook ? resolved.band : input.status,
      statusLabel: deskTermBandLabel(resolved.band, input.status),
      offBook,
      daysUntil: resolved.daysLeft,
      lineOfBusiness: "FLOOD",
      expirationDate: resolved.bookExpiration ?? input.expiration,
      updatedAt: input.updatedAt ?? "2026-09-22T12:00:00.000Z",
      partyName: "Robert De Swartz Junior",
    },
    {
      openClaims: 0,
      pendingEndorsements: 0,
      missingDocs: 0,
      renewalHandled: input.renewalHandled ?? false,
    },
    AS_OF,
  );
  return { resolved, card };
}

function bandLabel(column: string) {
  return POLICY_COLUMNS.find((entry) => entry.id === column)?.label;
}

describe("policies board banding", () => {
  it("sends a non-payment cancellation with a future expiration to Lapsed", () => {
    // Filed cancellation stores status cancelled (non-pay is the reason).
    // Mid-term non-pay stores status lapsed, which the card already prints as Lapsed.
    for (const status of ["cancelled", "lapsed", "canceled", "non_renewed"]) {
      const { resolved, card } = boardCard({
        status,
        effective: "2026-08-01",
        expiration: "2027-08-01",
      });
      expect(resolved.daysLeft, status).toBeGreaterThan(0);
      expect(bandIsOffBook(resolved.band), status).toBe(true);
      expect(card.column, status).toBe("lapsed");
      expect(bandLabel(card.column), status).toBe("Lapsed");
      expect(card.facts?.find((fact) => fact.id === "band")?.label, status).toBe("Lapsed");
      expect(card.column, status).not.toBe("current");
      expect(matchesBookLens(card, { lens: "lapse" }), status).toBe(true);
    }
  });

  it("sends lapsed plus Client staying to Lapsed", () => {
    const { resolved, card } = boardCard({
      status: "lapsed",
      effective: "2026-08-01",
      expiration: "2027-08-01",
      renewalHandled: true,
    });
    expect(resolved.band).toBe("lapsed");
    expect(resolved.daysLeft).toBeGreaterThan(0);
    expect(card.column).toBe("lapsed");
    expect(bandLabel(card.column)).toBe("Lapsed");
    expect(card.facts?.find((fact) => fact.id === "band")?.label).toBe("Lapsed");
    expect(matchesBookLens(card, { lens: "lapse" })).toBe(true);
  });

  it("keeps an active policy renewing soon on Renewal soon", () => {
    const { card } = boardCard({
      status: "active",
      effective: "2025-10-10",
      expiration: "2026-10-10",
    });
    expect(card.column).toBe("now");
    expect(bandLabel(card.column)).toBe("Needs care now");
    expect(card.flags.renewalSoon).toBe(true);
    expect(matchesBookLens(card, { lens: "renewal" })).toBe(true);
    expect(card.column).not.toBe("lapsed");
    expect(card.column).not.toBe("current");
  });

  it("keeps an active policy far from expiration in Current", () => {
    const { card } = boardCard({
      status: "active",
      effective: "2026-01-01",
      expiration: "2027-04-12",
    });
    expect(card.column).toBe("current");
    expect(bandLabel(card.column)).toBe("Current");
    expect(card.flags.lapsed).toBe(false);
    expect(card.flags.renewalSoon).toBe(false);
    expect(matchesBookLens(card, { lens: "lapse" })).toBe(false);
  });

  it("renders the lapsed card inside the Lapsed band when the Lapse lens matches", () => {
    const { card } = boardCard({
      status: "lapsed",
      effective: "2026-08-01",
      expiration: "2027-08-01",
    });
    expect(matchesBookLens(card, { lens: "lapse" })).toBe(true);
    const html = renderToStaticMarkup(
      <BookBoard columns={POLICY_COLUMNS} cards={[card]} empty="No policies in this lens." />,
    );
    const lapsed = html.match(/data-ff-book-column="lapsed"[\s\S]*?(?=<section|$)/)?.[0] ?? "";
    const current = html.match(/data-ff-book-column="current"[\s\S]*?(?=<section|$)/)?.[0] ?? "";
    expect(lapsed).toContain("Robert De Swartz Junior");
    expect(lapsed).toContain("Lapsed");
    expect(current).not.toContain("Robert De Swartz Junior");
  });
});
