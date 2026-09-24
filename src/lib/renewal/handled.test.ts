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
  CLIENT_STAYING_NO_RENEWAL_DATE,
  CLIENT_STAYING_TOO_EARLY,
  CLIENT_STAYING_WINDOW_DAYS,
  clientStayingUnavailableReason,
  isClientStayingAvailable,
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
    expect(readFileSync("src/lib/book-lists/load.ts", "utf8")).toMatch(/RENEWAL_HANDLED_STAGE/);
    expect(readFileSync("src/app/policies/[id]/page.tsx", "utf8")).toMatch(/renewalHandled/);
    const button = readFileSync("src/components/renewals/client-staying-button.tsx", "utf8");
    expect(button).toMatch(/flashAction\("client-staying"\)/);
    expect(button).toMatch(/data-ff-client-staying-success/);
    expect(button).toMatch(/RENEWAL_HANDLED_SUCCESS_TITLE/);
    expect(button).toMatch(/setSuccessOpen\(true\)/);
    expect(button).toMatch(/Got it|RENEWAL_HANDLED_SUCCESS_DONE/);
    expect(button).toMatch(/isClientStayingAvailable/);
    expect(button).toMatch(/data-ff-client-staying-blocked/);
    expect(button).toMatch(/renewalDate/);
    expect(readFileSync("src/app/actions/renewals-board.ts", "utf8")).toMatch(
      /assertClientStayingAvailable/,
    );
  });

  it("gates Client staying to the last 90 days before renewalDate", () => {
    expect(CLIENT_STAYING_WINDOW_DAYS).toBe(90);
    const asOf = new Date("2026-09-24T12:00:00.000Z");
    expect(isClientStayingAvailable(null, asOf)).toBe(false);
    expect(isClientStayingAvailable(undefined, asOf)).toBe(false);
    expect(isClientStayingAvailable("", asOf)).toBe(false);
    expect(clientStayingUnavailableReason(null, asOf)).toBe(CLIENT_STAYING_NO_RENEWAL_DATE);
    expect(isClientStayingAvailable("2027-09-24T12:00:00.000Z", asOf)).toBe(false);
    expect(clientStayingUnavailableReason("2027-09-24T12:00:00.000Z", asOf)).toBe(
      CLIENT_STAYING_TOO_EARLY,
    );
    // asOf inside [renewalDate-90d, renewalDate]
    expect(isClientStayingAvailable("2026-12-01T12:00:00.000Z", asOf)).toBe(true);
    expect(isClientStayingAvailable("2026-09-24T12:00:00.000Z", asOf)).toBe(true);
    // exactly 90 days out: windowStart == asOf
    expect(isClientStayingAvailable("2026-12-23T12:00:00.000Z", asOf)).toBe(true);
    // 91 days out: still too early
    expect(isClientStayingAvailable("2026-12-24T12:00:00.000Z", asOf)).toBe(false);
    // past renewal date
    expect(isClientStayingAvailable("2026-09-23T12:00:00.000Z", asOf)).toBe(false);
    expect(() => assertClientStayingAvailable(null, asOf)).toThrow(CLIENT_STAYING_NO_RENEWAL_DATE);
    expect(() => assertClientStayingAvailable("2027-01-01T12:00:00.000Z", asOf)).toThrow(
      CLIENT_STAYING_TOO_EARLY,
    );
    expect(() => assertClientStayingAvailable("2026-10-01T12:00:00.000Z", asOf)).not.toThrow();
  });
});
