import { describe, expect, it } from "vitest";
import {
  parseEpisodeKey,
  planEpisodeSync,
  sheetInvalidatedEpisodeKey,
  shouldInsertEpisode,
  withEpisodeKey,
} from "./episode";

describe("alert episode suppress-after-read", () => {
  it("does not re-insert after mark-as-read while the episode key is still live", () => {
    const key = sheetInvalidatedEpisodeKey("deal-rosa", "flood");
    const plan = planEpisodeSync([key], [{ id: "alert-read", key }]);
    expect(plan.insertKeys).toEqual([]);
    expect(plan.endEpisodeAlertIds).toEqual([]);
    expect(shouldInsertEpisode(key, [{ id: "alert-read", key }])).toBe(false);
  });

  it("skips insert when an unread alert already exists for the episode", () => {
    const key = sheetInvalidatedEpisodeKey("deal-1", "home");
    expect(shouldInsertEpisode(key, [{ id: "unread", key }])).toBe(false);
  });

  it("inserts once for a new episode with no prior alert", () => {
    const live = [
      sheetInvalidatedEpisodeKey("deal-1", "flood"),
      sheetInvalidatedEpisodeKey("deal-1", "home"),
    ];
    const plan = planEpisodeSync(live, [
      { id: "prior", key: sheetInvalidatedEpisodeKey("deal-1", "flood") },
    ]);
    expect(plan.insertKeys).toEqual([sheetInvalidatedEpisodeKey("deal-1", "home")]);
    expect(plan.endEpisodeAlertIds).toEqual([]);
  });

  it("ends the episode when the live key clears so a later episode can re-alert", () => {
    const still = sheetInvalidatedEpisodeKey("deal-1", "flood");
    const plan = planEpisodeSync([still], [
      { id: "keep", key: still },
      { id: "drop-read", key: sheetInvalidatedEpisodeKey("deal-1", "home") },
      { id: "drop-unread", key: sheetInvalidatedEpisodeKey("deal-2", "*") },
    ]);
    expect(plan.insertKeys).toEqual([]);
    expect(plan.endEpisodeAlertIds.sort()).toEqual(["drop-read", "drop-unread"]);
  });

  it("encodes and parses a stable episode key in the alert body", () => {
    const key = sheetInvalidatedEpisodeKey("deal-rosa", "flood");
    const body = withEpisodeKey("Sheet change cleared approve.", key);
    expect(parseEpisodeKey(body)).toBe(key);
    expect(body).toContain("Sheet change cleared approve.");
  });

  it("treats distinct deal / line pairs as separate episodes", () => {
    expect(sheetInvalidatedEpisodeKey("a", "flood")).not.toBe(
      sheetInvalidatedEpisodeKey("a", "home"),
    );
    expect(sheetInvalidatedEpisodeKey("a", null)).toBe("sheet_invalidated:a:*");
  });
});

  it("collapses duplicate rows for the same live episode key", () => {
    const key = sheetInvalidatedEpisodeKey("deal-1", "flood");
    const plan = planEpisodeSync([key], [
      { id: "keep", key },
      { id: "dupe-a", key },
      { id: "dupe-b", key },
    ]);
    expect(plan.insertKeys).toEqual([]);
    expect(plan.endEpisodeAlertIds.sort()).toEqual(["dupe-a", "dupe-b"]);
  });
