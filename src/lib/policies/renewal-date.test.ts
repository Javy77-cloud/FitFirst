import { describe, expect, it } from "vitest";
import { presentPolicyCard } from "@/lib/book-lists/present";
import { renewalReminderMatch } from "@/lib/notifications/renewal-reminder";
import { daysUntilRenewal, renewalDateFor, renewsOnPhrase } from "@/lib/policies/renewal-date";

const marketplace = {
  expirationDate: "2026-12-31T12:00:00.000Z",
  renewalDate: "2027-01-01T12:00:00.000Z",
};

/** 38 Eastern days before Jan 1, 2027 — inside the silence window for that day, not for Dec 31. */
const rightDay = new Date("2026-11-24T16:00:00.000Z");

describe("renewalDateFor", () => {
  it("prefers the stored renewal date over the term expiration", () => {
    expect(renewalDateFor(marketplace)).toBe("2027-01-01");
    expect(renewsOnPhrase(renewalDateFor(marketplace)!)).toBe("Renews Jan 1, 2027");
    expect(daysUntilRenewal(marketplace, rightDay)).toBe(38);
  });

  it("falls back to the term expiration when renewal date is blank", () => {
    expect(renewalDateFor({ expirationDate: marketplace.expirationDate, renewalDate: null })).toBe("2026-12-31");
    expect(daysUntilRenewal({ expirationDate: marketplace.expirationDate, renewalDate: null }, rightDay)).toBe(37);
  });
});

describe("marketplace renewal display and reminders", () => {
  it("shows renews Jan 1, 2027 and leaves the Dec 31 term end as the expiration", () => {
    const card = presentPolicyCard(
      {
        id: "mkt-1",
        policyNumber: "Marketplace",
        displayName: "Robert Leggs",
        status: "active",
        lineOfBusiness: "HEALTH",
        policySubType: "Marketplace",
        premium: "25",
        expirationDate: marketplace.expirationDate,
        renewalDate: marketplace.renewalDate,
        partyName: "Robert Leggs",
      },
      { openClaims: 0, pendingEndorsements: 0, missingDocs: 0 },
      rightDay,
    );
    expect(card.facts?.find((fact) => fact.id === "renews")?.label).toBe("Renews Jan 1, 2027");
    expect(card.facts?.find((fact) => fact.id === "expires")?.label).toBe("Expires Dec 31, 2026");
    expect(card.why.toLowerCase()).toContain("renews");
    expect(card.why).toContain("Jan 1, 2027");
    expect(card.why).not.toContain("Dec 31");
  });

  it("picks the policy up on the renewal day, not the day before from the term end", () => {
    const onRenewal = renewalReminderMatch(marketplace, rightDay);
    const onExpirationOnly = renewalReminderMatch(
      { expirationDate: marketplace.expirationDate, renewalDate: null },
      rightDay,
    );
    expect(onRenewal.renewsLabel).toBe("Renews Jan 1, 2027");
    expect(onRenewal.daysUntil).toBe(38);
    expect(onRenewal.silenceReminder).toBe(true);
    expect(onExpirationOnly.daysUntil).toBe(37);
    expect(onExpirationOnly.silenceReminder).toBe(false);
  });
});
