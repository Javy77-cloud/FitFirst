import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  draftGapFromQuoteNeed,
  guessGapSurface,
  isOperationalQuoteNote,
  looksLikeCarrierNeed,
} from "./promote";
import {
  GAP_PRODUCT_LINES,
  GAP_SURFACE_LABEL,
  gapDedupeKey,
  parseGapStatus,
  parseGapSurface,
  productLineLabel,
} from "./types";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("carrier missing-question tracker", () => {
  it("parses surface, status, and product-line labels without inventing carriers", () => {
    expect(parseGapSurface("risk_profile")).toBe("risk_profile");
    expect(parseGapSurface("details")).toBe("details");
    expect(parseGapSurface("nope")).toBe("details");
    expect(parseGapStatus("added")).toBe("added");
    expect(parseGapStatus("")).toBe("open");
    expect(GAP_SURFACE_LABEL.details).toBe("Deal Details");
    expect(GAP_SURFACE_LABEL.risk_profile).toBe("Risk Profile");
    expect(productLineLabel("homeowners")).toBe("Home (HO)");
    expect(productLineLabel("HO3")).toBe("Home (HO)");
    expect(productLineLabel("life_term")).toBe("Term Life");
    expect(productLineLabel("Custom boat rider")).toBe("Custom boat rider");
    expect(GAP_PRODUCT_LINES.some((row) => /citizens|universal|trident/i.test(row.label))).toBe(
      false,
    );
  });

  it("logs a quote-row need once via a stable dedupe key", () => {
    const a = gapDedupeKey({
      note: "  Needs months occupied  ",
      productLine: "homeowners",
      carrier: "Southern Oak",
    });
    const b = gapDedupeKey({
      note: "needs months occupied",
      productLine: "Home (HO)",
      carrier: "southern oak",
    });
    expect(a).toBe(b);
    expect(looksLikeCarrierNeed("Carrier needs months occupied — no field on the sheet")).toBe(
      true,
    );
    expect(looksLikeCarrierNeed("Re-quote queued for Southern Oak.")).toBe(false);
    expect(isOperationalQuoteNote("Agent accepted Cov A floor $450,000 for re-quote")).toBe(true);
    const draft = draftGapFromQuoteNeed({
      body: "needs months occupied — not on the Risk Profile",
      carrier: "Southern Oak",
      productLine: "landlord",
    });
    expect(draft).toEqual({
      note: "needs months occupied — not on the Risk Profile",
      productLine: "Landlord / DP",
      carrier: "Southern Oak",
      suggestedSurface: "risk_profile",
    });
    expect(draftGapFromQuoteNeed({ body: "Re-quote queued for Oak." })).toBeNull();
  });

  it("guesses Deal Details vs Risk Profile from the ask", () => {
    expect(guessGapSurface("needs mailing address for the named insured")).toBe("details");
    expect(guessGapSurface("needs roof year and wind mit")).toBe("risk_profile");
    expect(guessGapSurface("carrier asked for a field we do not have")).toBe("risk_profile");
  });

  it("wires an Admin/Developer list with an honest empty state and no seed rows", () => {
    const page = source("src/app/developer/missing-questions/page.tsx");
    const settings = source("src/app/settings/developer-hub/missing-questions/page.tsx");
    const panel = source("src/components/developer/missing-questions-panel.tsx");
    const hub = source("src/lib/developer-hub/hub.ts");
    const nav = source("src/lib/settings/nav.ts");
    const seed = source("src/lib/db/seed.ts");
    const sql = source("drizzle/0135_carrier_missing_questions.sql");
    expect(page).toMatch(/requireAdminOrDeveloperPage/);
    expect(panel).toMatch(/data-ff-missing-questions-empty/);
    expect(panel).toMatch(/Nothing logged yet/);
    expect(settings).toMatch(/requireAdminOrDeveloperPage/);
    expect(hub).toMatch(/missing-questions/);
    expect(nav).toMatch(/\/settings\/developer-hub\/missing-questions/);
    expect(sql).toMatch(/carrier_missing_questions/);
    expect(sql).not.toMatch(/INSERT INTO "carrier_missing_questions"/i);
    expect(seed).not.toMatch(/carrierMissingQuestions|carrier_missing_questions/);
    expect(page).not.toMatch(/Citizens|Universal Property|TypTap|example row/i);
  });

  it("exposes a quote-note promote hook without auto-logging every note", () => {
    const notepad = source("src/components/deal/quote-note-pad.tsx");
    expect(notepad).toMatch(/promoteQuoteNeedToGapAction/);
    expect(notepad).toMatch(/canLogGap/);
    expect(notepad).toMatch(/data-ff-quote-note-log-gap/);
    expect(notepad).not.toMatch(/promoteQuoteNeedToGapAction\(data\)/);
  });
});
