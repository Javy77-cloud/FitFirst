import { csvEscape, toCsv } from "@/lib/api/v1/csv";
import type { CsvRow } from "./types";

export { csvEscape, toCsv };

export function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const records = splitCsvRecords(text.replace(/^\uFEFF/, ""));
  if (records.length === 0) return { headers: [], rows: [] };
  const headers = records[0].map((cell) => normalizeHeader(cell));
  const rows: CsvRow[] = [];
  for (const record of records.slice(1)) {
    if (record.every((cell) => cell.trim() === "")) continue;
    const row: CsvRow = {};
    headers.forEach((header, index) => {
      if (!header) return;
      row[header] = record[index] ?? "";
    });
    rows.push(row);
  }
  return { headers, rows };
}

export function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

export function cell(row: CsvRow, ...keys: string[]): string {
  for (const key of keys) {
    const found = row[normalizeHeader(key)];
    if (found != null && String(found).trim() !== "") return String(found).trim();
  }
  return "";
}

export function normalizeEmail(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function normalizeName(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function parseBool(value: string | null | undefined, fallback = false): boolean {
  const raw = (value ?? "").trim().toLowerCase();
  if (!raw) return fallback;
  if (["1", "true", "yes", "y", "active"].includes(raw)) return true;
  if (["0", "false", "no", "n", "inactive"].includes(raw)) return false;
  return fallback;
}

export function parseIntCell(value: string | null | undefined): number | null {
  const raw = (value ?? "").replace(/[$,]/g, "").trim();
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

export function parseDate(value: string | null | undefined): Date | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function iso(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function day(value: Date | string | null | undefined): string {
  const full = iso(value);
  return full ? full.slice(0, 10) : "";
}

function splitCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let row: string[] = [];
  let cellValue = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cellValue += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cellValue += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(cellValue);
      cellValue = "";
      continue;
    }
    if (ch === "\n") {
      if (cellValue.endsWith("\r")) cellValue = cellValue.slice(0, -1);
      row.push(cellValue);
      records.push(row);
      row = [];
      cellValue = "";
      continue;
    }
    cellValue += ch;
  }
  if (cellValue.endsWith("\r")) cellValue = cellValue.slice(0, -1);
  if (inQuotes || cellValue !== "" || row.length > 0) {
    row.push(cellValue);
    records.push(row);
  }
  return records;
}

export function rowsToCsv(headers: readonly string[], rows: Array<Array<string | number | boolean | null | undefined>>): string {
  return toCsv([...headers], rows);
}

export function objectsToCsv(headers: readonly string[], rows: CsvRow[]): string {
  return rowsToCsv(
    headers,
    rows.map((row) => headers.map((header) => row[header] ?? "")),
  );
}

export function errorCsvFrom(rows: Array<{ line: number; key: string; message: string }>): string {
  return toCsv(
    ["line", "key", "error"],
    rows.map((row) => [row.line, row.key, row.message]),
  );
}
