import type { ShopLine } from "@/lib/domain";

export function sheetForLine<T extends { line: string }>(
  sheets: T[],
  line: string | ShopLine,
): T | null {
  return sheets.find((sheet) => sheet.line === line) ?? null;
}
