export function csvEscape(value: string | number | boolean | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

export function toCsv(
  headers: string[],
  rows: Array<Array<string | number | boolean | null | undefined>>,
): string {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(","));
  }
  return `${lines.join("\r\n")}\r\n`;
}

export function csvFilename(kind: string, at = new Date()): string {
  const day = at.toISOString().slice(0, 10);
  return `fitfirst-${kind}-${day}.csv`;
}
