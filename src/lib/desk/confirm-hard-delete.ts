/** Two-step confirm before any hard delete. Archive stays a single confirm. */
export function confirmHardDelete(subject: string): boolean {
  const ask = typeof globalThis.confirm === "function" ? globalThis.confirm.bind(globalThis) : null;
  if (!ask) return false;
  if (!ask(`Are you sure you want to delete ${subject}?`)) return false;
  return ask(`Delete ${subject} permanently? This cannot be undone.`);
}
