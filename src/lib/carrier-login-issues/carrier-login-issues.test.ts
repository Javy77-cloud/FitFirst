import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { classifyCarrierLoginFailure } from "@/lib/carrier-login-issues/classify";
import {
  appendCarrierLoginEvent,
  buildCarrierLoginEvent,
  isCarrierLoginBlocked,
  readCarrierLoginEvents,
  rollupCarrierLoginIssues,
} from "@/lib/carrier-login-issues/store";
import { CARRIER_LOGIN_ISSUES_RELATIVE_PATH } from "@/lib/carrier-login-issues/types";

const EMPTY_PORTAL =
  "Carrier portal automation is behind this interface only. No login or submit is wired.";

describe("classify carrier login failures", () => {
  it("keeps UW, missing questions, and the unwired portal off this list", () => {
    expect(classifyCarrierLoginFailure(EMPTY_PORTAL, "not_implemented")).toBeNull();
    expect(classifyCarrierLoginFailure("Couldn’t finish quote because Loss of Use / ALE was missing")).toBeNull();
    expect(classifyCarrierLoginFailure("Why are you requesting this quote? (not on sheet)")).toBeNull();
    expect(classifyCarrierLoginFailure("NordPass login succeeded; reached the rating page")).toBeNull();
    expect(classifyCarrierLoginFailure("MFA cleared; gender required and blank")).toBeNull();
    expect(
      classifyCarrierLoginFailure("Windward only Edison/FPI/Ovation — no Patriot. Portal closed."),
    ).toBeNull();
    expect(classifyCarrierLoginFailure("Hard no — tenant occupied not eligible for HO3")).toBeNull();
    expect(
      classifyCarrierLoginFailure(
        "Landed on People's Trust slate (HO-3 N/A / Basic Choice only) — Southern Oak/DP3 not offered",
      ),
    ).toBeNull();
  });

  it("names the login class", () => {
    expect(classifyCarrierLoginFailure("captcha blocked the sign-in page")).toBe("captcha");
    expect(classifyCarrierLoginFailure("stuck in an MFA loop after the code")).toBe("mfa_loop");
    expect(classifyCarrierLoginFailure("2FA required before quote; Gaya waits for Javy auth")).toBe(
      "mfa_2fa",
    );
    expect(classifyCarrierLoginFailure("agency password expired and must be changed")).toBe(
      "password_expired",
    );
    expect(classifyCarrierLoginFailure("session expired, sign-in again")).toBe("session_expired");
    expect(
      classifyCarrierLoginFailure("Duck Creek session failed/reverted to Windward login"),
    ).toBe("session_expired");
    expect(classifyCarrierLoginFailure("account locked after 5 tries")).toBe("account_locked");
    expect(
      classifyCarrierLoginFailure("you were working with a GEICO agent. To continue, call"),
    ).toBe("account_locked");
    expect(classifyCarrierLoginFailure("credentials rejected after NordPass autofill")).toBe(
      "credentials_rejected",
    );
    expect(classifyCarrierLoginFailure("NordPass No items to autofill")).toBe("autofill_failed");
    expect(classifyCarrierLoginFailure("Couldn’t finish quote because no NordPass FPI credentials.")).toBe(
      "missing_credentials",
    );
    expect(classifyCarrierLoginFailure("Agent login failed for scott.l@afains.com")).toBe(
      "cannot_authenticate",
    );
    expect(
      classifyCarrierLoginFailure(
        "NordPass login succeeded; CloudFront blocked portal.thig.com",
      ),
    ).toBe("access_blocked");
    expect(
      classifyCarrierLoginFailure("portal CloudFront 403 after login (Auth.thig.com → portal.thig.com)"),
    ).toBe("access_blocked");
    expect(
      classifyCarrierLoginFailure(
        "opened NordPass UNA / One Alliance item instead of UPCIC. Need separate Universal P&C NordPass item.",
      ),
    ).toBe("wrong_vault_item");
    expect(
      classifyCarrierLoginFailure(
        "wrong Beyond Floods account — Reopen under Scott session then retry",
      ),
    ).toBe("wrong_session");
    expect(
      classifyCarrierLoginFailure(
        "SSO didn’t open from NatGen button. Standing: quote only under Scott / Agency 9026706",
      ),
    ).toBe("wrong_session");
    expect(
      classifyCarrierLoginFailure(
        "NFIP portal session is Joseph — not Scott / Agency 9026706. Need Scott login.",
      ),
    ).toBe("wrong_session");
    expect(
      classifyCarrierLoginFailure(
        "Skipped — known portal access wall (same Microsoft NordPass autofill fail as Gloria HO3).",
      ),
    ).toBe("autofill_failed");
    expect(classifyCarrierLoginFailure("", "login_failed")).toBe("cannot_authenticate");
  });
});

describe("carrier login issue list", () => {
  it("seeds known login failures and marks repeats recurring", () => {
    const file = path.join(process.cwd(), CARRIER_LOGIN_ISSUES_RELATIVE_PATH);
    const events = readCarrierLoginEvents(file);
    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(classifyCarrierLoginFailure(event.error_message)).toBe(event.error_category);
      expect(event.occurred_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
    const rollup = rollupCarrierLoginIssues(events);
    const row = (name: string, category?: string) =>
      rollup.find(
        (item) => item.carrier_name === name && (!category || item.error_category === category),
      );
    expect(row("Monarch", "autofill_failed")).toMatchObject({
      recurring: true,
      count: 2,
      standing: false,
    });
    expect(row("People's Trust")).toMatchObject({ recurring: true, count: 2, standing: false });
    expect(row("Tower Hill", "autofill_failed")).toMatchObject({ recurring: true, count: 2 });
    expect(row("Tower Hill", "access_blocked")).toMatchObject({
      recurring: true,
      count: 2,
      standing: true,
    });
    expect(row("The General", "password_expired")).toMatchObject({
      recurring: true,
      standing: true,
      count: 2,
      carrier_id: "3381e7d5-1f01-4523-8b8d-957aa1cab371",
    });
    expect(row("Progressive")).toMatchObject({
      recurring: false,
      standing: false,
      count: 1,
      error_category: "credentials_rejected",
    });
    expect(row("Beyond Floods", "cannot_authenticate")).toMatchObject({
      carrier_id: null,
      recurring: false,
      standing: false,
      count: 1,
    });
    expect(row("Beyond Floods", "wrong_session")).toMatchObject({
      carrier_id: null,
      recurring: true,
      standing: true,
      count: 2,
    });
    expect(row("National General", "wrong_session")).toMatchObject({
      recurring: true,
      standing: true,
      count: 1,
      carrier_id: "49c35c9c-fe01-4443-8bf9-3342e327031f",
    });
    expect(row("Liberty Mutual")).toMatchObject({
      error_category: "mfa_2fa",
      standing: true,
      recurring: true,
      count: 1,
    });
    expect(row("Travelers")).toMatchObject({
      error_category: "autofill_failed",
      standing: true,
      recurring: true,
      count: 1,
    });
    expect(row("Florida Peninsula")).toMatchObject({
      error_category: "missing_credentials",
      standing: true,
      recurring: true,
      count: 2,
    });
    expect(row("Universal P&C")).toMatchObject({
      error_category: "wrong_vault_item",
      standing: true,
      recurring: true,
      count: 1,
      carrier_id: "76ccf3a7-68c2-436b-8642-554cf96391c2",
    });
    expect(row("Patriot Select")).toMatchObject({
      error_category: "autofill_failed",
      standing: false,
      recurring: false,
      count: 1,
    });
    expect(row("Safepoint (Manatee)")).toMatchObject({
      error_category: "autofill_failed",
      standing: true,
      recurring: true,
      count: 2,
    });
    expect(row("Safepoint Insurance")).toMatchObject({
      standing: true,
      recurring: true,
      count: 1,
    });
    expect(rollup.some((item) => /missing question|loss of use/i.test(item.error_message))).toBe(
      false,
    );
  });

  it("treats a later repeat as recurring even outside the 14-day window", () => {
    const rollup = rollupCarrierLoginIssues([
      {
        id: "c1100000-0000-4000-8000-0000000000a1",
        carrier_name: "Example Mutual",
        carrier_id: "c1100000-0000-4000-8000-0000000000a2",
        lob: "HO",
        error_message: "captcha on the login page",
        error_category: "captcha",
        occurred_at: "2026-01-01T00:00:00.000Z",
        source: "test",
        deal_id: null,
        standing: false,
      },
      {
        id: "c1100000-0000-4000-8000-0000000000a3",
        carrier_name: "Example Mutual",
        carrier_id: "c1100000-0000-4000-8000-0000000000a2",
        lob: "HO",
        error_message: "captcha on the login page again",
        error_category: "captcha",
        occurred_at: "2026-03-01T00:00:00.000Z",
        source: "test",
        deal_id: null,
        standing: false,
      },
    ]);
    expect(rollup[0]).toMatchObject({
      count: 2,
      recurring: true,
      standing: false,
      first_seen: "2026-01-01T00:00:00.000Z",
      last_seen: "2026-03-01T00:00:00.000Z",
      error_message: "captcha on the login page again",
    });
  });

  it("appends an event the quote bot can read back", () => {
    const file = path.join(mkdtempSync(path.join(tmpdir(), "ff-login-")), "issues.ndjson");
    const event = buildCarrierLoginEvent({
      carrierName: "Travelers",
      carrierId: "bbb8f6b3-a170-4841-8be2-656c5e89575a",
      errorMessage: "NordPass entry afains1 autofill failed",
      lob: "AUTO",
      occurredAt: "2026-09-21T18:00:00.000Z",
      source: "test",
    });
    expect(event?.error_category).toBe("autofill_failed");
    expect(event?.standing).toBe(false);
    appendCarrierLoginEvent(event!, file);
    expect(readCarrierLoginEvents(file)).toEqual([event]);
    expect(buildCarrierLoginEvent({ carrierName: "Travelers", errorMessage: EMPTY_PORTAL })).toBeNull();
  });

  it("does not block routing unless the flag is on and the issue is recurring", () => {
    const rollup = rollupCarrierLoginIssues(readCarrierLoginEvents(path.join(process.cwd(), CARRIER_LOGIN_ISSUES_RELATIVE_PATH)));
    const general = { id: "3381e7d5-1f01-4523-8b8d-957aa1cab371", name: "The General" };
    const progressive = { id: "1d29f707-67e5-4e64-8528-2a0f58ad92a4", name: "Progressive" };
    expect(isCarrierLoginBlocked(general, rollup, {})).toBe(false);
    expect(isCarrierLoginBlocked(general, rollup, { FF_BLOCK_CARRIER_LOGIN_ISSUES: "0" })).toBe(false);
    expect(isCarrierLoginBlocked(general, rollup, { FF_BLOCK_CARRIER_LOGIN_ISSUES: "1" })).toBe(true);
    expect(isCarrierLoginBlocked(progressive, rollup, { FF_BLOCK_CARRIER_LOGIN_ISSUES: "1" })).toBe(
      false,
    );
    const travelers = { id: "bbb8f6b3-a170-4841-8be2-656c5e89575a", name: "Travelers" };
    expect(isCarrierLoginBlocked(travelers, rollup, {})).toBe(false);
    expect(isCarrierLoginBlocked(travelers, rollup, { FF_BLOCK_CARRIER_LOGIN_ISSUES: "1" })).toBe(
      true,
    );
  });

  it("treats a standing fight as recurring even at count 1", () => {
    const rollup = rollupCarrierLoginIssues([
      {
        id: "c1100000-0000-4000-8000-0000000000b1",
        carrier_name: "Liberty Mutual",
        carrier_id: "3b11b057-541b-4112-8361-44c175539d3c",
        lob: "AUTO",
        error_message: "2FA required before quote; Gaya waits for Javy auth",
        error_category: "mfa_2fa",
        occurred_at: "2026-09-14T17:03:06.000Z",
        source: "test",
        deal_id: null,
        standing: true,
      },
    ]);
    expect(rollup[0]).toMatchObject({ count: 1, recurring: true, standing: true });
  });
});
