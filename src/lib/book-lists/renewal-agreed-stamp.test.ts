import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { etDateKey } from "@/lib/time/et";
import {
  deriveNextTermStart,
  renewalAgreedEffectiveKey,
  showRenewalAgreedStamp,
  stackRenewCueText,
} from "./renewal-agreed-stamp";

const BEFORE = new Date("2026-09-24T16:00:00.000Z");
const TERM = {
  termEffective: "2025-10-10",
  termExpiration: "2026-10-09",
};

describe("deriveNextTermStart", () => {
  it("renews a 10-10-2025 to 10-9-2026 term effective 10-10-2026", () => {
    expect(deriveNextTermStart("2026-10-09", "2025-10-10")).toBe("2026-10-10");
    expect(deriveNextTermStart(new Date("2026-10-09T00:00:00.000Z"), "2025-10-10T12:00:00.000Z")).toBe(
      "2026-10-10",
    );
  });

  it("steps across month and year boundaries", () => {
    expect(deriveNextTermStart("2026-10-31", "2025-11-01")).toBe("2026-11-01");
    expect(deriveNextTermStart("2026-12-31", "2026-01-01")).toBe("2027-01-01");
  });

  it("falls back to the effective anniversary when expiration is missing", () => {
    expect(deriveNextTermStart(null, "2025-10-10")).toBe("2026-10-10");
    expect(deriveNextTermStart(null, null)).toBeNull();
  });
});

describe("showRenewalAgreedStamp", () => {
  it("shows for Client staying before the derived effective date", () => {
    expect(
      showRenewalAgreedStamp({
        renewalHandled: true,
        ...TERM,
        asOf: BEFORE,
      }),
    ).toBe(true);
    expect(etDateKey(BEFORE)).toBe("2026-09-24");
  });

  it("stays hidden when the policy is not Client staying", () => {
    expect(
      showRenewalAgreedStamp({
        renewalHandled: false,
        ...TERM,
        asOf: BEFORE,
      }),
    ).toBe(false);
    expect(
      showRenewalAgreedStamp({
        renewalHandled: null,
        renewedEffective: "2099-01-01",
        asOf: BEFORE,
      }),
    ).toBe(false);
  });

  it("clears on the derived effective day and stays clear after", () => {
    const arrival = new Date("2026-10-10T16:00:00.000Z");
    expect(etDateKey(arrival)).toBe("2026-10-10");
    expect(
      showRenewalAgreedStamp({
        renewalHandled: true,
        ...TERM,
        asOf: arrival,
      }),
    ).toBe(false);
    expect(
      showRenewalAgreedStamp({
        renewalHandled: true,
        ...TERM,
        asOf: new Date("2026-10-11T16:00:00.000Z"),
      }),
    ).toBe(false);
  });

  it("still shows the evening before, after UTC has rolled (Eastern day)", () => {
    const evening = new Date("2026-10-10T00:30:00.000Z");
    expect(etDateKey(evening)).toBe("2026-10-09");
    expect(
      showRenewalAgreedStamp({
        renewalHandled: true,
        ...TERM,
        asOf: evening,
      }),
    ).toBe(true);
    const justAfterMidnightEt = new Date("2026-10-10T04:30:00.000Z");
    expect(etDateKey(justAfterMidnightEt)).toBe("2026-10-10");
    expect(
      showRenewalAgreedStamp({
        renewalHandled: true,
        ...TERM,
        asOf: justAfterMidnightEt,
      }),
    ).toBe(false);
  });

  it("uses a stored renewed effective and ignores the derived date", () => {
    expect(
      showRenewalAgreedStamp({
        renewalHandled: true,
        renewedEffective: "2026-11-01",
        ...TERM,
        asOf: new Date("2026-10-10T16:00:00.000Z"),
      }),
    ).toBe(true);
    expect(
      showRenewalAgreedStamp({
        renewalHandled: true,
        renewedEffective: "2026-11-01",
        ...TERM,
        asOf: new Date("2026-11-01T16:00:00.000Z"),
      }),
    ).toBe(false);
    expect(renewalAgreedEffectiveKey({ renewedEffective: "2026-11-01", ...TERM })).toBe("2026-11-01");
  });

  it("clears the morning the rolled term is in force", () => {
    const arrival = new Date("2026-10-10T16:00:00.000Z");
    expect(
      showRenewalAgreedStamp({
        renewalHandled: true,
        termEffective: "2026-10-10",
        termExpiration: "2027-10-09",
        priorExpiration: "2026-10-09",
        asOf: arrival,
      }),
    ).toBe(false);
  });

  it("keeps the stamp on a mid-term policy whose prior term already rolled last year", () => {
    expect(
      showRenewalAgreedStamp({
        renewalHandled: true,
        termEffective: "2025-10-10",
        termExpiration: "2026-10-09",
        priorExpiration: "2025-10-09",
        asOf: BEFORE,
      }),
    ).toBe(true);
  });

  it("hides when no term dates are stored", () => {
    expect(showRenewalAgreedStamp({ renewalHandled: true, asOf: BEFORE })).toBe(false);
  });
});

describe("stackRenewCueText", () => {
  it("drops the expiration date and keeps the renews countdown", () => {
    expect(stackRenewCueText("Renews in 12d, Oct 3, 2026")).toBe("Renews in 12d");
    expect(stackRenewCueText("Renews in 1d, Oct 9, 2026")).toBe("Renews in 1d");
    expect(stackRenewCueText("Renews in 12d")).toBe("Renews in 12d");
  });

  it("leaves non-renews cues alone", () => {
    expect(stackRenewCueText("Expired Mar 31, 2026")).toBe("Expired Mar 31, 2026");
    expect(stackRenewCueText("Expires soon")).toBe("Expires soon");
    expect(stackRenewCueText("1 open claim · Renews in 12d, Oct 3, 2026")).toBe(
      "1 open claim · Renews in 12d",
    );
  });
});

describe("renewal agreed stamp source", () => {
  it("compares Eastern calendar days and does not bucket with toISOString", () => {
    const source = readFileSync("src/lib/book-lists/renewal-agreed-stamp.ts", "utf8");
    expect(source).toMatch(/from "@\/lib\/time\/et"/);
    expect(source).toMatch(/etDateKey/);
    expect(source).not.toMatch(/\.toISOString\(/);
  });
});
