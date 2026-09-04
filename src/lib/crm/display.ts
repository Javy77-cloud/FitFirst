export type PersonName = {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
};

/** Last, First Middle — skips a blank middle. */
export function formatPersonName(person: PersonName): string {
  const last = (person.lastName ?? "").trim();
  const first = (person.firstName ?? "").trim();
  const middle = (person.middleName ?? "").trim();
  const given = [first, middle].filter(Boolean).join(" ");
  if (last && given) return `${last}, ${given}`;
  return last || given || "—";
}

export type ExpirationTone = "overdue" | "urgent" | "soon" | "ok";

export function startOfUtcDay(value: Date): number {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

export function daysUntil(target: Date, from = new Date()): number {
  return Math.round((startOfUtcDay(target) - startOfUtcDay(from)) / 86_400_000);
}

export function expirationTone(days: number): ExpirationTone {
  if (days < 0) return "overdue";
  if (days <= 30) return "urgent";
  if (days <= 90) return "soon";
  return "ok";
}

export function expirationToneClass(tone: ExpirationTone): string {
  switch (tone) {
    case "overdue":
      return "bg-fit-red-bg text-fit-red";
    case "urgent":
      return "bg-fit-flag-bg text-fit-flag";
    case "soon":
      return "bg-fit-yellow-bg text-fit-yellow";
    case "ok":
      return "bg-fit-green-bg text-fit-green";
  }
}

export function formatTenure(start: Date | null | undefined, asOf = new Date()): string {
  if (!start) return "—";
  const months =
    (asOf.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (asOf.getUTCMonth() - start.getUTCMonth());
  if (months < 0) return "—";
  if (months < 1) return "New this month";
  if (months < 12) return `${months} mo`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem === 0 ? `${years} yr` : `${years} yr ${rem} mo`;
}

export function formatIsoDate(value: Date | null | undefined): string {
  if (!value) return "—";
  return value.toISOString().slice(0, 10);
}

export function entityHref(entityType?: string | null, entityId?: string | null): string | null {
  if (!entityType || !entityId) return null;
  switch (entityType) {
    case "deal":
      return `/deals/${entityId}`;
    case "contact":
    case "business":
      return `/contacts/${entityId}`;
    case "policy":
      return `/policies/${entityId}`;
    case "lead":
      return `/leads/${entityId}`;
    case "activity":
      return `/calendar?event=${entityId}`;
    default:
      return null;
  }
}

export function taskKindLabel(kind: string): string {
  switch (kind) {
    case "30_day":
      return "30-day";
    case "60_day":
      return "60-day";
    case "90_day":
      return "90-day";
    case "expiration":
      return "Expiration";
    default:
      return kind.replaceAll("_", " ");
  }
}
