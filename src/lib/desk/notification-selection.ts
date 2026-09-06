/** Notification list checkboxes are selection only — never inferred from open / mark-as-read. */

export function emptyNotificationSelection(): string[] {
  return [];
}

export function toggleNotificationSelection(selected: readonly string[], id: string): string[] {
  return selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id];
}

export function selectAllNotifications(ids: readonly string[], on: boolean): string[] {
  return on ? [...ids] : [];
}

export function selectedNotificationIds(selected: readonly string[], ids: readonly string[]): string[] {
  const allowed = new Set(ids);
  return selected.filter((id) => allowed.has(id));
}

export function canRunNotificationBulk(selected: readonly string[]): boolean {
  return selected.length > 0;
}
