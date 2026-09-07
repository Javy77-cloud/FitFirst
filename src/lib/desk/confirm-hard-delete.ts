/** One confirm before any hard delete. Exactly one “Are you sure you want to delete?” per trash click (Javy rule). Archive stays a single confirm. */
export function confirmHardDelete(subject: string): boolean {
  const ask = typeof globalThis.confirm === "function" ? globalThis.confirm.bind(globalThis) : null;
  if (!ask) return false;
  return ask(`Are you sure you want to delete ${subject}?`);
}

/** Same one-dialog confirm as confirmHardDelete. */
export function confirmDeleteOnce(subject: string): boolean {
  return confirmHardDelete(subject);
}
