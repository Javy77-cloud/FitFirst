/**
 * In-process serial coalesce for alert sync writers. Concurrent AppShell / page
 * after() hooks otherwise race: both see empty → both insert → duplicate bells.
 *
 * Callers with different args chain: prior run finishes, then this run executes
 * so the latest snapshot wins (never drop a fuller /deals scan for a thin panel one).
 */

const inflight = new Map<string, Promise<unknown>>();

export function coalesceAsync<T>(key: string, run: () => Promise<T>): Promise<T> {
  const prev = inflight.get(key) as Promise<unknown> | undefined;
  const next = (prev ?? Promise.resolve())
    .catch(() => undefined)
    .then(() => run()) as Promise<T>;
  const tracked = next.finally(() => {
    if (inflight.get(key) === tracked) inflight.delete(key);
  });
  inflight.set(key, tracked);
  return tracked;
}

/** Test helper — clear between cases. */
export function resetCoalesceForTests() {
  inflight.clear();
}
