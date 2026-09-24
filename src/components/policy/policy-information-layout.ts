/**
 * Policy Information grid order.
 *
 * The wide card is `lg:grid-cols-4` (two columns from `sm`). Cells flow in
 * this order, so "under" means four slots later on the wide grid.
 *
 * Default order is the #390 card without the empty owner-mailing placeholder.
 * That placeholder pushed every following field one column right on policies
 * that do not show "Mailing address (owner)". A real mailing cell still
 * occupies that slot on DP lines. Billing stays under Producer and Premium
 * under Effective date on both shapes, without a spacer.
 */

/** Javeth Fernando Valencia — Supplemental Health, line HEALTH. */
export const POLICY_INFO_TRIAL_POLICY_ID = "9c426007-11e0-4b1c-857f-0696389b83f5";

/**
 * Trial layout pending owner approval before global rollout.
 * Keyed by policy id so this one record can be promoted or removed on its own.
 */
export const POLICY_INFORMATION_LAYOUT_OVERRIDES = {
  [POLICY_INFO_TRIAL_POLICY_ID]: "trial",
} as const satisfies Readonly<Record<string, "trial">>;

export type PolicyInfoLayoutName = "default" | "trial";

export type PolicyInfoSlot =
  | "insured"
  | "carrier"
  | "policyNumber"
  | "subType"
  | "premises"
  | "mailing"
  | "insuranceType"
  | "sellingAgency"
  | "producer"
  | "effective"
  | "expiration"
  | "renewal"
  | "billing"
  | "premium"
  | "commission"
  | "termOverride";

export const POLICY_INFO_WIDE_COLUMNS = 4;

export function policyInformationLayoutName(policyId: string): PolicyInfoLayoutName {
  if (policyId in POLICY_INFORMATION_LAYOUT_OVERRIDES) return "trial";
  return "default";
}

/**
 * Trial stacking (wide grid, no owner mailing):
 * Insurance type under Carrier, Selling agency under Policy number,
 * Producer under Subtype, then Effective / Expiration / Renewal flush left.
 * Billing stays under Producer and Premium under Effective date.
 * A real mailing value, if one were present, is appended after Commission
 * so it cannot open a gap in front of the dates.
 */
export function policyInformationSlotOrder(
  layout: PolicyInfoLayoutName,
  options: { includeMailing: boolean },
): PolicyInfoSlot[] {
  if (layout === "trial") {
    const slots: PolicyInfoSlot[] = [
      "insured",
      "carrier",
      "policyNumber",
      "subType",
      "premises",
      "insuranceType",
      "sellingAgency",
      "producer",
      "effective",
      "expiration",
      "renewal",
      "billing",
      "premium",
      "commission",
    ];
    if (options.includeMailing) slots.push("mailing");
    slots.push("termOverride");
    return slots;
  }

  const slots: PolicyInfoSlot[] = [
    "insured",
    "carrier",
    "policyNumber",
    "subType",
    "premises",
  ];
  if (options.includeMailing) slots.push("mailing");
  slots.push(
    "insuranceType",
    "sellingAgency",
    "producer",
    "effective",
    "expiration",
    "renewal",
    "billing",
    "premium",
    "commission",
    "termOverride",
  );
  return slots;
}

/** Wide-grid rows. The term-date control spans the full row, so it sits alone. */
export function policyInformationWideRows(
  layout: PolicyInfoLayoutName,
  options: { includeMailing: boolean },
): PolicyInfoSlot[][] {
  const rows: PolicyInfoSlot[][] = [];
  let current: PolicyInfoSlot[] = [];
  for (const slot of policyInformationSlotOrder(layout, options)) {
    if (slot === "termOverride") {
      if (current.length) rows.push(current);
      current = [];
      rows.push([slot]);
      continue;
    }
    current.push(slot);
    if (current.length === POLICY_INFO_WIDE_COLUMNS) {
      rows.push(current);
      current = [];
    }
  }
  if (current.length) rows.push(current);
  return rows;
}
