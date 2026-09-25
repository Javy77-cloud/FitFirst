import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, replace: () => undefined, push: () => undefined }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/deals/gloria",
}));

import { MasterSheetCompare } from "@/components/deal/master-sheet-compare";
import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import {
  applyExtractedToSheet,
  keepFilledCurrentPolicyOnConfirm,
  mergeAgentEdits,
} from "@/lib/quote-sheet/apply";
import {
  CURRENT_POLICY_EFFECTIVE_LABEL,
  CURRENT_POLICY_EXPIRATION_LABEL,
  QUOTE_EFFECTIVE_DATE_KEY,
  QUOTE_EFFECTIVE_DATE_LABEL,
  blankSheetWithDefaults,
  emptySheetValues,
  extractKeyToSheetKey,
  fieldsForLine,
} from "@/lib/quote-sheet/catalog";
import { hideCrossProductDealFacts } from "@/lib/quote-sheet/product-fact-scope";
import type { ShopLine } from "@/lib/domain";

const DATE_LABELS = [
  QUOTE_EFFECTIVE_DATE_LABEL,
  CURRENT_POLICY_EFFECTIVE_LABEL,
  CURRENT_POLICY_EXPIRATION_LABEL,
] as const;

function cell(value: string, source: QuoteSheetFieldValue["source"] = "agent"): QuoteSheetFieldValue {
  return { value, status: source === "agent" ? "confirmed" : "check", source };
}

describe("Current policy term dates on the Risk Profile", () => {
  it("exposes quote, current effective, and current expiration together on home", () => {
    for (const product of ["homeowners", "landlord", "renters"] as const) {
      const fields = fieldsForLine("home", product, product === "homeowners" ? "HO3" : undefined);
      const quote = fields.find((field) => field.key === QUOTE_EFFECTIVE_DATE_KEY);
      const effective = fields.find((field) => field.key === "effective_date");
      const expiration = fields.find((field) => field.key === "expiration_date");
      expect(quote?.label, product).toBe(QUOTE_EFFECTIVE_DATE_LABEL);
      expect(effective?.label, product).toBe(CURRENT_POLICY_EFFECTIVE_LABEL);
      expect(expiration?.label, product).toBe(CURRENT_POLICY_EXPIRATION_LABEL);
      expect(quote?.group).toBe("Current Policy");
      expect(effective?.group).toBe("Current Policy");
      expect(expiration?.group).toBe("Current Policy");
      expect(quote?.extractKey).toBeUndefined();
      expect(effective?.extractKey).toBe("effective_date");
      expect(expiration?.extractKey).toBe("expiration_date");
      expect(fields.filter((field) => field.key === "current_policy_effective_date")).toHaveLength(0);
      const keys = fields.map((field) => field.key);
      expect(keys.indexOf(QUOTE_EFFECTIVE_DATE_KEY)).toBeLessThan(keys.indexOf("effective_date"));
      expect(keys.indexOf("effective_date")).toBeLessThan(keys.indexOf("expiration_date"));
    }
  });

  it("uses the same three dates on every other Current policy block", () => {
    for (const line of ["auto", "rec_rv", "umbrella"] as const) {
      const fields = fieldsForLine(line);
      const labels = DATE_LABELS.map((label) => fields.find((field) => field.label === label));
      expect(labels.every(Boolean), line).toBe(true);
      for (const field of labels) {
        expect(field?.group).toBe("Current policy");
      }
      expect(fields.find((field) => field.key === QUOTE_EFFECTIVE_DATE_KEY)?.extractKey).toBeUndefined();
    }
    const auto = fieldsForLine("auto");
    expect(auto.find((field) => field.key === "effective_date")?.extractKey).toBe("effective_date");
    expect(auto.find((field) => field.key === "expiration_date")?.extractKey).toBe("expiration_date");
    for (const line of ["rec_rv", "umbrella"] as const) {
      const fields = fieldsForLine(line);
      expect(fields.find((field) => field.key === "effective_date")?.extractKey).toBeUndefined();
      expect(fields.find((field) => field.key === "expiration_date")?.extractKey).toBeUndefined();
    }
  });

  it("keeps Flood's new-business date on effective_date and adds the in-force start beside it", () => {
    const fields = fieldsForLine("flood");
    expect(fields.find((field) => field.key === "effective_date")?.label).toBe(QUOTE_EFFECTIVE_DATE_LABEL);
    expect(fields.find((field) => field.key === "current_policy_effective_date")?.label).toBe(
      CURRENT_POLICY_EFFECTIVE_LABEL,
    );
    expect(fields.find((field) => field.key === "expiration_date")?.label).toBe(CURRENT_POLICY_EXPIRATION_LABEL);
    expect(fields.find((field) => field.key === QUOTE_EFFECTIVE_DATE_KEY)).toBeUndefined();
    expect(fields.find((field) => field.key === "current_policy_effective_date")?.extractKey).toBeUndefined();
    expect(fields.find((field) => field.key === "expiration_date")?.extractKey).toBe("expiration_date");
    const keys = fields.map((field) => field.key);
    expect(keys.indexOf("effective_date")).toBeLessThan(keys.indexOf("current_policy_effective_date"));
    expect(keys.indexOf("current_policy_effective_date")).toBeLessThan(keys.indexOf("expiration_date"));
  });

  it("leaves existing sheets valid until an agent types the quote date", () => {
    const existing = emptySheetValues("home", "homeowners");
    delete existing[QUOTE_EFFECTIVE_DATE_KEY];
    expect(existing.effective_date.value).toBe("");
    expect(existing.expiration_date.value).toBe("");

    const untouched = mergeAgentEdits(existing, { policy_number: "MFLH2122576-02" }, "home", "homeowners");
    expect(untouched[QUOTE_EFFECTIVE_DATE_KEY]).toBeUndefined();
    expect(untouched.policy_number.value).toBe("MFLH2122576-02");

    const saved = mergeAgentEdits(
      untouched,
      {
        [QUOTE_EFFECTIVE_DATE_KEY]: "10/15/2026",
        effective_date: "04/15/2026",
        expiration_date: "04/15/2027",
      },
      "home",
      "homeowners",
    );
    expect(saved[QUOTE_EFFECTIVE_DATE_KEY]).toMatchObject({
      value: "10/15/2026",
      status: "confirmed",
      source: "agent",
    });
    expect(saved.effective_date.value).toBe("04/15/2026");
    expect(saved.expiration_date.value).toBe("04/15/2027");

    const reloaded = mergeAgentEdits(saved, {}, "home", "homeowners");
    expect(reloaded[QUOTE_EFFECTIVE_DATE_KEY]?.value).toBe("10/15/2026");
    expect(reloaded.effective_date.value).toBe("04/15/2026");
    expect(reloaded.expiration_date.value).toBe("04/15/2027");
  });

  it("maps a declaration onto the in-force term and not the quote effective date", () => {
    expect(extractKeyToSheetKey("home", "effective_date")).toBe("effective_date");
    expect(extractKeyToSheetKey("home", "expiration_date")).toBe("expiration_date");
    expect(extractKeyToSheetKey("auto", "effective_date")).toBe("effective_date");

    const applied = applyExtractedToSheet("home", emptySheetValues("home", "homeowners"), [
      { fieldKey: "effective_date", normalizedValue: "04/15/2026", sourceLabel: "dec page" },
      { fieldKey: "expiration_date", normalizedValue: "04/15/2027", sourceLabel: "dec page" },
    ]);
    expect(applied.values.effective_date.value).toBe("04/15/2026");
    expect(applied.values.expiration_date.value).toBe("04/15/2027");
    expect(applied.values[QUOTE_EFFECTIVE_DATE_KEY]?.value ?? "").toBe("");
    expect(applied.filledKeys).not.toContain(QUOTE_EFFECTIVE_DATE_KEY);

    expect(extractKeyToSheetKey("flood", "effective_date")).toBe("effective_date");
    expect(extractKeyToSheetKey("flood", "effective_date")).not.toBe("current_policy_effective_date");
    const flood = applyExtractedToSheet("flood", blankSheetWithDefaults("flood"), [
      { fieldKey: "expiration_date", normalizedValue: "04/15/2027", sourceLabel: "dec page" },
      { fieldKey: "effective_date", normalizedValue: "04/15/2026", sourceLabel: "dec page" },
    ]);
    expect(flood.values.expiration_date.value).toBe("04/15/2027");
    expect(flood.values.current_policy_effective_date.value).toBe("");
    expect(flood.filledKeys).not.toContain("current_policy_effective_date");
  });

  it("keeps the dates on the product sheet instead of a shared applicant copy", () => {
    const sibling = emptySheetValues("home", "homeowners");
    sibling[QUOTE_EFFECTIVE_DATE_KEY] = {
      value: "10/15/2026",
      status: "check",
      source: "agent",
      sourceLabel: "deal details",
    };
    sibling.effective_date = {
      value: "04/15/2026",
      status: "check",
      source: "agent",
      sourceLabel: "deal details",
    };
    sibling.named_insured = cell("Gloria Martinez");
    const hidden = hideCrossProductDealFacts(sibling, true);
    expect(hidden[QUOTE_EFFECTIVE_DATE_KEY]?.value).toBe("");
    expect(hidden.effective_date.value).toBe("");
    expect(hidden.named_insured?.value).toBe("Gloria Martinez");

    const own = emptySheetValues("home", "homeowners");
    own[QUOTE_EFFECTIVE_DATE_KEY] = cell("10/15/2026", "extracted");
    expect(hideCrossProductDealFacts(own, true)[QUOTE_EFFECTIVE_DATE_KEY]?.value).toBe("10/15/2026");
    expect(hideCrossProductDealFacts(sibling, false)[QUOTE_EFFECTIVE_DATE_KEY]?.value).toBe("10/15/2026");
  });

  it("does not blank a filled quote date when Confirm posts an empty input", () => {
    const kept = keepFilledCurrentPolicyOnConfirm(
      {
        [QUOTE_EFFECTIVE_DATE_KEY]: cell("10/15/2026", "extracted"),
        effective_date: cell("04/15/2026", "extracted"),
        expiration_date: cell("04/15/2027", "extracted"),
      },
      {
        [QUOTE_EFFECTIVE_DATE_KEY]: "",
        effective_date: "",
        expiration_date: "",
      },
    );
    expect(kept[QUOTE_EFFECTIVE_DATE_KEY]).toBeUndefined();
    expect(kept.effective_date).toBeUndefined();
    expect(kept.expiration_date).toBeUndefined();
  });

  it("renders the three home dates as editable Risk Profile fields", () => {
    const values = {
      ...emptySheetValues("home", "homeowners"),
      [QUOTE_EFFECTIVE_DATE_KEY]: cell("10/15/2026"),
      effective_date: cell("04/15/2026"),
      expiration_date: cell("04/15/2027"),
    };
    const html = renderToString(
      createElement(MasterSheetCompare, {
        dealId: "03dccdd7-db06-4c89-9b7a-cf0a2064d044",
        line: "home" satisfies ShopLine,
        fields: [],
        values,
        product: "homeowners",
        quotingForm: "HO3",
      }),
    );
    expect(html).toContain(QUOTE_EFFECTIVE_DATE_LABEL);
    expect(html).toContain(CURRENT_POLICY_EFFECTIVE_LABEL);
    expect(html).toContain(CURRENT_POLICY_EXPIRATION_LABEL);
    expect(html).toContain('name="quote_effective_date"');
    expect(html).toContain('name="effective_date"');
    expect(html).toContain('name="expiration_date"');
    expect(html).toContain("10/15/2026");
    expect(html).toContain("04/15/2026");
    expect(html).toContain("04/15/2027");
    expect(html).not.toContain("app + 30");
    expect(html).not.toContain("portals ask");
  });
});
