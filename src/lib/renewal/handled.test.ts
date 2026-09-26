import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_DESK_LINE_SETTINGS } from "@/lib/desk/line-settings";
import type { RenewalBoardCard } from "@/lib/renewal/board-data";
import {
  filterRenewalCards,
  isRenewalHandledStage,
  isRenewalShoppingStage,
  renewalStagesForPipeline,
} from "@/lib/renewal/board-filter";
import {
  assertClientStayingAvailable,
  CLIENT_STAYING_EARLY_CANCEL,
  CLIENT_STAYING_EARLY_CODE,
  CLIENT_STAYING_EARLY_CONFIRM,
  CLIENT_STAYING_NO_RENEWAL_DATE,
  CLIENT_STAYING_TOO_EARLY,
  CLIENT_STAYING_WINDOW_DAYS,
  ClientStayingEarlyConfirmError,
  clientStayingEarlyConfirmMessage,
  clientStayingEarlyRefusal,
  clientStayingUnavailableReason,
  confirmEarlyClientStayingRequested,
  isClientStayingAvailable,
  isClientStayingEarlyResult,
  isRenewalHandledStageValue,
  planClientStayingClick,
  RENEWAL_HANDLED_CLEAR_KINDS,
  RENEWAL_HANDLED_FILTER_LABEL,
  RENEWAL_HANDLED_LABEL,
  RENEWAL_HANDLED_STAGE,
  RENEWAL_HANDLED_SUCCESS_BODY,
  RENEWAL_HANDLED_SUCCESS_CONGRATS,
  RENEWAL_HANDLED_SUCCESS_DONE,
  RENEWAL_HANDLED_SUCCESS_TITLE,
  renewalProximityDrivesCare,
} from "@/lib/renewal/handled";
import { showRenewalAgreedStamp } from "@/lib/policies/renewal-agreed";
import { FLASH_COPY, resolveFlashMessage } from "@/lib/flash";

function card(
  partial: Partial<RenewalBoardCard> & Pick<RenewalBoardCard, "stage" | "lineOfBusiness">,
): RenewalBoardCard {
  return {
    queueId: partial.queueId ?? partial.policyNumber ?? "q",
    policyId: partial.policyId ?? "p",
    displayName: partial.displayName ?? partial.policyNumber ?? "HO-1",
    policyNumber: partial.policyNumber ?? "HO-1",
    clientName: partial.clientName ?? "Client",
    contactId: null,
    accountId: null,
    email: null,
    phone: null,
    carrierName: "Carrier",
    expirationDate: null,
    renewalDate: null,
    daysUntil: 30,
    premium: null,
    proposedPremium: null,
    premiumDelta: null,
    premiumDeltaPct: null,
    policySubType: partial.policySubType ?? null,
    insuranceType: partial.insuranceType ?? null,
    commissionFamily: partial.commissionFamily ?? null,
    ownerId: null,
    ownerName: null,
    partyKey: "",
    risk: "low",
    riskScore: 0,
    why: "",
    whyExtra: null,
    hasCurrentTerm: false,
    hasProposedTerm: false,
    canCompare: false,
    chasedThisBand: false,
    reviewDue: false,
    reviewSkipCount: 0,
    healthStars: 4,
    policyHealthStars: 4,
    healthSource: "model",
    healthFlagged: false,
    lastContactDays: null,
    policyHealth: null,
    clientHealth: null,
    autopilotQueued: false,
    autopilotEscalated: false,
    ...partial,
  };
}

describe("Client staying / Handled", () => {
  it("labels Client staying and clears silence + autopilot", () => {
    expect(RENEWAL_HANDLED_LABEL).toBe("Client staying");
    expect(RENEWAL_HANDLED_FILTER_LABEL).toBe("Handled");
    expect(RENEWAL_HANDLED_STAGE).toBe("handled");
    expect([...RENEWAL_HANDLED_CLEAR_KINDS]).toEqual(["renewal_silence", "renewal_autopilot"]);
    expect(RENEWAL_HANDLED_SUCCESS_TITLE).toBe("Client staying");
    expect(RENEWAL_HANDLED_SUCCESS_CONGRATS).toMatch(/keeping them/i);
    expect(RENEWAL_HANDLED_SUCCESS_BODY).toMatch(/Handled/);
    expect(RENEWAL_HANDLED_SUCCESS_BODY).toMatch(/next renewal/i);
    expect(RENEWAL_HANDLED_SUCCESS_DONE).toBe("Got it");
    expect(renewalProximityDrivesCare(true)).toBe(false);
    expect(renewalProximityDrivesCare(false)).toBe(true);
    expect(FLASH_COPY["client-staying"]).toMatch(/client staying/i);
    expect(resolveFlashMessage("client-staying")).toBe(FLASH_COPY["client-staying"]);
  });

  it("keeps handled out of shopping; Handled pipeline shows them", () => {
    expect(isRenewalShoppingStage("handled")).toBe(false);
    expect(isRenewalHandledStage("handled")).toBe(true);
    const rows = [
      card({ stage: "upcoming", lineOfBusiness: "HO3", policyNumber: "HO-1" }),
      card({ stage: "handled", lineOfBusiness: "HO3", policyNumber: "HO-H" }),
      card({ stage: "bound", lineOfBusiness: "AUTO", policyNumber: "AU-B" }),
    ];
    expect(filterRenewalCards(rows, {}, DEFAULT_DESK_LINE_SETTINGS).map((r) => r.policyNumber)).toEqual([
      "HO-1",
    ]);
    expect(
      filterRenewalCards(rows, { pipeline: "handled" }, DEFAULT_DESK_LINE_SETTINGS).map((r) => r.policyNumber),
    ).toEqual(["HO-H"]);
    expect(
      renewalStagesForPipeline(
        [{ slug: "upcoming" }, { slug: "handled" }, { slug: "bound" }],
        "handled",
      ).map((s) => s.slug),
    ).toEqual(["handled"]);
  });

  it("wires Client staying UI + day-of clear", () => {
    expect(readFileSync("src/components/renewals/renewal-card.tsx", "utf8")).toMatch(/ClientStayingButton/);
    expect(readFileSync("src/components/policy/tabs/overview-tab.tsx", "utf8")).toMatch(/ClientStayingButton/);
    expect(readFileSync("src/components/policy/compare-panel.tsx", "utf8")).toMatch(/ClientStayingButton/);
    expect(readFileSync("src/components/renewals/renewal-compare-drawer.tsx", "utf8")).toMatch(
      /ClientStayingButton/,
    );
    expect(readFileSync("src/app/actions/renewals-board.ts", "utf8")).toMatch(/markClientStaying/);
    expect(readFileSync("src/lib/notifications/term-start-effects.ts", "utf8")).toMatch(
      /planTermStartRoleFlip/,
    );
    expect(readFileSync("src/lib/notifications/sync-panel.ts", "utf8")).toMatch(/applyTermStartEffects/);
    expect(readFileSync("src/lib/book-lists/heat.ts", "utf8")).toMatch(/renewalProximityDrivesCare/);
    expect(readFileSync("src/lib/policy/care-strip.ts", "utf8")).toMatch(/renewalProximityDrivesCare/);
    expect(readFileSync("src/lib/book-lists/load.ts", "utf8")).toMatch(
      /eq\(renewalQueue\.stage, RENEWAL_HANDLED_STAGE\)/,
    );
    expect(readFileSync("src/app/policies/[id]/page.tsx", "utf8")).toMatch(/renewalHandled/);
    const button = readFileSync("src/components/renewals/client-staying-button.tsx", "utf8");
    expect(button).toMatch(/flashAction\("client-staying"\)/);
    expect(button).toMatch(/data-ff-client-staying-success/);
    expect(button).toMatch(/RENEWAL_HANDLED_SUCCESS_TITLE/);
    expect(button).toMatch(/setSuccessOpen\(true\)/);
    expect(button).toMatch(/Got it|RENEWAL_HANDLED_SUCCESS_DONE/);
    expect(button).toMatch(/planClientStayingClick/);
    expect(button).toMatch(/isClientStayingEarlyResult/);
    expect(button).toMatch(/confirmEarlyClientStaying/);
    expect(button).toMatch(/data-ff-client-staying-blocked/);
    expect(button).toMatch(/data-ff-client-staying-early-dialog/);
    expect(button).toMatch(/data-ff-client-staying-early-cancel/);
    expect(button).toMatch(/data-ff-client-staying-early-confirm/);
    expect(button).toMatch(/onClick=\{\(\) => setEarlyOpen\(false\)\}/);
    expect(button).toMatch(/onClick=\{\(\) => save\(true\)\}/);
    expect(button).toMatch(/fd\.set\("confirmEarlyClientStaying", "true"\)/);
    expect(button).toMatch(/renewalDate/);
    const action = readFileSync("src/app/actions/renewals-board.ts", "utf8");
    const mark = action.slice(action.indexOf("export async function markClientStaying"));
    expect(mark).toMatch(/assertClientStayingAvailable/);
    expect(mark).toMatch(/confirmEarlyClientStaying/);
    expect(mark).toMatch(/clientStayingEarlyRefusal/);
    expect(mark.indexOf("if (early) return early")).toBeGreaterThan(-1);
    expect(mark.indexOf("if (early) return early")).toBeLessThan(mark.indexOf("insert(renewalQueue)"));
    const page = readFileSync("src/app/policies/[id]/page.tsx", "utf8");
    expect(page).toMatch(/isRenewalHandledStageValue\(renewalQueueRow\?\.stage\)/);
    const effects = readFileSync("src/lib/notifications/term-start-effects.ts", "utf8");
    expect(effects).toMatch(/releaseClientStayingForPolicy/);
    expect(effects).toMatch(/renewedEffective:\s*input\.termEffective/);
    expect(effects).not.toMatch(/force:\s*true/);
    const release = readFileSync("src/lib/renewal/release-handled.ts", "utf8");
    expect(release).toMatch(/CLIENT_STAYING_AFTER_RENEWAL_STAGE/);
    expect(release).toMatch(/RENEWAL_HANDLED_STAGE/);
    expect(release).toMatch(/renewedTermEffectiveReached/);
    expect(release).not.toMatch(/CLIENT_STAYING_WINDOW_DAYS/);
    expect(release).not.toMatch(/force\?:\s*boolean/);
    expect(release).not.toMatch(/options\?\.force/);
    expect(readFileSync("src/lib/notifications/sync-panel.ts", "utf8")).toMatch(
      /releaseExpiredClientStaying/,
    );
    const advance = readFileSync("src/lib/policy/advance-current-term-apply.ts", "utf8");
    expect(advance).toMatch(/releaseClientStayingForPolicy/);
    expect(advance).toMatch(/renewedEffective:\s*toEffective/);
    expect(advance).not.toMatch(/force:\s*true/);
  });

  it("marks inside 90 days with no warning and asks to confirm outside that window", () => {
    expect(CLIENT_STAYING_WINDOW_DAYS).toBe(90);
    expect(CLIENT_STAYING_EARLY_CANCEL).toBe("Cancel");
    expect(CLIENT_STAYING_EARLY_CONFIRM).toBe("Confirm");
    const asOf = new Date("2026-09-24T12:00:00.000Z");

    expect(isClientStayingAvailable(null, asOf)).toBe(false);
    expect(isClientStayingAvailable(undefined, asOf)).toBe(false);
    expect(isClientStayingAvailable("", asOf)).toBe(false);
    expect(clientStayingUnavailableReason(null, asOf)).toBe(CLIENT_STAYING_NO_RENEWAL_DATE);
    expect(planClientStayingClick(null, asOf)).toEqual({
      kind: "blocked",
      reason: CLIENT_STAYING_NO_RENEWAL_DATE,
    });
    expect(clientStayingEarlyRefusal(null, asOf)).toBeNull();
    expect(() => assertClientStayingAvailable(null, asOf)).toThrow(CLIENT_STAYING_NO_RENEWAL_DATE);
    expect(() =>
      assertClientStayingAvailable(null, asOf, { confirmEarlyClientStaying: true }),
    ).toThrow(CLIENT_STAYING_NO_RENEWAL_DATE);

    // Inside the window, including the renewal day and exactly 90 days out: no confirm.
    expect(isClientStayingAvailable("2026-12-01T12:00:00.000Z", asOf)).toBe(true);
    expect(isClientStayingAvailable("2026-09-24T12:00:00.000Z", asOf)).toBe(true);
    expect(isClientStayingAvailable("2026-12-23T12:00:00.000Z", asOf)).toBe(true);
    expect(planClientStayingClick("2026-12-23T12:00:00.000Z", asOf)).toEqual({ kind: "mark" });
    expect(clientStayingEarlyRefusal("2026-10-01T12:00:00.000Z", asOf)).toBeNull();
    expect(clientStayingUnavailableReason("2026-10-01T12:00:00.000Z", asOf)).toBeNull();
    expect(() => assertClientStayingAvailable("2026-10-01T12:00:00.000Z", asOf)).not.toThrow();
    expect(() => assertClientStayingAvailable("2026-12-23T12:00:00.000Z", asOf)).not.toThrow();

    // 91 days out: warning + explicit confirm. The confirm flag is not implied.
    expect(isClientStayingAvailable("2026-12-24T12:00:00.000Z", asOf)).toBe(false);
    expect(clientStayingUnavailableReason("2026-12-24T12:00:00.000Z", asOf)).toBeNull();
    const early91 = clientStayingEarlyRefusal("2026-12-24T12:00:00.000Z", asOf);
    expect(early91).toEqual({
      ok: false,
      code: CLIENT_STAYING_EARLY_CODE,
      daysAway: 91,
      message: clientStayingEarlyConfirmMessage(91),
    });
    expect(early91?.message).toBe(
      "This client is 91 days away from the renewal date. Are you sure you want to mark it as client staying?",
    );
    expect(planClientStayingClick("2026-12-24T12:00:00.000Z", asOf)).toMatchObject({
      kind: "confirm",
      daysAway: 91,
    });
    expect(clientStayingEarlyRefusal("2026-12-24T12:00:00.000Z", asOf, {
      confirmEarlyClientStaying: true,
    })).toBeNull();
    expect(() => assertClientStayingAvailable("2026-12-24T12:00:00.000Z", asOf)).toThrow(
      ClientStayingEarlyConfirmError,
    );
    expect(() => assertClientStayingAvailable("2026-12-24T12:00:00.000Z", asOf)).toThrow(
      /91 days away/,
    );
    expect(() =>
      assertClientStayingAvailable("2026-12-24T12:00:00.000Z", asOf, {
        confirmEarlyClientStaying: true,
      }),
    ).not.toThrow();
    expect(confirmEarlyClientStayingRequested("true")).toBe(true);
    expect(confirmEarlyClientStayingRequested(true)).toBe(true);
    expect(confirmEarlyClientStayingRequested("false")).toBe(false);
    expect(confirmEarlyClientStayingRequested(null)).toBe(false);
    expect(confirmEarlyClientStayingRequested("1")).toBe(false);
    expect(isClientStayingEarlyResult(early91)).toBe(true);
    expect(isClientStayingEarlyResult({ ok: true })).toBe(false);

    const yearOut = clientStayingEarlyRefusal("2027-09-24T12:00:00.000Z", asOf);
    expect(yearOut?.code).toBe(CLIENT_STAYING_EARLY_CODE);
    expect(yearOut?.daysAway).toBeGreaterThan(90);
    expect(yearOut?.message).toBe(clientStayingEarlyConfirmMessage(yearOut?.daysAway ?? 0));
    expect(clientStayingUnavailableReason("2027-09-24T12:00:00.000Z", asOf)).toBeNull();

    // Past the renewal day stays a hard block, even with the confirm flag.
    expect(isClientStayingAvailable("2026-09-23T12:00:00.000Z", asOf)).toBe(false);
    expect(clientStayingUnavailableReason("2026-09-23T12:00:00.000Z", asOf)).toBe(
      CLIENT_STAYING_TOO_EARLY,
    );
    expect(clientStayingEarlyRefusal("2026-09-23T12:00:00.000Z", asOf)).toBeNull();
    expect(() =>
      assertClientStayingAvailable("2026-09-23T12:00:00.000Z", asOf, {
        confirmEarlyClientStaying: true,
      }),
    ).toThrow(CLIENT_STAYING_TOO_EARLY);
  });

  it("shows Renewal agreed only while stage is handled, and clears it on the renewal day in ET", () => {
    const window = {
      renewalDate: "2026-10-10",
      effectiveDate: "2025-10-10",
      expirationDate: "2026-10-09",
    };
    const before = new Date("2026-10-09T16:00:00.000Z");
    const onDay = new Date("2026-10-10T16:00:00.000Z");
    for (const stage of [undefined, null, "", "upcoming", "contacted", "quoted", "bound", "lost"]) {
      expect(isRenewalHandledStageValue(stage)).toBe(false);
      expect(
        showRenewalAgreedStamp(
          { ...window, clientStaying: isRenewalHandledStageValue(stage) },
          before,
        ),
      ).toBe(false);
    }
    expect(isRenewalHandledStageValue(RENEWAL_HANDLED_STAGE)).toBe(true);
    expect(
      showRenewalAgreedStamp(
        { ...window, clientStaying: isRenewalHandledStageValue("handled") },
        before,
      ),
    ).toBe(true);
    expect(
      showRenewalAgreedStamp(
        { ...window, clientStaying: isRenewalHandledStageValue("handled") },
        onDay,
      ),
    ).toBe(false);
    // 8:30 PM EDT the night before is still the prior Eastern day.
    expect(
      showRenewalAgreedStamp(
        { ...window, clientStaying: true },
        new Date("2026-10-10T00:30:00.000Z"),
      ),
    ).toBe(true);
  });
});
