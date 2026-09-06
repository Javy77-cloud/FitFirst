/** Two-step confirm before any hard delete. Same question twice (Javy rule). Archive stays a single confirm. */
export function confirmHardDelete(subject: string): boolean {
  const ask = typeof globalThis.confirm === "function" ? globalThis.confirm.bind(globalThis) : null;
  if (!ask) return false;
  const message = `Are you sure you want to delete ${subject}?`;
  if (!ask(message)) return false;
  return ask(message);
}
