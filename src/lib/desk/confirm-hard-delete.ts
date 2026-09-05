/** Two-step confirm before any hard delete. Archive stays a single confirm. */
export function confirmHardDelete(subject: string): boolean {
  if (typeof window === "undefined") return false;
  if (!window.confirm(`Are you sure you want to delete ${subject}?`)) return false;
  return window.confirm(`Delete ${subject} permanently? This cannot be undone.`);
}
