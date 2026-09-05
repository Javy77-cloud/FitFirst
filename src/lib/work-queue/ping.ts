/** In-app work pings must land on a desk user. Agency-wide rows hide from agents. */
export function pingTargets(input: {
  assigneeId?: string | null;
  actorId?: string | null;
}): { userId: string | null; recipientUserId: string | null } {
  const target = input.assigneeId || input.actorId || null;
  return {
    userId: target,
    recipientUserId: target,
  };
}

export function pingIsAddressed(alert: {
  userId?: string | null;
  recipientUserId?: string | null;
}): boolean {
  return Boolean(alert.userId || alert.recipientUserId);
}
