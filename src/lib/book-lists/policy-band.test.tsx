import { readFileSync } from "node:fs";
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
    for (const status of ["cancelled", "lapsed", "canceled", "non_renewed", "expired"]) {
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

  it("shows the form beside the holder name on every band and omits a missing form", () => {
    const needs = { openClaims: 0, pendingEndorsements: 0, missingDocs: 0 };
    const current = presentPolicyCard(
      {
        id: "laguna-ho3",
        policyNumber: "HO-1",
        displayName: "Sara Laguna",
        status: "active",
        lineOfBusiness: "HO",
        formType: "HO3",
        premium: "2184",
        expirationDate: "2027-04-12",
        updatedAt: "2026-09-22T12:00:00.000Z",
        partyName: "Sara Laguna",
      },
      needs,
      AS_OF,
    );
    const renewing = presentPolicyCard(
      {
        id: "rippey-auto",
        policyNumber: "AU-1",
        displayName: "George Rippey",
        status: "active",
        lineOfBusiness: "AUTO",
        formType: "Auto",
        premium: "980",
        expirationDate: "2026-10-10",
        partyName: "George Rippey",
      },
      needs,
      AS_OF,
    );
    const lapsed = presentPolicyCard(
      {
        id: "laguna-dp3",
        policyNumber: "DP-1",
        displayName: "Sara Laguna",
        status: "lapsed",
        offBook: true,
        statusLabel: "Lapsed",
        lineOfBusiness: "HO",
        formType: "DP3",
        premium: "1400",
        expirationDate: "2027-08-01",
        partyName: "Sara Laguna",
      },
      needs,
      AS_OF,
    );
    const eo = presentPolicyCard(
      {
        id: "eo",
        policyNumber: "EO-1",
        displayName: "Northstar",
        status: "active",
        lineOfBusiness: "GL",
        formType: "Errors & Omissions",
        expirationDate: "2027-04-12",
        updatedAt: "2026-09-22T12:00:00.000Z",
        partyName: "Northstar",
      },
      needs,
      AS_OF,
    );
    const missing = presentPolicyCard(
      {
        id: "missing-form",
        policyNumber: "BL-1",
        displayName: "No Form",
        status: "active",
        lineOfBusiness: "HO",
        formType: null,
        expirationDate: "2027-04-12",
        updatedAt: "2026-09-22T12:00:00.000Z",
        partyName: "No Form",
      },
      needs,
      AS_OF,
    );
    const unset = presentPolicyCard(
      {
        id: "unset-form",
        policyNumber: "UN-1",
        displayName: "Unset Form",
        status: "active",
        lineOfBusiness: "HO",
        formType: "undefined",
        expirationDate: "2027-04-12",
        updatedAt: "2026-09-22T12:00:00.000Z",
        partyName: "Unset Form",
      },
      needs,
      AS_OF,
    );

    expect(current.column).toBe("current");
    expect(renewing.column).toBe("now");
    expect(lapsed.column).toBe("lapsed");
    expect(current.title).toBe("Sara Laguna");
    expect(current.facts?.find((fact) => fact.id === "form")?.label).toBe("HO3");

    const html = renderToStaticMarkup(
      <BookBoard
        columns={POLICY_COLUMNS}
        cards={[current, renewing, lapsed, eo, missing, unset]}
        empty="No policies in this lens."
      />,
    );
    const cardHtml = (id: string) =>
      html.match(new RegExp(`data-ff-book-card="${id}"[\\s\\S]*?</article>`))?.[0] ?? "";

    expect(cardHtml("laguna-ho3")).toContain("Sara Laguna");
    expect(cardHtml("laguna-ho3")).toContain("· HO3");
    expect(cardHtml("laguna-ho3")).toContain("ff-band-open");
    expect(cardHtml("rippey-auto")).toContain("George Rippey");
    expect(cardHtml("rippey-auto")).toContain("· Auto");
    expect(cardHtml("laguna-dp3")).toContain("Sara Laguna");
    expect(cardHtml("laguna-dp3")).toContain("· DP3");
    expect(cardHtml("eo")).toContain("Northstar");
    expect(cardHtml("eo")).toContain("· E&amp;O");
    expect(cardHtml("eo")).not.toContain("Errors");

    for (const id of ["missing-form", "unset-form"]) {
      const card = cardHtml(id);
      expect(card, id).not.toContain("data-ff-policy-band-form");
      expect(card, id).not.toContain("undefined");
      expect(card, id).not.toContain("·");
    }
    expect(cardHtml("missing-form")).toContain("No Form");
    expect(cardHtml("unset-form")).toContain("Unset Form");
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
    const lapsedSection = html.match(/<section[^>]*data-ff-book-column="lapsed"[^>]*>/)?.[0] ?? "";
    const currentSection = html.match(/<section[^>]*data-ff-book-column="current"[^>]*>/)?.[0] ?? "";
    expect(lapsed).toContain("Robert De Swartz Junior");
    expect(lapsed).toContain("Lapsed");
    expect(current).not.toContain("Robert De Swartz Junior");
    expect(lapsedSection).toContain("ff-urgency-tone-violet");
    expect(lapsedSection).not.toContain("ff-urgency-tone-gray");
    expect(lapsedSection).not.toContain("ff-urgency-tone-navy");
    expect(currentSection).toContain("ff-urgency-tone-navy");
  });

  it("paints Lapsed with its own violet token and leaves Current on navy blue", () => {
    expect(POLICY_COLUMNS.find((column) => column.id === "lapsed")?.tone).toBe("violet");
    expect(POLICY_COLUMNS.find((column) => column.id === "current")?.tone).toBe("navy");
    expect(POLICY_COLUMNS.find((column) => column.id === "now")?.tone).toBe("terracotta");
    expect(POLICY_COLUMNS.find((column) => column.id === "watch")?.tone).toBe("amber");
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toMatch(/--ff-urgency-violet:\s*#6D28D9;/);
    expect(css).toMatch(
      /\.ff-urgency-tone-violet \{\s*--ff-urgency: var\(--ff-urgency-violet\);\s*--ff-urgency-wash: color-mix\(in srgb, var\(--ff-urgency-violet\) 18%, #fff\);/,
    );
    expect(css).toMatch(
      /\.ff-urgency-tone-navy \{\s*--ff-urgency: var\(--ff-heat-near-cold\);\s*--ff-urgency-wash: color-mix\(in srgb, var\(--ff-heat-near-cold\) 18%, #fff\);/,
    );
    expect(css).toMatch(
      /\.ff-urgency-tone-gray \{\s*--ff-urgency: var\(--ff-heat-cold\);\s*--ff-urgency-wash: color-mix\(in srgb, var\(--ff-heat-cold\) 12%, #fff\);/,
    );
    expect(css).toMatch(
      /\.ff-book-board \.ff-band-open \{[^}]*padding:\s*0\.12rem 1rem;[^}]*white-space:\s*nowrap/,
    );
  });
});
