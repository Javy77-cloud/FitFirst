import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { matchAutoRiskProfileQuestion } from "@/lib/quote-bot/auto-profile-match";
import {
  AUTO_QUESTION_GAPS_RELATIVE_PATH,
  FREE_TEXT_OPTIONS_NOTE,
  MIXED_OPTIONS_NOTE,
  SEEDED_AT,
  buildSeededAutoQuestionGapList,
  captureAutoGapsFromAttemptWhy,
  memoryGapStore,
  questionsFromAttemptWhy,
  readAutoQuestionGapList,
  recordAutoQuoteGap,
  recordPortalObservedQuestions,
} from "@/lib/quote-bot/auto-question-gaps";
import { AutoQuestionGapsPanel } from "@/components/developer/auto-question-gaps-panel";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const PROGRESSIVE_WHY =
  "Auto Progressive — Conditional/blocked no rate: quote #550013376416. Portal Why: Employment required. MVR N. Form PA. quoting.foragentsonly.com. Waiting employment category.";

const DAIRYLAND_WHY =
  "Auto Dairyland — Quoted #371664290. Bindable No — leftover: DL number + lienholder report details required; insurance score not found. MVR N.";

const GEICO_EDUCATION_WHY =
  "Auto Geico — Portal Why: Education Level blank; Next disabled.";

const GEICO_HOLD_WHY = "holding — ownership_length + commute_days_week blank, not inventing; no premium.";

describe("auto risk profile question match", () => {
  it("treats education, gender, license, ownership, and commute as fields already on the profile", () => {
    expect(matchAutoRiskProfileQuestion("Education Level blank").onProfile).toBe(true);
    expect(matchAutoRiskProfileQuestion("gender required").onProfile).toBe(true);
    expect(matchAutoRiskProfileQuestion("DL number").onProfile).toBe(true);
    expect(matchAutoRiskProfileQuestion("ownership_length").onProfile).toBe(true);
    expect(matchAutoRiskProfileQuestion("commute_days_week").onProfile).toBe(true);
    expect(matchAutoRiskProfileQuestion("How long have you owned this vehicle?").onProfile).toBe(true);
    expect(matchAutoRiskProfileQuestion("What is the VIN?").onProfile).toBe(true);
  });

  it("does not treat a longer ask as the shorter field it mentions", () => {
    expect(matchAutoRiskProfileQuestion("Employment required")).toEqual({ onProfile: false });
    expect(matchAutoRiskProfileQuestion("lienholder report details")).toEqual({ onProfile: false });
    expect(matchAutoRiskProfileQuestion("Insurance score")).toEqual({ onProfile: false });
    const lienholder = matchAutoRiskProfileQuestion("Lienholder");
    expect(lienholder.onProfile).toBe(true);
  });
});

describe("auto quote-gap capture", () => {
  it("groups similar carrier wording, unions options, and bumps the count", () => {
    const store = memoryGapStore();
    const first = recordAutoQuoteGap(
      {
        question: "Employment required",
        carrierId: "1d29f707-67e5-4e64-8528-2a0f58ad92a4",
        carrierName: "Progressive",
        dealId: "12aa92aa-3b8d-4211-acf3-fda09d77a194",
        url: "https://quoting.foragentsonly.com",
        selector: "#employment",
        shopLine: "auto",
        at: SEEDED_AT,
      },
      store,
    );
    const second = recordAutoQuoteGap(
      {
        question: "employment category",
        options: ["Employed", "Self-employed"],
        carrierId: "1d29f707-67e5-4e64-8528-2a0f58ad92a4",
        carrierName: "Progressive",
        shopLine: "auto",
        at: "2026-09-12T15:00:00.000Z",
      },
      store,
    );
    const third = recordAutoQuoteGap(
      {
        question: "Employment category",
        options: ["employed", "Student"],
        carrierName: "Geico",
        carrierId: "eaf069fd-d37e-41ed-8965-3d4ddc61ddf0",
        shopLine: "auto",
        at: "2026-09-13T15:00:00.000Z",
      },
      store,
    );

    expect(first).toMatchObject({ captured: true, created: true, count: 1 });
    expect(second).toMatchObject({ captured: true, created: false, id: first.captured ? first.id : "", count: 2 });
    expect(third).toMatchObject({ captured: true, created: false, count: 3 });

    const list = readAutoQuestionGapList(store);
    expect(list.entries).toHaveLength(1);
    const row = list.entries[0]!;
    expect(row.shopLine).toBe("auto");
    expect(row.count).toBe(3);
    expect(row.canonicalQuestion).toBe("employment category");
    expect(row.phrasings.map((phrasing) => [phrasing.text, phrasing.count])).toEqual([
      ["employment category", 2],
      ["Employment required", 1],
    ]);
    expect(row.options).toEqual(["Employed", "Self-employed", "Student"]);
    expect(row.optionsNote).toBe(MIXED_OPTIONS_NOTE);
    expect(row.carriers.map((carrier) => [carrier.carrierName, carrier.count])).toEqual([
      ["Progressive", 2],
      ["Geico", 1],
    ]);
    expect(row.recentSightings[0]?.selector).toBeNull();
    expect(row.recentSightings.some((sighting) => sighting.selector === "#employment")).toBe(true);
    expect(row.recentSightings.some((sighting) => sighting.dealId === "12aa92aa-3b8d-4211-acf3-fda09d77a194")).toBe(
      true,
    );
  });

  it("skips profile fields, other shop lines, and identical resubmits as extra rows", () => {
    const store = memoryGapStore();
    expect(
      recordAutoQuoteGap({ question: "Education Level", carrierName: "Geico", shopLine: "auto" }, store),
    ).toMatchObject({ captured: false, reason: "on_profile", fieldKey: "driver_1_education_level" });
    expect(
      recordAutoQuoteGap({ question: "Year built", carrierName: "TypTap", shopLine: "home" }, store),
    ).toMatchObject({ captured: false, reason: "not_auto" });
    recordAutoQuoteGap(
      {
        question: "Good student discount",
        carrierName: "Travelers",
        shopLine: "auto",
        options: [],
        at: SEEDED_AT,
      },
      store,
    );
    recordAutoQuoteGap(
      {
        question: "Good student discount",
        carrierName: "Travelers",
        shopLine: "auto",
        at: "2026-09-12T00:00:00.000Z",
      },
      store,
    );
    const list = readAutoQuestionGapList(store);
    expect(list.entries).toHaveLength(1);
    expect(list.entries[0]?.count).toBe(2);
    expect(list.entries[0]?.optionsNote).toBe(FREE_TEXT_OPTIONS_NOTE);
    expect(list.entries[0]?.recentSightings).toHaveLength(1);
  });

  it("parses portal why and leftover clauses from quote-bot notes", () => {
    expect(questionsFromAttemptWhy(PROGRESSIVE_WHY)).toEqual(["Employment required", "employment category"]);
    expect(questionsFromAttemptWhy(DAIRYLAND_WHY)).toEqual([
      "DL number",
      "lienholder report details required",
      "insurance score not found",
    ]);
    expect(questionsFromAttemptWhy(GEICO_EDUCATION_WHY)).toEqual(["Education Level blank"]);
    expect(questionsFromAttemptWhy(GEICO_HOLD_WHY)).toEqual(["ownership_length", "commute_days_week blank"]);

    const store = memoryGapStore();
    const progressive = captureAutoGapsFromAttemptWhy(
      { why: PROGRESSIVE_WHY, shopLine: "auto", carrierName: "Progressive", at: SEEDED_AT },
      store,
    );
    const dairyland = captureAutoGapsFromAttemptWhy(
      { why: DAIRYLAND_WHY, shopLine: "auto", carrierName: "Dairyland", at: SEEDED_AT },
      store,
    );
    const education = captureAutoGapsFromAttemptWhy(
      { why: GEICO_EDUCATION_WHY, shopLine: "auto", carrierName: "Geico", at: SEEDED_AT },
      store,
    );
    const ownership = captureAutoGapsFromAttemptWhy(
      { why: GEICO_HOLD_WHY, shopLine: "auto", carrierName: "Geico", at: SEEDED_AT },
      store,
    );
    const home = captureAutoGapsFromAttemptWhy(
      { why: PROGRESSIVE_WHY, shopLine: "home", carrierName: "Progressive" },
      store,
    );

    expect(progressive.every((row) => row.captured)).toBe(true);
    expect(dairyland.map((row) => (row.captured ? "kept" : row.reason))).toEqual([
      "on_profile",
      "kept",
      "kept",
    ]);
    expect(education[0]).toMatchObject({ captured: false, reason: "on_profile" });
    expect(ownership.every((row) => !row.captured && row.reason === "on_profile")).toBe(true);
    expect(home).toEqual([]);

    const list = readAutoQuestionGapList(store);
    expect(list.entries.map((row) => row.normalizedQuestion)).toEqual([
      "employment",
      "insurance score",
      "lienholder report details",
    ]);
    expect(list.entries[0]?.count).toBe(2);
    expect(list.entries[0]?.carriers[0]?.carrierName).toBe("Progressive");
  });

  it("logs observed portal questions from a carrier pull and ignores ones the profile already has", () => {
    const store = memoryGapStore();
    const results = recordPortalObservedQuestions(
      {
        shopLine: "auto",
        carrierId: "bbb8f6b3-a170-4841-8be2-656c5e89575a",
        carrierName: "Travelers",
        dealId: "deal-1",
        questions: [
          { question: "VIN", options: null, selector: "#vin" },
          {
            question: "Are you a good student?",
            options: ["Yes", "No"],
            url: "https://example.test/auto",
            selector: "select[name=goodStudent]",
          },
        ],
      },
      store,
    );
    expect(results.map((row) => (row.captured ? row.id : row.reason))).toEqual(["on_profile", "good-student"]);
    const list = readAutoQuestionGapList(store);
    expect(list.entries).toHaveLength(1);
    expect(list.entries[0]?.options).toEqual(["Yes", "No"]);
    expect(list.entries[0]?.optionsNote).toBeNull();
    expect(list.entries[0]?.recentSightings[0]?.url).toBe("https://example.test/auto");
  });

  it("keeps the committed list aligned with seeded quote-bot comments", () => {
    const seeded = buildSeededAutoQuestionGapList();
    const committed = JSON.parse(readFileSync(AUTO_QUESTION_GAPS_RELATIVE_PATH, "utf8"));
    expect(committed).toEqual(seeded);
    expect(seeded.entries.map((row) => row.canonicalQuestion)).toEqual([
      "Employment required",
      "insurance score not found",
      "lienholder report details required",
    ]);
    expect(seeded.entries[0]?.carriers[0]).toMatchObject({
      carrierName: "Progressive",
      carrierId: "1d29f707-67e5-4e64-8528-2a0f58ad92a4",
      count: 2,
    });
    expect(seeded.entries.every((row) => row.shopLine === "auto")).toBe(true);
    expect(seeded.entries.every((row) => row.optionsNote === FREE_TEXT_OPTIONS_NOTE)).toBe(true);
  });

  it("wires carrier pull, appetite log, and portal observation to the capture list", () => {
    const quotes = readFileSync("src/app/actions/quotes.ts", "utf8");
    const quoting = readFileSync("src/app/actions/quoting.ts", "utf8");
    const portals = readFileSync("src/lib/appetite/portals.ts", "utf8");
    const progressive = readFileSync("scripts/ff-progressive-employment-hold.ts", "utf8");
    const dairyland = readFileSync("scripts/ff-dairyland-and-general.ts", "utf8");
    expect(quotes).toMatch(/captureAutoGapsFromAttemptWhy/);
    expect(quotes).toMatch(/recordPortalObservedQuestions/);
    expect(quoting).toMatch(/captureAutoGapsFromAttemptWhy/);
    expect(portals).toMatch(/observedQuestions/);
    expect(progressive).toMatch(/captureAutoGapsFromAttemptWhy/);
    expect(dairyland).toMatch(/captureAutoGapsFromAttemptWhy/);
  });
});

describe("auto question gap panel", () => {
  it("renders the seeded questions, carriers, and free-text note", () => {
    const html = renderToStaticMarkup(
      createElement(AutoQuestionGapsPanel, { list: buildSeededAutoQuestionGapList() }),
    );
    expect(html).toContain("Employment required");
    expect(html).toContain("Progressive");
    expect(html).toContain("Dairyland");
    expect(html).toContain("lienholder report details required");
    expect(html).toContain("insurance score not found");
    expect(html).toContain(FREE_TEXT_OPTIONS_NOTE);
    expect(html).toContain("data-ff-auto-question-gaps");
  });
});
