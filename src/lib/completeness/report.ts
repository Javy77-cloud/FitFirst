import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import type { ShopLine } from "@/lib/domain";
import { fieldsForLine } from "@/lib/quote-sheet/catalog";
import { bindKeysForLine, fieldLabel, shopKeysForLine } from "./fields";

export type CompletenessStatus = "missing" | "check" | "confirmed";

export type CompletenessBlocker = {
  key: string;
  label: string;
  status: CompletenessStatus;
  blocks: "shop" | "bind";
};

export type CompletenessReport = {
  line: ShopLine;
  total: number;
  confirmed: number;
  check: number;
  missing: number;
  /** Confirmed / total for the strip width. Count ratio — not a probability. */
  confirmedShare: number;
  shopReady: boolean;
  bindReady: boolean;
  shopBlockers: CompletenessBlocker[];
  bindBlockers: CompletenessBlocker[];
};

export function cellStatus(cell: QuoteSheetFieldValue | undefined): CompletenessStatus {
  if (!cell) return "missing";
  if (cell.status === "check") return "check";
  if (cell.status === "confirmed" && cell.value.trim() !== "") return "confirmed";
  if (cell.value.trim() === "" || cell.status === "missing") return "missing";
  return "confirmed";
}

export function reportFromSheet(
  line: ShopLine,
  values: Record<string, QuoteSheetFieldValue>,
): CompletenessReport {
  const fields = fieldsForLine(line);
  let confirmed = 0;
  let check = 0;
  let missing = 0;
  for (const field of fields) {
    const status = cellStatus(values[field.key]);
    if (status === "confirmed") confirmed += 1;
    else if (status === "check") check += 1;
    else missing += 1;
  }

  const shopBlockers: CompletenessBlocker[] = [];
  for (const key of shopKeysForLine(line)) {
    const status = cellStatus(values[key]);
    if (status !== "confirmed") {
      shopBlockers.push({ key, label: fieldLabel(line, key), status, blocks: "shop" });
    }
  }

  const bindBlockers: CompletenessBlocker[] = [];
  for (const key of bindKeysForLine(line)) {
    const status = cellStatus(values[key]);
    if (status !== "confirmed") {
      bindBlockers.push({
        key,
        label: fieldLabel(line, key),
        status,
        blocks: shopBlockers.some((row) => row.key === key) ? "shop" : "bind",
      });
    }
  }

  const total = fields.length || 1;
  return {
    line,
    total: fields.length,
    confirmed,
    check,
    missing,
    confirmedShare: confirmed / total,
    shopReady: shopBlockers.length === 0,
    bindReady: bindBlockers.length === 0,
    shopBlockers,
    bindBlockers,
  };
}

export function healthierThan(a: CompletenessReport, b: CompletenessReport): boolean {
  if (a.confirmed !== b.confirmed) return a.confirmed > b.confirmed;
  if (a.check !== b.check) return a.check < b.check;
  return a.missing < b.missing;
}
