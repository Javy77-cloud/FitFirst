export function commissionAmount(premium: number, ratePct: number): number {
  if (!Number.isFinite(premium) || !Number.isFinite(ratePct)) return 0;
  return Math.round(premium * (ratePct / 100) * 100) / 100;
}

export function toNumber(value: number | string | null | undefined): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : 0;
}

export function periodKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
