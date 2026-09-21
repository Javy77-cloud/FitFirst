/** In-force premium and the next renewal, from policies already loaded for the list. */
export function partyPolicyGlance(
  rows: Array<{ status: string; premium?: string | number | null; expirationDate?: Date | string | null }>,
  asOf: Date,
  inForce: (status: string) => boolean,
): { premium: number; nearestRenewalDays: number | null } {
  let premium = 0;
  let nearest: number | null = null;
  for (const row of rows) {
    if (!inForce(row.status)) continue;
    const amount = typeof row.premium === "string" ? Number(row.premium) : (row.premium ?? 0);
    if (Number.isFinite(amount) && amount > 0) premium += amount;
    if (!row.expirationDate) continue;
    const date = row.expirationDate instanceof Date ? row.expirationDate : new Date(row.expirationDate);
    if (Number.isNaN(date.getTime())) continue;
    const days = Math.round((date.getTime() - asOf.getTime()) / 86_400_000);
    if (days < 0) continue;
    if (nearest == null || days < nearest) nearest = days;
  }
  return { premium, nearestRenewalDays: nearest };
}
