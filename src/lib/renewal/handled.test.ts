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
  RENEWAL_HANDLED_CLEAR_KINDS,
  RENEWAL_HANDLED_FILTER_LABEL,
  RENEWAL_HANDLED_LABEL,
  RENEWAL_HANDLED_STAGE,
  RENEWAL_HANDLED_SUCCESS_BODY,
  RENEWAL_HANDLED_SUCCESS_CONGRATS,
  RENEWAL_HANDLED_SUCCESS_DONE,
  RENEWAL_HANDLED_SUCCESS_TITLE,
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
    const button = readFileSync("src/components/renewals/client-staying-button.tsx", "utf8");
    expect(button).toMatch(/flashAction\("client-staying"\)/);
    expect(button).toMatch(/data-ff-client-staying-success/);
    expect(button).toMatch(/RENEWAL_HANDLED_SUCCESS_TITLE/);
    expect(button).toMatch(/setSuccessOpen\(true\)/);
    expect(button).toMatch(/Got it|RENEWAL_HANDLED_SUCCESS_DONE/);
  });
});
