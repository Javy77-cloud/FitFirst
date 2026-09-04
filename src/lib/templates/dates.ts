import type { EmailDelayUnit } from "@/lib/domain";

export function addDelay(anchor: Date, amount: number, unit: EmailDelayUnit): Date {
  const next = new Date(anchor.getTime());
  if (unit === "months") {
    next.setMonth(next.getMonth() + amount);
    return next;
  }
  next.setDate(next.getDate() + amount);
  return next;
}

export function subtractDelay(anchor: Date, amount: number, unit: EmailDelayUnit): Date {
  const next = new Date(anchor.getTime());
  if (unit === "months") {
    next.setMonth(next.getMonth() - amount);
    return next;
  }
  next.setDate(next.getDate() - amount);
  return next;
}

/** ARCHIVE must not cancel client email jobs. They hang off won / policy dates. */
export function archiveCancelsEmailJobs(): false {
  return false;
}
