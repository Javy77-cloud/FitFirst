import { describe, expect, it } from "vitest";
import {
  ADDRESS_PICK_INTENT_SUPPRESS_MS,
  shouldFetchAddressSuggestions,
  shouldHonorStreetIntent,
  shouldOpenSuggestList,
  suggestListAfterPick,
  suggestListOnStreetIntent,
} from "./suggest-list";

describe("Mapbox suggestion list open/close", () => {
  it("does not fetch or open on Deal Details load when the street is already filled", () => {
    const loaded = { enabled: true, listActive: false, query: "412 Harbor Isle Dr" };
    expect(shouldFetchAddressSuggestions(loaded)).toBe(false);
    expect(shouldOpenSuggestList({ listActive: false, suggestionCount: 4 })).toBe(false);
  });

  it("closes after a successful pick and stays closed while the street is unchanged", () => {
    const afterPick = suggestListAfterPick();
    expect(afterPick).toEqual({ open: false, listActive: false, suggestions: [] });
    expect(
      shouldFetchAddressSuggestions({
        enabled: true,
        listActive: afterPick.listActive,
        query: "412 Harbor Isle Dr",
      }),
    ).toBe(false);
    expect(
      shouldOpenSuggestList({
        listActive: afterPick.listActive,
        suggestionCount: 3,
      }),
    ).toBe(false);
  });

  it("reopens only after the user focuses/clicks or edits the street field", () => {
    const focused = suggestListOnStreetIntent(2);
    expect(focused).toEqual({ listActive: true, open: true });
    expect(
      shouldFetchAddressSuggestions({
        enabled: true,
        listActive: true,
        query: "412 Harbor Isle Dr",
      }),
    ).toBe(true);
    expect(suggestListOnStreetIntent(0)).toEqual({ listActive: true, open: false });
  });

  it("ignores the same-gesture click that lands on the street field after a pick", () => {
    const pickedAt = 1_000;
    const suppressUntil = pickedAt + ADDRESS_PICK_INTENT_SUPPRESS_MS;
    expect(shouldHonorStreetIntent(pickedAt + 10, suppressUntil)).toBe(false);
    expect(shouldHonorStreetIntent(suppressUntil, suppressUntil)).toBe(true);
  });
});
