export type ContactHealth = "green" | "yellow" | "red";

export function contactHealthScore(input: {
  policyCount: number;
  lastActivityAt?: Date | string | null;
  now?: Date;
}): { level: ContactHealth; tip: string } {
  const now = input.now ?? new Date();
  const raw = input.lastActivityAt ? new Date(input.lastActivityAt).getTime() : null;
  const days =
    raw && Number.isFinite(raw) ? Math.floor((now.getTime() - raw) / (24 * 60 * 60 * 1000)) : null;
  const policies = input.policyCount ?? 0;

  if (days != null && days <= 30) {
    return { level: "green", tip: "Active — activity in the last 30 days." };
  }
  if (policies > 0) {
    return {
      level: "yellow",
      tip: "Has policies but no recent contact (no activity in the last 30 days).",
    };
  }
  if (days == null || days >= 90) {
    return {
      level: "red",
      tip: "No policies and no activity in the last 90 days.",
    };
  }
  return {
    level: "yellow",
    tip: "No policies; last activity was more than 30 days ago.",
  };
}
