import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import { fieldIsBlank } from "@/lib/quote-sheet/apply";
import { isLockedSheetField } from "@/lib/lifecycle/quote-sheet";
import {
  PERSONAL_DRIVER_CAP,
  readStoredDriverCount,
} from "@/lib/quote-sheet/repeatable-units";

/** Household suffixes that move onto the matching Auto driver (empty-only). */
export const HOUSEHOLD_TO_DRIVER_MOVED = [
  { from: "status", to: "household_status" },
  { from: "exclude_reason", to: "exclude_reason" },
  { from: "age_first_licensed", to: "age_first_licensed" },
  { from: "suspension_5yr", to: "suspension_5yr" },
] as const;

/** Dropped from Auto — do not move onto drivers, do not keep on household. */
export const HOUSEHOLD_DROPPED_SUFFIXES = [
  "separate_auto_policy",
  "separate_policy_status",
] as const;

const HOUSEHOLD_NAME_DOB = ["name", "dob"] as const;

export type HouseholdDriverCopyResult = {
  values: Record<string, QuoteSheetFieldValue>;
  filledKeys: string[];
  skippedKeys: string[];
};

function cellText(cell?: QuoteSheetFieldValue): string {
  return (cell?.value ?? "").trim();
}

/**
 * Old Auto sheets stored related-person facts on household_N_*.
 * Copy into driver_N_* when the destination is empty. Never invent a second
 * name/DOB field — those already live on the driver; we only seed blanks.
 * Relationship maps for driver 2+ only. Separate-policy keys are dropped.
 */
export function mapHouseholdIntoDrivers(
  existing: Record<string, QuoteSheetFieldValue>,
  sourceLabel = "household migrate",
  maxIndex = PERSONAL_DRIVER_CAP,
): HouseholdDriverCopyResult {
  const values: Record<string, QuoteSheetFieldValue> = { ...existing };
  const filledKeys: string[] = [];
  const skippedKeys: string[] = [];

  const putEmpty = (destKey: string, raw?: string | null) => {
    const value = (raw ?? "").trim();
    if (!value) return;
    const current = values[destKey];
    if (isLockedSheetField(current) || !fieldIsBlank(current)) {
      skippedKeys.push(destKey);
      return;
    }
    values[destKey] = {
      value,
      status: "check",
      source: "agent",
      sourceLabel,
    };
    filledKeys.push(destKey);
  };

  const storedCount = readStoredDriverCount(existing);
  const cap = Math.min(PERSONAL_DRIVER_CAP, maxIndex, storedCount ?? PERSONAL_DRIVER_CAP);
  for (let index = 1; index <= cap; index += 1) {
    for (const suffix of HOUSEHOLD_NAME_DOB) {
      putEmpty(`driver_${index}_${suffix}`, cellText(existing[`household_${index}_${suffix}`]));
    }
    for (const move of HOUSEHOLD_TO_DRIVER_MOVED) {
      putEmpty(
        `driver_${index}_${move.to}`,
        cellText(existing[`household_${index}_${move.from}`]),
      );
    }
    if (index >= 2) {
      putEmpty(
        `driver_${index}_relationship`,
        cellText(existing[`household_${index}_relationship`]),
      );
    }
  }

  return { values, filledKeys, skippedKeys };
}

/** Driver 1 is the named insured — never keep a relationship-to-self value. */
export function clearDriver1Relationship(
  values: Record<string, QuoteSheetFieldValue>,
): Record<string, QuoteSheetFieldValue> {
  const current = values.driver_1_relationship;
  if (!current) return values;
  if (isLockedSheetField(current) && current.status === "confirmed") {
    return {
      ...values,
      driver_1_relationship: { ...current, value: "" },
    };
  }
  return {
    ...values,
    driver_1_relationship: {
      value: "",
      status: "missing",
      source: "blank",
    },
  };
}

export function isDroppedHouseholdKey(key: string): boolean {
  return /^(household_\d+_)(separate_auto_policy|separate_policy_status)$/.test(key);
}
