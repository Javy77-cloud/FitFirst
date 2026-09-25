import type { QuoteFieldDef } from "./applicant-core";

export const QUOTE_EFFECTIVE_DATE_KEY = "quote_effective_date";
export const QUOTE_EFFECTIVE_DATE_LABEL = "Quote effective date";
export const CURRENT_POLICY_EFFECTIVE_LABEL = "Current policy effective date";
export const CURRENT_POLICY_EXPIRATION_LABEL = "Current policy expiration date";
export const YEARS_WITH_CARRIER_KEY = "years_with_carrier";
export const YEARS_WITH_CARRIER_LABEL = "Years with carrier";

/**
 * New-business submission date plus the in-force term.
 * Home and Auto already store the in-force term on effective_date / expiration_date
 * (DEC extract keys stay on those keys). Flood already stores the new-business date
 * on effective_date, so that line passes a different quote key.
 * No extractKey on the quote date — a DEC effective date is the in-force term.
 */
export function currentPolicyDateFields(opts: {
  group: string;
  /** Omit DEC extract keys when this line has no declaration map for the term. */
  dec?: boolean;
  quoteKey?: string;
  currentEffectiveKey?: string;
}): QuoteFieldDef[] {
  const dec = opts.dec !== false;
  const quoteKey = opts.quoteKey ?? QUOTE_EFFECTIVE_DATE_KEY;
  const currentEffectiveKey = opts.currentEffectiveKey ?? "effective_date";
  return [
    { key: quoteKey, label: QUOTE_EFFECTIVE_DATE_LABEL, group: opts.group },
    {
      key: currentEffectiveKey,
      label: CURRENT_POLICY_EFFECTIVE_LABEL,
      group: opts.group,
      ...(dec && currentEffectiveKey === "effective_date" ? { extractKey: "effective_date" } : {}),
    },
    {
      key: "expiration_date",
      label: CURRENT_POLICY_EXPIRATION_LABEL,
      group: opts.group,
      ...(dec ? { extractKey: "expiration_date" } : {}),
    },
  ];
}

/** Same label and number input Home and Auto already use. */
export function yearsWithCarrierField(group: string): QuoteFieldDef {
  return {
    key: YEARS_WITH_CARRIER_KEY,
    label: YEARS_WITH_CARRIER_LABEL,
    group,
    input: "number",
  };
}
