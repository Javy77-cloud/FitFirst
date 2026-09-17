/**
 * Mapbox suggestion panel rules.
 * Load must not auto-open. A successful pick must close and stay closed
 * until the user focuses/clicks the street field or edits the street text.
 */

export type AddressSuggestListState = {
  open: boolean;
  listActive: boolean;
};

export function shouldFetchAddressSuggestions(input: {
  enabled: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  listActive: boolean;
  query: string;
}): boolean {
  if (!input.enabled || input.readOnly || input.disabled || !input.listActive) return false;
  return input.query.trim().length >= 3;
}

export function shouldOpenSuggestList(input: {
  listActive: boolean;
  suggestionCount: number;
}): boolean {
  return input.listActive && input.suggestionCount > 0;
}

/** Apply after the agent/user picks a suggestion — hide until a new street intent. */
export function suggestListAfterPick(): AddressSuggestListState & { suggestions: [] } {
  return { open: false, listActive: false, suggestions: [] };
}

/** Focus, click, or street-text edit is an intentional reopen. */
export function suggestListOnStreetIntent(suggestionCount = 0): AddressSuggestListState {
  return {
    listActive: true,
    open: suggestionCount > 0,
  };
}

/** Ignore the click that falls through onto the street field after a pick. */
export const ADDRESS_PICK_INTENT_SUPPRESS_MS = 400;

export function shouldHonorStreetIntent(now: number, suppressUntil: number): boolean {
  return now >= suppressUntil;
}
