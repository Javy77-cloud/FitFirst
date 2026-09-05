import type { CompletenessReport } from "@/lib/completeness/report";
import { DOC_TYPE_LABELS, type DocType } from "@/lib/domain";

export type CollectDocHint = {
  docType: DocType;
  label: string;
  reason: string;
};

const HINTS: { keys: string[]; docType: DocType; reason: string }[] = [
  {
    keys: ["coverage_a", "address1", "year_built", "construction", "occupancy"],
    docType: "dec",
    reason: "Sheet still needs dec fields",
  },
  {
    keys: ["wind_mit_form", "opening_protection"],
    docType: "wind_mit",
    reason: "Wind mit fields are still open",
  },
  {
    keys: ["four_point_date"],
    docType: "four_point",
    reason: "4-point date is still open",
  },
];

/** Source-doc types still worth collecting for open Quote Sheet cells. */
export function collectDocHints(
  report: CompletenessReport | null,
  existingDocTypes: string[],
): CollectDocHint[] {
  if (!report) return [];
  const have = new Set(existingDocTypes);
  const openKeys = new Set([
    ...report.shopBlockers.map((row) => row.key),
    ...report.bindBlockers.map((row) => row.key),
  ]);
  return HINTS.filter((hint) => !have.has(hint.docType) && hint.keys.some((key) => openKeys.has(key))).map(
    (hint) => ({
      docType: hint.docType,
      label: DOC_TYPE_LABELS[hint.docType],
      reason: hint.reason,
    }),
  );
}
