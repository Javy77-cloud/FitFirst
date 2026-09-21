import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { EXPLICIT_MARKET_ACTION_MARKER } from "@/lib/deals/manual-markets";
import { nextShopFlowAfterSheetConfirm } from "@/lib/deals/shop-flow";
import { lineAlreadyShopped, riskConfirmTab } from "@/lib/deals/risk-confirm-next";
import { keepFilledCurrentPolicyOnConfirm } from "@/lib/quote-sheet/apply";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("risk confirm next step", () => {
  it("sends an unshopped Auto confirm to Markets even when Home was already shopped", () => {
    expect(
      lineAlreadyShopped({
        line: "auto",
        logs: [
          {
            id: "log-home",
            lineOfBusiness: "HO",
            why: `${EXPLICIT_MARKET_ACTION_MARKER} requested`,
          },
        ],
        quotes: [{ stub: false, shopLine: "home", notes: "Rated" }],
      }),
    ).toBe(false);
    expect(riskConfirmTab({ shopped: false, binding: false })).toBe("markets");
  });

  it("sends a shopped line to Quotes and a binding line to Quotes", () => {
    expect(
      lineAlreadyShopped({
        line: "auto",
        logs: [
          {
            id: "log-auto",
            lineOfBusiness: "AUTO",
            why: `${EXPLICIT_MARKET_ACTION_MARKER} requested`,
          },
        ],
      }),
    ).toBe(true);
    expect(
      lineAlreadyShopped({
        line: "auto",
        quotes: [{ stub: false, shopLine: "auto", notes: "Progressive 1640" }],
      }),
    ).toBe(true);
    expect(lineAlreadyShopped({ line: "auto", requestCarrierIds: ["progressive"] })).toBe(true);
    expect(lineAlreadyShopped({ line: "auto" })).toBe(false);
    expect(riskConfirmTab({ shopped: true, binding: false })).toBe("quotes");
    expect(riskConfirmTab({ shopped: false, binding: true })).toBe("quotes");
  });

  it("drops a shopping Create policy prompt on confirm and keeps Current policy keys", () => {
    const cleared = nextShopFlowAfterSheetConfirm({
      saved: {
        pendingDecPrompt: {
          documentId: "dec-1",
          carrierName: "Progressive",
          createdAt: "2026-09-01T00:00:00.000Z",
        },
        sheetRecheckLines: { auto: true },
      },
      line: "auto",
      clearCreatePolicyPrompt: true,
    });
    expect(cleared.pendingDecPrompt).toBeNull();
    expect(cleared.sheetRecheckLines?.auto).toBe(false);

    const kept = keepFilledCurrentPolicyOnConfirm(
      {
        effective_date: { value: "03/15/2026", status: "check", source: "extracted" },
        expiration_date: { value: "09/15/2026", status: "check", source: "extracted" },
        policy_number: { value: "PA-441902", status: "check", source: "extracted" },
        current_carrier: { value: "Progressive", status: "check", source: "extracted" },
        driver_1_name: { value: "Domenic Iori", status: "check", source: "extracted" },
      },
      {
        effective_date: "",
        expiration_date: "",
        policy_number: "",
        current_carrier: "GEICO",
        driver_1_name: "",
      },
    );
    expect(kept.effective_date).toBeUndefined();
    expect(kept.expiration_date).toBeUndefined();
    expect(kept.policy_number).toBeUndefined();
    expect(kept.current_carrier).toBe("GEICO");
    expect(kept.driver_1_name).toBe("");
    expect(source("src/app/actions/quoting.ts")).toMatch(/keepFilledCurrentPolicyOnConfirm/);
    expect(source("src/app/actions/quoting.ts")).toMatch(/forceDealWorkTab\(dealId, "markets"\)/);
  });
});
