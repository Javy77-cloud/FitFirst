export function parseNumericInput(raw: string): string {
  const n = Number(String(raw).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? String(n) : "";
}

export function formatCurrencyDisplay(raw: string): string {
  const parsed = parseNumericInput(raw);
  if (!parsed) return "";
  return Number(parsed).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPercentDisplay(raw: string): string {
  const parsed = parseNumericInput(raw);
  if (!parsed) return "";
  return String(Number(parsed));
}
